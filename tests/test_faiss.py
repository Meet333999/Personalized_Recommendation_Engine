"""
Tests for FAISS Vector Search Index.
"""
import pytest
import numpy as np
from backend.vector_search.faiss_index import FAISSIndexManager


def test_faiss_build_and_search():
    dim = 64
    n_items = 50
    np.random.seed(42)

    # Normalized vectors
    embeddings = np.random.randn(n_items, dim).astype(np.float32)
    embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    item_ids = [f"item_{i}" for i in range(n_items)]

    manager = FAISSIndexManager(embedding_dim=dim, index_type="IndexFlatIP")
    manager.build_index(embeddings, item_ids)

    # Search with first item's vector -> should return item_0 as top-1 with similarity ~1.0
    cands, scores = manager.search(embeddings[0], top_k=5)
    assert len(cands) == 5
    assert cands[0] == "item_0"
    assert np.isclose(scores[0], 1.0, atol=1e-3)
