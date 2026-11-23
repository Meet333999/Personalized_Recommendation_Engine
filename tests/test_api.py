"""
Tests for FastAPI Application REST Endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from backend.api.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "models" in data
    assert "vector_search" in data


def test_recommendations_endpoint_known_user():
    res = client.get("/api/recommendations/1?limit=5&model=dcn")
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == "1"
    assert len(data["recommendations"]) == 5
    assert "retrieval_stage" in data
    assert "ranking_stage" in data


def test_recommendations_endpoint_cold_start_user():
    res = client.get("/api/recommendations/999999?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == "999999"
    assert len(data["recommendations"]) == 5
    assert data["strategy"] == "cold_start_popularity"


def test_analytics_overview():
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_users"] > 0
    assert data["total_items"] > 0


def test_models_status():
    res = client.get("/api/models/status")
    assert res.status_code == 200
    data = res.json()
    assert "retrieval_model" in data
    assert "ranking_models" in data
