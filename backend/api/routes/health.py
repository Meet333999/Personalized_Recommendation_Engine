"""
FastAPI Routes: Health & System Diagnostics.
"""
from datetime import datetime
from fastapi import APIRouter
from backend.config.config import settings
from backend.vector_search.faiss_index import faiss_manager
from backend.caching.redis_cache import cache_service
from backend.serving.triton_client import serving_client
from backend.api.schemas.api_schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_system_health():
    """Check connectivity and operational readiness of models, vector index, and cache."""
    serving_status = serving_client.get_status()
    faiss_status = faiss_manager.get_status()
    cache_status = cache_service.get_stats()

    return HealthResponse(
        status="healthy" if faiss_status["loaded"] else "degraded",
        timestamp=datetime.utcnow().isoformat() + "Z",
        models={
            "retrieval_ready": serving_status["local_engine"]["retrieval_model_loaded"],
            "ranking_ready": serving_status["local_engine"]["ranking_model_loaded"],
        },
        vector_search=faiss_status,
        cache=cache_status,
        serving=serving_status,
    )
