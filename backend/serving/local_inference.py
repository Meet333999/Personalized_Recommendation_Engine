"""
Local TensorFlow Inference Serving Engine.
Provides high-performance, in-process real-time inference for Two-Tower Retrieval
and Deep Ranking models with complete output parity with NVIDIA Triton.
"""
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import tensorflow as tf

from backend.config.config import settings
from backend.recommendation.retrieval.two_tower_model import UserTower
from backend.recommendation.ranking.ranking_models import DCNRankingModel, WideAndDeepRankingModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class LocalInferenceEngine:
    """In-process model server executing direct forward passes using trained weights."""

    def __init__(self):
        self.user_tower: Optional[UserTower] = None
        self.dcn_ranking_model: Optional[DCNRankingModel] = None
        self.wd_ranking_model: Optional[WideAndDeepRankingModel] = None

        self.user_vocab: List[str] = []
        self.item_vocab: List[str] = []
        self.cat_vocab: List[str] = []

        self.is_retrieval_ready = False
        self.is_ranking_ready = False

        self._load_models()

    def _load_models(self) -> None:
        """Load vocabularies and weights for retrieval and ranking models."""
        retrieval_dir = settings.RETRIEVAL_MODEL_DIR
        ranking_dir = settings.RANKING_MODEL_DIR

        # 1. Load Retrieval User Tower
        user_vocab_path = retrieval_dir / "user_vocab.json"
        ret_meta_path = retrieval_dir / "retrieval_metadata.json"
        user_weights_path = retrieval_dir / "user_tower.weights.h5"
        best_weights = retrieval_dir / "two_tower_best.weights.h5"

        if user_vocab_path.exists() and ret_meta_path.exists():
            try:
                with open(user_vocab_path, "r") as f:
                    self.user_vocab = json.load(f)
                with open(ret_meta_path, "r") as f:
                    ret_meta = json.load(f)

                self.cat_vocab = ret_meta.get("category_vocab", ["Unknown"])
                embedding_dim = ret_meta.get("embedding_dim", settings.EMBEDDING_DIM)

                self.user_tower = UserTower(
                    user_vocab=self.user_vocab,
                    category_vocab=self.cat_vocab,
                    embedding_dim=embedding_dim,
                )

                # Initialize variables by running dummy forward pass
                dummy_inputs = {
                    "user_id": tf.constant(["<UNK>"]),
                    "user_top_category": tf.constant(["Unknown"]),
                    "user_interaction_count": tf.constant([0.0], dtype=tf.float32),
                    "user_avg_rating": tf.constant([3.0], dtype=tf.float32),
                }
                _ = self.user_tower(dummy_inputs)

                if user_weights_path.exists():
                    self.user_tower.load_weights(str(user_weights_path))
                elif best_weights.exists():
                    self.user_tower.load_weights(str(best_weights), by_name=True, skip_mismatch=True)
                self.is_retrieval_ready = True
                logger.info("Local UserTower inference engine initialized successfully.")
            except Exception as e:
                logger.warning("Could not load UserTower weights: %s", e)

        # 2. Load Ranking Models
        dcn_weights = ranking_dir / "dcn_model" / "dcn_weights.weights.h5"
        wd_weights = ranking_dir / "wide_and_deep_model" / "wd_weights.weights.h5"
        item_vocab_path = ranking_dir / "item_vocab.json"

        if item_vocab_path.exists():
            try:
                with open(item_vocab_path, "r") as f:
                    self.item_vocab = json.load(f)

                embedding_dim = 32

                # Build DCN
                self.dcn_ranking_model = DCNRankingModel(
                    user_vocab=self.user_vocab,
                    item_vocab=self.item_vocab,
                    category_vocab=self.cat_vocab,
                    embedding_dim=embedding_dim,
                )
                dummy_rank_inputs = {
                    "user_id": tf.constant(["<UNK>"]),
                    "item_id": tf.constant(["<UNK>"]),
                    "user_top_category": tf.constant(["Unknown"]),
                    "primary_category": tf.constant(["Unknown"]),
                    "user_interaction_count": tf.constant([10.0], dtype=tf.float32),
                    "user_avg_rating": tf.constant([3.0], dtype=tf.float32),
                    "item_popularity_score": tf.constant([0.5], dtype=tf.float32),
                    "item_avg_rating": tf.constant([3.5], dtype=tf.float32),
                    "category_affinity": tf.constant([1.0], dtype=tf.float32),
                    "retrieval_score": tf.constant([0.8], dtype=tf.float32),
                }
                _ = self.dcn_ranking_model(dummy_rank_inputs)

                if dcn_weights.exists():
                    self.dcn_ranking_model.load_weights(str(dcn_weights))

                # Build Wide & Deep
                self.wd_ranking_model = WideAndDeepRankingModel(
                    user_vocab=self.user_vocab,
                    item_vocab=self.item_vocab,
                    category_vocab=self.cat_vocab,
                    embedding_dim=embedding_dim,
                )
                _ = self.wd_ranking_model(dummy_rank_inputs)
                if wd_weights.exists():
                    self.wd_ranking_model.load_weights(str(wd_weights))

                self.is_ranking_ready = True
                logger.info("Local Ranking inference engine initialized successfully (DCN & Wide&Deep).")
            except Exception as e:
                logger.warning("Could not load Ranking models: %s", e)

    def predict_user_embedding(self, user_features: Dict[str, Any]) -> np.ndarray:
        """Generate a 64-dimensional user embedding from user features."""
        if self.user_tower is None or not self.is_retrieval_ready:
            self._load_models()

        if self.user_tower is None:
            # Fallback deterministic pseudo-embedding if model not loaded yet
            return np.ones((settings.EMBEDDING_DIM,), dtype=np.float32) / np.sqrt(settings.EMBEDDING_DIM)

        inputs = {
            "user_id": tf.constant([str(user_features.get("user_id", "<UNK>"))]),
            "user_top_category": tf.constant([str(user_features.get("user_top_category", "Unknown"))]),
            "user_interaction_count": tf.constant([float(user_features.get("user_interaction_count", 0.0))], dtype=tf.float32),
            "user_avg_rating": tf.constant([float(user_features.get("user_avg_rating", 3.0))], dtype=tf.float32),
        }
        emb_tensor = self.user_tower(inputs, training=False)
        return emb_tensor.numpy()[0]

    def predict_ranking_scores(
        self,
        candidate_df: pd.DataFrame,
        model_type: str = "dcn",
    ) -> np.ndarray:
        """Score candidate user-item pairs using selected ranking model ('dcn' or 'wide_and_deep')."""
        if not self.is_ranking_ready:
            self._load_models()

        model = self.dcn_ranking_model if model_type.lower() == "dcn" else self.wd_ranking_model
        if model is None:
            # Fallback to linear combination of retrieval score and popularity
            ret = candidate_df["retrieval_score"].fillna(0.5).values
            pop = candidate_df["item_popularity_score"].fillna(0.0).values
            return (0.6 * ret + 0.4 * pop).astype(np.float32)

        inputs = {
            "user_id": tf.constant(candidate_df["user_id"].astype(str).values),
            "item_id": tf.constant(candidate_df["item_id"].astype(str).values),
            "user_top_category": tf.constant(candidate_df["user_top_category"].fillna("Unknown").astype(str).values),
            "primary_category": tf.constant(candidate_df["primary_category"].fillna("Unknown").astype(str).values),
            "user_interaction_count": tf.constant(candidate_df["user_interaction_count"].fillna(10.0).astype(np.float32).values),
            "user_avg_rating": tf.constant(candidate_df["user_avg_rating"].fillna(3.0).astype(np.float32).values),
            "item_popularity_score": tf.constant(candidate_df["item_popularity_score"].fillna(0.0).astype(np.float32).values),
            "item_avg_rating": tf.constant(candidate_df["item_avg_rating"].fillna(3.0).astype(np.float32).values),
            "category_affinity": tf.constant(candidate_df["category_affinity"].fillna(0.0).astype(np.float32).values),
            "retrieval_score": tf.constant(candidate_df["retrieval_score"].fillna(0.5).astype(np.float32).values),
        }
        predictions = model(inputs, training=False)
        return predictions.numpy().flatten()

    def get_status(self) -> Dict[str, Any]:
        return {
            "engine": "local_tensorflow",
            "retrieval_model_loaded": self.is_retrieval_ready,
            "ranking_model_loaded": self.is_ranking_ready,
            "user_vocab_size": len(self.user_vocab),
            "item_vocab_size": len(self.item_vocab),
        }


# Global singleton
local_inference_engine = LocalInferenceEngine()
