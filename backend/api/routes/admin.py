"""
FastAPI Routes: Administration, Pipeline Retraining, and Cache Management.
"""
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks
from backend.caching.redis_cache import cache_service
from backend.orchestration.pipeline_runner import pipeline_runner
from backend.api.schemas.api_schemas import AdminActionResponse

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.post("/retrain", response_model=AdminActionResponse)
def trigger_retraining(background_tasks: BackgroundTasks):
    """Trigger the complete 12-stage recommendation retraining workflow in the background."""
    current_status = pipeline_runner.get_status()
    if current_status.get("is_running", False):
        return AdminActionResponse(
            status="busy",
            message="A retraining pipeline run is already in progress.",
            timestamp=datetime.utcnow().isoformat() + "Z",
            details=current_status,
        )

    # Launch in background
    background_tasks.add_task(pipeline_runner.run_full_pipeline)

    return AdminActionResponse(
        status="triggered",
        message="Retraining pipeline successfully scheduled in background.",
        timestamp=datetime.utcnow().isoformat() + "Z",
        details={"status": "running"},
    )


@router.get("/pipeline/status")
def get_pipeline_status():
    """Retrieve execution status and history of the 12-stage Airflow / local pipeline."""
    return pipeline_runner.get_status()


@router.post("/cache/clear", response_model=AdminActionResponse)
def clear_recommendation_cache():
    """Flush all cached recommendations and user embeddings from Redis/In-Memory store."""
    cache_service.clear_all()
    return AdminActionResponse(
        status="success",
        message="Recommendation caches cleared successfully.",
        timestamp=datetime.utcnow().isoformat() + "Z",
        details=cache_service.get_stats(),
    )
