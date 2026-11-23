"""
Tests for Cold-Start Recommender and Hybrid Blending.
"""
import pytest
from backend.recommendation.cold_start.cold_start_recommender import ColdStartRecommender


def test_cold_start_new_user():
    cs = ColdStartRecommender()
    recs = cs.recommend_for_new_user(preferred_categories=None, top_n=5)
    assert len(recs) == 5
    for item in recs:
        assert "item_id" in item
        assert "title" in item
        assert item["strategy"] == "cold_start"


def test_cold_start_with_category_preference():
    cs = ColdStartRecommender()
    recs = cs.recommend_for_new_user(preferred_categories=["Comedy"], top_n=5)
    assert len(recs) == 5
    # Should recommend Comedy items
    assert any("Comedy" in item.get("categories", []) or item.get("primary_category") == "Comedy" for item in recs)
