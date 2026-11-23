"""
Configuration module for the Large-Scale Personalized Recommendation Engine.
Centralizes environment variables, hyperparameters, storage paths, and hardware flags.
"""
import os
import sys
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

# Ensure TensorFlow Legacy Keras is activated for TFRS compatibility
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Root workspace directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "Large-Scale Personalized Recommendation Engine"
    ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Dataset Settings
    DEFAULT_DATASET: str = "movielens"  # movielens, amazon_reviews, yelp, hm_fashion, goodreads, lastfm
    DATASET_VARIANT: str = "ml-latest-small"  # ml-latest-small, ml-25m, ml-1m
    DATA_RAW_DIR: Path = ROOT_DIR / "data" / "raw"
    DATA_PROCESSED_DIR: Path = ROOT_DIR / "data" / "processed"
    DATA_FEATURES_DIR: Path = ROOT_DIR / "data" / "features"

    # Model Hyperparameters
    EMBEDDING_DIM: int = 64
    RETRIEVAL_BATCH_SIZE: int = 256
    RANKING_BATCH_SIZE: int = 128
    RETRIEVAL_EPOCHS: int = 10
    RANKING_EPOCHS: int = 10
    LEARNING_RATE: float = 0.001
    TOP_K_CANDIDATES: int = 100
    DEFAULT_TOP_N: int = 10

    # Model Storage
    MODELS_DIR: Path = ROOT_DIR / "models"
    RETRIEVAL_MODEL_DIR: Path = ROOT_DIR / "models" / "retrieval"
    RANKING_MODEL_DIR: Path = ROOT_DIR / "models" / "ranking"

    # FAISS Index Configuration
    FAISS_INDEX_TYPE: str = "IndexFlatIP"  # IndexFlatIP, IndexIVFFlat
    FAISS_INDEX_PATH: Path = ROOT_DIR / "models" / "retrieval" / "faiss_index.bin"
    ITEM_MAPPING_PATH: Path = ROOT_DIR / "models" / "retrieval" / "item_ids.json"

    # Redis Caching
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    CACHE_TTL_SECONDS: int = 300
    REDIS_FALLBACK_TO_MEMORY: bool = True

    # Model Serving & Triton
    SERVING_MODE: str = "local"  # local or triton
    TRITON_SERVER_URL: str = "localhost:8001"
    TRITON_MODEL_REPOSITORY: Path = ROOT_DIR / "models" / "model_repository"
    TRITON_TIMEOUT: float = 5.0

    class Config:
        env_file = ".env"
        extra = "ignore"

    def setup_directories(self) -> None:
        """Create required storage directories if not present."""
        for path in [
            self.DATA_RAW_DIR,
            self.DATA_PROCESSED_DIR,
            self.DATA_FEATURES_DIR,
            self.MODELS_DIR,
            self.RETRIEVAL_MODEL_DIR,
            self.RANKING_MODEL_DIR,
            self.TRITON_MODEL_REPOSITORY,
        ]:
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.setup_directories()
