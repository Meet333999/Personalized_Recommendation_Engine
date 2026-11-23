"""
FAISS Vector Similarity Search Engine.
Builds, persists, updates, and searches vector indices for candidate retrieval.
Supports IndexFlatIP (exact cosine similarity) and IndexIVFFlat (scalable ANN).
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
import faiss

from backend.config.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class FAISSIndexManager:
    """Manages creation, persistence, loading, and top-K search of FAISS vector indices."""

    def __init__(self, embedding_dim: int = 64, index_type: str = "IndexFlatIP"):
        self.embedding_dim = embedding_dim
        self.index_type = index_type
        self.index: Optional[faiss.Index] = None
        self.item_ids: List[str] = []
        self.id_to_idx: Dict[str, int] = {}
        self.idx_to_id: Dict[int, str] = {}

    def build_index(
        self,
        embeddings: np.ndarray,
        item_ids: List[str],
        index_type: Optional[str] = None,
    ) -> None:
        """Build FAISS index from L2-normalized embeddings matrix."""
        idx_type = index_type or self.index_type
        embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)

        if embeddings.ndim != 2:
            raise ValueError(f"Embeddings must be 2D array (N, D), got shape {embeddings.shape}")
        if embeddings.shape[1] != self.embedding_dim:
            self.embedding_dim = embeddings.shape[1]

        num_items, dim = embeddings.shape
        logger.info("Building FAISS index (%s) for %d items with dim=%d...", idx_type, num_items, dim)

        if idx_type == "IndexFlatIP":
            # Exact inner product (equivalent to cosine similarity for normalized vectors)
            self.index = faiss.IndexFlatIP(dim)
        elif idx_type == "IndexIVFFlat":
            nlist = min(max(int(np.sqrt(num_items)), 4), 100)
            quantizer = faiss.IndexFlatIP(dim)
            self.index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)
            self.index.train(embeddings)
        else:
            self.index = faiss.IndexFlatIP(dim)

        self.index.add(embeddings)
        self.item_ids = [str(i) for i in item_ids]
        self.id_to_idx = {item_id: i for i, item_id in enumerate(self.item_ids)}
        self.idx_to_id = {i: item_id for i, item_id in enumerate(self.item_ids)}

        logger.info("FAISS index constructed successfully. Total vectors indexed: %d", self.index.ntotal)

    def save(
        self,
        index_path: Optional[Path] = None,
        mapping_path: Optional[Path] = None,
    ) -> None:
        """Persist FAISS index binary and item ID mapping JSON."""
        idx_p = Path(index_path or settings.FAISS_INDEX_PATH)
        map_p = Path(mapping_path or settings.ITEM_MAPPING_PATH)

        idx_p.parent.mkdir(parents=True, exist_ok=True)
        if self.index is None:
            raise ValueError("No FAISS index to save. Build or load an index first.")

        faiss.write_index(self.index, str(idx_p))
        with open(map_p, "w") as f:
            json.dump(self.item_ids, f)

        logger.info("Saved FAISS index to %s and item mappings to %s", idx_p, map_p)

    def load(
        self,
        index_path: Optional[Path] = None,
        mapping_path: Optional[Path] = None,
    ) -> None:
        """Load persisted FAISS index binary and item ID mapping."""
        idx_p = Path(index_path or settings.FAISS_INDEX_PATH)
        map_p = Path(mapping_path or settings.ITEM_MAPPING_PATH)

        if not idx_p.exists() or not map_p.exists():
            raise FileNotFoundError(f"FAISS index artifacts not found at {idx_p} or {map_p}")

        self.index = faiss.read_index(str(idx_p))
        with open(map_p, "r") as f:
            self.item_ids = json.load(f)

        self.id_to_idx = {item_id: i for i, item_id in enumerate(self.item_ids)}
        self.idx_to_id = {i: item_id for i, item_id in enumerate(self.item_ids)}
        self.embedding_dim = self.index.d

        logger.info("Loaded FAISS index with %d vectors (dimension: %d)", self.index.ntotal, self.embedding_dim)

    def search(
        self,
        query_vector: np.ndarray,
        top_k: int = 100,
    ) -> Tuple[List[str], List[float]]:
        """Query index for top_k nearest items using user embedding vector."""
        if self.index is None:
            if settings.FAISS_INDEX_PATH.exists() and settings.ITEM_MAPPING_PATH.exists():
                self.load()
            else:
                raise ValueError("FAISS index not loaded.")

        q_vec = np.ascontiguousarray(query_vector, dtype=np.float32)
        if q_vec.ndim == 1:
            q_vec = np.expand_dims(q_vec, axis=0)

        # Normalize query vector if needed
        norm = np.linalg.norm(q_vec, axis=-1, keepdims=True)
        if np.any(norm > 0):
            q_vec = q_vec / (norm + 1e-10)

        actual_k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(q_vec, actual_k)

        cand_ids: List[str] = []
        cand_scores: List[float] = []

        for dist, idx in zip(distances[0], indices[0]):
            if idx in self.idx_to_id:
                cand_ids.append(self.idx_to_id[idx])
                cand_scores.append(float(dist))

        return cand_ids, cand_scores

    def get_status(self) -> Dict[str, Any]:
        """Return operational health status of vector index."""
        return {
            "loaded": self.index is not None,
            "total_items": self.index.ntotal if self.index else 0,
            "embedding_dim": self.embedding_dim,
            "index_type": self.index_type,
        }


# Global singleton manager
faiss_manager = FAISSIndexManager()
