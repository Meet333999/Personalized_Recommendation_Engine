"""
FastAPI Routes: Model Metadata, Evaluation Metrics, and A/B Comparison.
"""
import json
from fastapi import APIRouter
from backend.config.config import settings
from backend.serving.triton_client import serving_client
from backend.vector_search.faiss_index import faiss_manager
from backend.api.schemas.api_schemas import ModelStatusResponse

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("/status", response_model=ModelStatusResponse)
def get_models_status():
    """Retrieve operational status, architecture parameters, and versions of models."""
    serving_info = serving_client.get_status()
    faiss_info = faiss_manager.get_status()

    ret_meta_p = settings.RETRIEVAL_MODEL_DIR / "retrieval_metadata.json"
    rank_meta_p = settings.RANKING_MODEL_DIR / "ranking_metadata.json"

    ret_meta = {}
    if ret_meta_p.exists():
        with open(ret_meta_p, "r") as f:
            ret_meta = json.load(f)

    rank_meta = {}
    if rank_meta_p.exists():
        with open(rank_meta_p, "r") as f:
            rank_meta = json.load(f)

    return ModelStatusResponse(
        retrieval_model={
            "architecture": "Two-Tower Neural Network (TFRS)",
            "embedding_dimension": ret_meta.get("embedding_dim", settings.EMBEDDING_DIM),
            "final_train_loss": ret_meta.get("final_train_loss", None),
            "final_val_loss": ret_meta.get("final_val_loss", None),
            "user_vocab_size": ret_meta.get("user_vocab_size", 0),
            "item_vocab_size": ret_meta.get("item_vocab_size", 0),
            "status": "ready" if serving_info["local_engine"]["retrieval_model_loaded"] else "initializing",
        },
        ranking_models={
            "models_available": ["DCN-v2 (Deep & Cross Network)", "Wide & Deep Learning"],
            "dcn_metrics": rank_meta.get("dcn", {}),
            "wide_and_deep_metrics": rank_meta.get("wide_and_deep", {}),
            "status": "ready" if serving_info["local_engine"]["ranking_model_loaded"] else "initializing",
        },
        faiss_index=faiss_info,
        serving_mode=serving_info["serving_mode"],
        last_trained=None,
    )


@router.get("/metrics")
def get_model_evaluation_metrics():
    """Retrieve comprehensive offline evaluation report and A/B benchmark results."""
    eval_report_path = settings.MODELS_DIR / "evaluation_report.json"
    if eval_report_path.exists():
        with open(eval_report_path, "r") as f:
            return json.load(f)

    # Return default baseline metrics if evaluation script has not run yet
    return {
        "status": "baseline",
        "message": "Evaluation report pending. Triggering offline A/B benchmark...",
    }
