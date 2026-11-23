"""
End-to-End Two-Stage Recommendation Pipeline.
Sequentially connects:
1. User Profiling & Cache Check
2. Stage 1: Two-Tower Candidate Retrieval (FAISS Vector Search)
3. Candidate Filtering & Feature Enrichment
4. Stage 2: Deep Ranking (DCN-v2 or Wide & Deep)
5. Cold-Start / Hybrid Blending Fallback
6. Redis Response Caching
"""
import time
import logging
from typing import Dict, Any, List, Optional, Set
import numpy as np
import pandas as pd

from backend.config.config import settings
from backend.vector_search.faiss_index import faiss_manager
from backend.serving.triton_client import serving_client
from backend.recommendation.cold_start.cold_start_recommender import cold_start_recommender
from backend.caching.redis_cache import cache_service
from backend.features.fetch_movie_posters import load_movie_posters

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class RecommendationPipeline:
    """Production Two-Stage Recommendation Engine coordinator."""

    def __init__(self):
        self.user_features_df: Optional[pd.DataFrame] = None
        self.item_features_df: Optional[pd.DataFrame] = None
        self.user_history_map: Dict[str, Set[str]] = {}
        self.posters_map: Dict[str, str] = load_movie_posters()
        self._load_feature_tables()

    def _load_feature_tables(self) -> None:
        """Load user and item feature tables and user history for filtering."""
        feat_dir = settings.DATA_FEATURES_DIR
        user_p = feat_dir / "user_features.parquet"
        item_p = feat_dir / "item_features.parquet"
        train_p = feat_dir / "train_features.parquet"

        if user_p.exists():
            self.user_features_df = pd.read_parquet(user_p).set_index("user_id")
            logger.info("Pipeline loaded %d user profiles.", len(self.user_features_df))

        if item_p.exists():
            self.item_features_df = pd.read_parquet(item_p).set_index("item_id")
            logger.info("Pipeline loaded %d item catalog records.", len(self.item_features_df))

        if train_p.exists():
            train_df = pd.read_parquet(train_p)
            self.user_history_map = (
                train_df.groupby("user_id")["item_id"].apply(lambda s: set(s.astype(str))).to_dict()
            )
            logger.info("Pipeline indexed interaction histories for %d users.", len(self.user_history_map))

    def recommend(
        self,
        user_id: str,
        limit: int = 10,
        category: Optional[str] = None,
        exclude_watched: bool = True,
        ranking_model_type: str = "dcn",
    ) -> Dict[str, Any]:
        """Execute end-to-end two-stage personalized recommendation flow."""
        start_time = time.time()
        user_id_str = str(user_id)

        # 1. Check Redis Cache
        cached_result = cache_service.get_recommendations(
            user_id=user_id_str,
            limit=limit,
            category=category,
            exclude_watched=exclude_watched,
        )
        if cached_result is not None:
            total_duration = round((time.time() - start_time) * 1000, 2)
            return {
                "user_id": user_id_str,
                "strategy": "two_stage_cached",
                "cached": True,
                "total_processing_ms": total_duration,
                "retrieval_stage": {"retrieved_count": len(cached_result), "latency_ms": 0.0},
                "ranking_stage": {"ranked_count": len(cached_result), "model": ranking_model_type, "latency_ms": 0.0},
                "recommendations": cached_result,
            }

        # Ensure feature tables are loaded
        if self.user_features_df is None or self.item_features_df is None:
            self._load_feature_tables()

        # 2. Check Cold Start Condition
        is_known_user = self.user_features_df is not None and user_id_str in self.user_features_df.index

        if not is_known_user:
            # Handle new unobserved user with Cold-Start Strategy
            logger.info("User '%s' is a new or cold-start user. Invoking ColdStartRecommender.", user_id_str)
            pref_cats = [category] if category else None
            cold_recs = cold_start_recommender.recommend_for_new_user(
                preferred_categories=pref_cats,
                top_n=limit,
            )
            total_duration = round((time.time() - start_time) * 1000, 2)
            result = {
                "user_id": user_id_str,
                "strategy": "cold_start_popularity",
                "cached": False,
                "total_processing_ms": total_duration,
                "retrieval_stage": {"retrieved_count": len(cold_recs), "latency_ms": total_duration},
                "ranking_stage": {"ranked_count": len(cold_recs), "model": "bayesian_popularity", "latency_ms": 0.0},
                "recommendations": cold_recs,
            }
            cache_service.set_recommendations(
                user_id=user_id_str,
                limit=limit,
                recommendations=cold_recs,
                category=category,
                exclude_watched=exclude_watched,
            )
            return result

        user_row = self.user_features_df.loc[user_id_str]
        user_dict = {
            "user_id": user_id_str,
            "user_top_category": str(user_row.get("user_top_category", "Unknown")),
            "user_interaction_count": float(user_row.get("user_interaction_count", 10.0)),
            "user_avg_rating": float(user_row.get("user_avg_rating", 3.0)),
        }

        # 3. Stage 1: Candidate Retrieval (Two-Tower + FAISS)
        t_ret_start = time.time()
        # Retrieve user vector
        user_embedding = cache_service.get_user_embedding(user_id_str)
        if user_embedding is None:
            user_embedding = serving_client.get_user_embedding(user_dict).tolist()
            cache_service.set_user_embedding(user_id_str, user_embedding)

        user_vec = np.array(user_embedding, dtype=np.float32)

        # FAISS top-K query
        try:
            cand_ids, cand_scores = faiss_manager.search(user_vec, top_k=settings.TOP_K_CANDIDATES)
        except Exception as e:
            logger.error("FAISS candidate retrieval failed: %s. Using cold-start fallback.", e)
            cand_ids, cand_scores = [], []

        retrieval_duration_ms = round((time.time() - t_ret_start) * 1000, 2)

        # 4. Filter Candidates (Watched history & Category)
        watched_set = self.user_history_map.get(user_id_str, set()) if exclude_watched else set()
        filtered_candidates = []

        for cid, score in zip(cand_ids, cand_scores):
            if cid in watched_set:
                continue
            if self.item_features_df is not None and cid in self.item_features_df.index:
                item_row = self.item_features_df.loc[cid]
                prim_cat = str(item_row.get("primary_category", "Unknown"))
                cat_str = str(item_row.get("categories_str", prim_cat))
                if category and category.lower() != "all":
                    if category.lower() not in prim_cat.lower() and category.lower() not in cat_str.lower():
                        continue
                filtered_candidates.append((cid, float(score), item_row))

        # 5. Stage 2: Deep Ranking (DCN-v2 or Wide & Deep)
        t_rank_start = time.time()
        ranked_items = []

        if filtered_candidates:
            # Construct candidate feature DataFrame for batch scoring
            candidate_rows = []
            for cid, ret_score, i_row in filtered_candidates:
                candidate_rows.append({
                    "user_id": user_id_str,
                    "item_id": cid,
                    "user_top_category": user_dict["user_top_category"],
                    "primary_category": str(i_row.get("primary_category", "Unknown")),
                    "user_interaction_count": user_dict["user_interaction_count"],
                    "user_avg_rating": user_dict["user_avg_rating"],
                    "item_popularity_score": float(i_row.get("item_popularity_score", 0.0)),
                    "item_avg_rating": float(i_row.get("item_avg_rating", 3.0)),
                    "category_affinity": 1.0 if user_dict["user_top_category"] == str(i_row.get("primary_category")) else 0.0,
                    "retrieval_score": ret_score,
                })

            cand_df = pd.DataFrame(candidate_rows)
            # Run Deep Ranking Inference
            ranking_scores = serving_client.score_candidates(cand_df, model_type=ranking_model_type)

            for idx, ((cid, ret_score, i_row), rank_score) in enumerate(zip(filtered_candidates, ranking_scores)):
                prim_cat = str(i_row.get("primary_category", "Unknown"))
                cat_list = str(i_row.get("categories_str", prim_cat)).split("|")
                ranked_items.append({
                    "item_id": cid,
                    "title": str(i_row.get("title", f"Item {cid}")),
                    "primary_category": prim_cat,
                    "categories": cat_list,
                    "release_year": int(i_row.get("release_year", 2000)),
                    "average_rating": round(float(i_row.get("item_avg_rating", 3.0)), 2),
                    "interaction_count": int(i_row.get("item_interaction_count", 0)),
                    "popularity_score": round(float(i_row.get("item_popularity_score", 0.0)), 3),
                    "retrieval_score": round(float(ret_score), 4),
                    "ranking_score": round(float(rank_score), 4),
                    "strategy": f"two_stage_{ranking_model_type}",
                    "poster_url": self.posters_map.get(str(cid)),
                })

            # Sort descending by deep ranking score
            ranked_items.sort(key=lambda x: x["ranking_score"], reverse=True)

        ranking_duration_ms = round((time.time() - t_rank_start) * 1000, 2)

        # 6. Fallback Safeguard (Hybrid blending if needed)
        final_recommendations = ranked_items[:limit]
        if len(final_recommendations) < limit:
            final_recommendations = cold_start_recommender.hybrid_fallback(
                user_id=user_id_str,
                retrieved_candidates=final_recommendations,
                preferred_category=category,
                top_n=limit,
            )

        for rank_num, rec in enumerate(final_recommendations, start=1):
            rec["rank"] = rank_num
            if "poster_url" not in rec or not rec["poster_url"]:
                rec["poster_url"] = self.posters_map.get(str(rec.get("item_id")))

        total_duration = round((time.time() - start_time) * 1000, 2)

        # 7. Persist to Redis Cache
        cache_service.set_recommendations(
            user_id=user_id_str,
            limit=limit,
            recommendations=final_recommendations,
            category=category,
            exclude_watched=exclude_watched,
        )

        return {
            "user_id": user_id_str,
            "strategy": f"two_stage_{ranking_model_type}",
            "cached": False,
            "total_processing_ms": total_duration,
            "retrieval_stage": {
                "retrieved_count": len(cand_ids),
                "filtered_count": len(filtered_candidates),
                "latency_ms": retrieval_duration_ms,
            },
            "ranking_stage": {
                "ranked_count": len(ranked_items),
                "model": ranking_model_type,
                "latency_ms": ranking_duration_ms,
            },
            "recommendations": final_recommendations,
        }


# Global singleton pipeline
recommendation_pipeline = RecommendationPipeline()
