"""
Main FastAPI Application Entrypoint.
Configures middleware, CORS, OpenAPI documentation, and mounts all API routers.
"""
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config.config import settings, ROOT_DIR
from backend.vector_search.faiss_index import faiss_manager
from backend.caching.redis_cache import cache_service
from backend.serving.triton_client import serving_client
from backend.recommendation.pipeline import recommendation_pipeline

from backend.api.routes import (
    health,
    recommendations,
    users,
    items,
    analytics,
    models,
    admin,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler: Load FAISS index and warm up models on startup."""
    logger.info("Initializing Large-Scale Personalized Recommendation Engine API...")
    # Load FAISS index if present
    if settings.FAISS_INDEX_PATH.exists() and settings.ITEM_MAPPING_PATH.exists():
        try:
            faiss_manager.load()
            logger.info("FAISS vector index loaded successfully on startup.")
        except Exception as e:
            logger.warning("Could not auto-load FAISS index: %s", e)

    # Warm up pipeline tables
    try:
        recommendation_pipeline._load_feature_tables()
    except Exception as e:
        logger.warning("Could not pre-load feature tables: %s", e)

    yield

    logger.info("Shutting down Recommendation Engine API.")


app = FastAPI(
    title="Large-Scale Personalized Recommendation Engine",
    description="Two-Stage Recommendation System (Two-Tower Retrieval + Deep Ranking) with Spark, FAISS, Redis, and Triton.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development & local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Timing middleware injecting X-Process-Time-Ms header into all responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response


# Include Routers with /api prefix
app.include_router(health.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(models.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Mount React production build if available
frontend_dist = ROOT_DIR / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/{full_path:path}")
    def catch_all_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "service": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/api/health",
            "recommendations": "/api/recommendations/1",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
