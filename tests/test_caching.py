"""
Tests for Redis and In-Memory Caching Services.
"""
import pytest
from backend.caching.redis_cache import RedisCacheService


def test_cache_set_and_get():
    cache = RedisCacheService()
    test_recs = [{"item_id": "test_1", "ranking_score": 0.95}]

    cache.set_recommendations(user_id="test_user", limit=5, recommendations=test_recs, ttl=60)
    retrieved = cache.get_recommendations(user_id="test_user", limit=5)

    assert retrieved is not None
    assert len(retrieved) == 1
    assert retrieved[0]["item_id"] == "test_1"


def test_cache_stats_and_clear():
    cache = RedisCacheService()
    stats = cache.get_stats()
    assert "hits" in stats
    assert "misses" in stats
    assert "status" in stats

    cache.clear_all()
    # After clear, getting recommendations should return None
    assert cache.get_recommendations(user_id="test_user", limit=5) is None
