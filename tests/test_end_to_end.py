"""
Mandatory End-to-End Test for the Recommendation Pipeline.
Verifies the complete sequential chain:
User ID → User Embedding → FAISS Retrieval → Candidate Features → Ranking Model → Final Recommendations.
"""
import pytest
import numpy as np
import pandas as pd
from backend.config.config import settings
from backend.serving.triton_client import serving_client
from backend.vector_search.faiss_index import faiss_manager
from backend.recommendation.pipeline import recommendation_pipeline


def test_mandatory_end_to_end_recommendation_flow():
    """Verify complete sequential execution:
    1. User ID selection
    2. User embedding generation
    3. FAISS candidate retrieval
    4. Candidate feature enrichment
    5. Deep Ranking Model scoring (DCN)
    6. Ranked top-N output
    """
    user_id = "1"
    top_k_candidates = 20
    final_n = 5

    # 1. User ID & Profile Lookup
    users_df = pd.read_parquet(settings.DATA_FEATURES_DIR / "user_features.parquet").set_index("user_id")
    assert user_id in users_df.index, f"User {user_id} must exist in feature store."
    user_row = users_df.loc[user_id]

    user_dict = {
        "user_id": user_id,
        "user_top_category": str(user_row.get("user_top_category", "Unknown")),
        "user_interaction_count": float(user_row.get("user_interaction_count", 10.0)),
        "user_avg_rating": float(user_row.get("user_avg_rating", 3.0)),
    }

    # 2. User Embedding Generation (User Tower)
    user_embedding = serving_client.get_user_embedding(user_dict)
    assert isinstance(user_embedding, np.ndarray), "User embedding must be a numpy array."
    assert user_embedding.shape == (settings.EMBEDDING_DIM,), f"Expected shape ({settings.EMBEDDING_DIM},), got {user_embedding.shape}"
    norm = np.linalg.norm(user_embedding)
    assert np.isclose(norm, 1.0, atol=1e-3), "User embedding must be L2-normalized."

    # 3. FAISS Candidate Retrieval
    cand_ids, cand_scores = faiss_manager.search(user_embedding, top_k=top_k_candidates)
    assert len(cand_ids) == top_k_candidates, "FAISS must return top_k candidates."
    assert len(cand_scores) == top_k_candidates, "FAISS must return cosine similarity scores."
    # Scores should be in descending order
    assert cand_scores == sorted(cand_scores, reverse=True), "FAISS distances must be sorted descending."

    # 4. Candidate Feature Enrichment
    items_df = pd.read_parquet(settings.DATA_FEATURES_DIR / "item_features.parquet").set_index("item_id")
    candidate_rows = []
    for cid, ret_score in zip(cand_ids, cand_scores):
        if cid in items_df.index:
            i_row = items_df.loc[cid]
            candidate_rows.append({
                "user_id": user_id,
                "item_id": cid,
                "user_top_category": user_dict["user_top_category"],
                "primary_category": str(i_row.get("primary_category", "Unknown")),
                "user_interaction_count": user_dict["user_interaction_count"],
                "user_avg_rating": user_dict["user_avg_rating"],
                "item_popularity_score": float(i_row.get("item_popularity_score", 0.0)),
                "item_avg_rating": float(i_row.get("item_avg_rating", 3.0)),
                "category_affinity": 1.0 if user_dict["user_top_category"] == str(i_row.get("primary_category")) else 0.0,
                "retrieval_score": float(ret_score),
            })

    cand_features_df = pd.DataFrame(candidate_rows)
    assert len(cand_features_df) > 0, "Candidate feature DataFrame must not be empty."

    # 5. Deep Ranking Model Scoring (DCN-v2)
    ranking_scores = serving_client.score_candidates(cand_features_df, model_type="dcn")
    assert len(ranking_scores) == len(cand_features_df), "Ranking model must output a score for each candidate."
    assert all(0.0 <= s <= 1.0 for s in ranking_scores), "Ranking scores must be valid calibrated probabilities in [0, 1]."

    # 6. Pipeline Coordinator Verification
    pipeline_result = recommendation_pipeline.recommend(
        user_id=user_id,
        limit=final_n,
        ranking_model_type="dcn",
        exclude_watched=False,
    )
    assert pipeline_result["user_id"] == user_id
    assert len(pipeline_result["recommendations"]) == final_n
    assert pipeline_result["retrieval_stage"]["retrieved_count"] > 0
    assert pipeline_result["ranking_stage"]["ranked_count"] > 0

    recs = pipeline_result["recommendations"]
    assert recs[0]["ranking_score"] >= recs[-1]["ranking_score"], "Final recommendations must be sorted by ranking score."
    print("Mandatory End-to-End Test PASSED with flying colors!")
