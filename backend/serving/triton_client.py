"""
NVIDIA Triton Inference Server Client with Automatic Local Serving Fallback.
Provides unified inference interface across remote Triton daemon and local TensorFlow engine.
"""
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from backend.config.config import settings
from backend.serving.local_inference import local_inference_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class TritonInferenceClient:
    """Client for NVIDIA Triton Inference Server with high-availability local fallback."""

    def __init__(self, server_url: Optional[str] = None):
        self.server_url = server_url or settings.TRITON_SERVER_URL
        self.is_triton_available = False
        self.http_client = None

        self._check_triton_health()

    def _check_triton_health(self) -> bool:
        """Check if Triton server is live and responsive."""
        if settings.SERVING_MODE != "triton":
            self.is_triton_available = False
            return False

        try:
            import tritonclient.http as httpclient
            client = httpclient.InferenceServerClient(url=self.server_url, connection_timeout=1.0, network_timeout=1.0)
            if client.is_server_live():
                self.http_client = client
                self.is_triton_available = True
                logger.info("Connected to live NVIDIA Triton Inference Server at %s", self.server_url)
                return True
        except Exception as e:
            self.is_triton_available = False
            self.http_client = None
            logger.debug("Triton server at %s unavailable (%s). Falling back to local serving.", self.server_url, e)

        return False

    def get_user_embedding(self, user_features: Dict[str, Any]) -> np.ndarray:
        """Retrieve user embedding using Triton or Local engine with parity."""
        if self.is_triton_available and self.http_client:
            try:
                import tritonclient.http as httpclient
                # Prepare Triton request tensors
                inputs = [
                    httpclient.InferInput("user_id", [1], "BYTES"),
                    httpclient.InferInput("user_top_category", [1], "BYTES"),
                    httpclient.InferInput("user_interaction_count", [1], "FP32"),
                    httpclient.InferInput("user_avg_rating", [1], "FP32"),
                ]
                inputs[0].set_data_from_numpy(np.array([str(user_features.get("user_id", "<UNK>"))], dtype=object))
                inputs[1].set_data_from_numpy(np.array([str(user_features.get("user_top_category", "Unknown"))], dtype=object))
                inputs[2].set_data_from_numpy(np.array([float(user_features.get("user_interaction_count", 0.0))], dtype=np.float32))
                inputs[3].set_data_from_numpy(np.array([float(user_features.get("user_avg_rating", 3.0))], dtype=np.float32))

                results = self.http_client.infer("retrieval_model", inputs)
                return results.as_numpy("user_embedding")[0]
            except Exception as e:
                logger.warning("Triton inference failed: %s. Falling back to local engine.", e)

        return local_inference_engine.predict_user_embedding(user_features)

    def score_candidates(
        self,
        candidate_df: pd.DataFrame,
        model_type: str = "dcn",
    ) -> np.ndarray:
        """Score candidate user-item pairs using Triton or Local engine with parity."""
        if self.is_triton_available and self.http_client:
            try:
                import tritonclient.http as httpclient
                n = len(candidate_df)
                inputs = [
                    httpclient.InferInput("user_id", [n], "BYTES"),
                    httpclient.InferInput("item_id", [n], "BYTES"),
                    httpclient.InferInput("user_top_category", [n], "BYTES"),
                    httpclient.InferInput("primary_category", [n], "BYTES"),
                    httpclient.InferInput("user_interaction_count", [n], "FP32"),
                    httpclient.InferInput("user_avg_rating", [n], "FP32"),
                    httpclient.InferInput("item_popularity_score", [n], "FP32"),
                    httpclient.InferInput("item_avg_rating", [n], "FP32"),
                    httpclient.InferInput("category_affinity", [n], "FP32"),
                    httpclient.InferInput("retrieval_score", [n], "FP32"),
                ]
                inputs[0].set_data_from_numpy(candidate_df["user_id"].astype(object).values)
                inputs[1].set_data_from_numpy(candidate_df["item_id"].astype(object).values)
                inputs[2].set_data_from_numpy(candidate_df["user_top_category"].fillna("Unknown").astype(object).values)
                inputs[3].set_data_from_numpy(candidate_df["primary_category"].fillna("Unknown").astype(object).values)
                inputs[4].set_data_from_numpy(candidate_df["user_interaction_count"].fillna(10.0).astype(np.float32).values)
                inputs[5].set_data_from_numpy(candidate_df["user_avg_rating"].fillna(3.0).astype(np.float32).values)
                inputs[6].set_data_from_numpy(candidate_df["item_popularity_score"].fillna(0.0).astype(np.float32).values)
                inputs[7].set_data_from_numpy(candidate_df["item_avg_rating"].fillna(3.0).astype(np.float32).values)
                inputs[8].set_data_from_numpy(candidate_df["category_affinity"].fillna(0.0).astype(np.float32).values)
                inputs[9].set_data_from_numpy(candidate_df["retrieval_score"].fillna(0.5).astype(np.float32).values)

                results = self.http_client.infer("ranking_model", inputs)
                return results.as_numpy("ranking_score").flatten()
            except Exception as e:
                logger.warning("Triton ranking failed: %s. Falling back to local engine.", e)

        return local_inference_engine.predict_ranking_scores(candidate_df, model_type=model_type)

    def get_status(self) -> Dict[str, Any]:
        """Return serving status and mode."""
        self._check_triton_health()
        return {
            "serving_mode": "triton" if self.is_triton_available else "local_fallback",
            "triton_connected": self.is_triton_available,
            "server_url": self.server_url,
            "local_engine": local_inference_engine.get_status(),
        }


# Global singleton instance
serving_client = TritonInferenceClient()
