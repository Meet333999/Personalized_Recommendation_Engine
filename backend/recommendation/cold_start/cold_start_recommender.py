"""
Cold-Start Recommendation and Hybrid Fallback Engine.
Handles unobserved users, new catalog items, and cold-start onboarding preferences
using Bayesian popularity smoothing, content similarity, and hybrid blending.
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import numpy as np
import pandas as pd

from backend.config.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class ColdStartRecommender:
    """Provides high-quality cold-start recommendations for new users and unrated items."""

    def __init__(self):
        self.items_df: Optional[pd.DataFrame] = None
        self._load_metadata()

    def _load_metadata(self) -> None:
        """Load item features and precompute popularity and category indices."""
        items_path = settings.DATA_FEATURES_DIR / "item_features.parquet"
        if not items_path.exists():
            items_path = settings.DATA_PROCESSED_DIR / "items.parquet"

        if items_path.exists():
            self.items_df = pd.read_parquet(items_path)
            # Ensure popularity score and Bayesian smoothed rating exist
            # WR = (v / (v + m)) * R + (m / (v + m)) * C
            c = float(self.items_df["item_avg_rating"].mean()) if "item_avg_rating" in self.items_df.columns else 3.0
            m = 10.0  # minimum ratings threshold
            v = self.items_df["item_interaction_count"].fillna(0).astype(float) if "item_interaction_count" in self.items_df.columns else pd.Series(0, index=self.items_df.index)
            r = self.items_df["item_avg_rating"].fillna(c).astype(float) if "item_avg_rating" in self.items_df.columns else pd.Series(c, index=self.items_df.index)

            self.items_df["bayesian_score"] = (v / (v + m)) * r + (m / (v + m)) * c
            self.items_df["cold_start_rank_score"] = (
                0.7 * (self.items_df["bayesian_score"] / 5.0) +
                0.3 * self.items_df["item_popularity_score"].fillna(0.0)
            )
            logger.info("Cold-start engine loaded %d items from catalog.", len(self.items_df))
        else:
            logger.warning("Items catalog not found at %s. Cold-start engine waiting for preprocessing.", items_path)

    def recommend_for_new_user(
        self,
        preferred_categories: Optional[List[str]] = None,
        top_n: int = 10,
        exclude_item_ids: Optional[Set[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Recommend globally popular or category-focused items for new users."""
        if self.items_df is None:
            self._load_metadata()
        if self.items_df is None or self.items_df.empty:
            return []

        df = self.items_df.copy()
        exclude = set(exclude_item_ids or [])
        if exclude:
            df = df[~df["item_id"].isin(exclude)]

        # Filter or boost by preferred categories if provided
        if preferred_categories:
            pref_set = set(c.lower() for c in preferred_categories)
            # Match primary category or category list
            def has_category(row):
                prim = str(row.get("primary_category", "")).lower()
                cat_str = str(row.get("categories_str", "")).lower()
                return prim in pref_set or any(c in cat_str for c in pref_set)

            cat_mask = df.apply(has_category, axis=1)
            cat_df = df[cat_mask]

            if len(cat_df) >= top_n:
                df = cat_df
            else:
                # Prioritize category matches, then backfill with global popularity
                df["pref_boost"] = cat_mask.astype(float) * 0.5
                df["cold_start_rank_score"] = df["cold_start_rank_score"] + df["pref_boost"]

        # Sort by composite cold-start score
        top_items = df.sort_values(by="cold_start_rank_score", ascending=False).head(top_n)

        recommendations = []
        for rank, (_, row) in enumerate(top_items.iterrows(), start=1):
            category = str(row.get("primary_category", "Unknown"))
            reason = f"Top {category} recommendation" if preferred_categories else "Global popularity pick"
            recommendations.append({
                "item_id": str(row["item_id"]),
                "title": str(row.get("title", f"Item {row['item_id']}")),
                "primary_category": category,
                "categories": row.get("categories_str", category).split("|"),
                "release_year": int(row.get("release_year", 2000)),
                "average_rating": round(float(row.get("item_avg_rating", 3.0)), 2),
                "interaction_count": int(row.get("item_interaction_count", 0)),
                "popularity_score": round(float(row.get("item_popularity_score", 0.0)), 3),
                "ranking_score": round(float(row["cold_start_rank_score"]), 4),
                "retrieval_score": round(float(row.get("item_popularity_score", 0.5)), 4),
                "strategy": "cold_start",
                "reason": reason,
                "rank": rank,
            })

        return recommendations

    def hybrid_fallback(
        self,
        user_id: str,
        retrieved_candidates: List[Dict[str, Any]],
        preferred_category: Optional[str] = None,
        top_n: int = 10,
    ) -> List[Dict[str, Any]]:
        """Blend retrieved candidates with high-confidence popular/category picks."""
        if len(retrieved_candidates) >= top_n:
            return retrieved_candidates[:top_n]

        seen_ids = set(c["item_id"] for c in retrieved_candidates)
        needed = top_n - len(retrieved_candidates)

        pref_cats = [preferred_category] if preferred_category else None
        cold_start_items = self.recommend_for_new_user(
            preferred_categories=pref_cats,
            top_n=needed,
            exclude_item_ids=seen_ids,
        )

        blended = list(retrieved_candidates) + cold_start_items
        for idx, item in enumerate(blended, start=1):
            item["rank"] = idx
        return blended


# Global singleton
cold_start_recommender = ColdStartRecommender()
