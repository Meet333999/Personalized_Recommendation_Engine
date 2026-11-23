"""
Tests for Two-Tower Retrieval Model and Embedding Generation.
"""
import pytest
import numpy as np
import tensorflow as tf
from backend.config.config import settings
from backend.recommendation.retrieval.two_tower_model import UserTower, ItemTower


def test_user_tower_forward():
    user_vocab = ["1", "2", "3", "4"]
    cat_vocab = ["Action", "Comedy", "Drama"]
    tower = UserTower(user_vocab, cat_vocab, embedding_dim=64)

    inputs = {
        "user_id": tf.constant(["1"]),
        "user_top_category": tf.constant(["Action"]),
        "user_interaction_count": tf.constant([15.0], dtype=tf.float32),
        "user_avg_rating": tf.constant([4.2], dtype=tf.float32),
    }
    embedding = tower(inputs)
    assert embedding.shape == (1, 64)
    # Check L2 normalization (norm should be ~1.0)
    norm = np.linalg.norm(embedding.numpy()[0])
    assert np.isclose(norm, 1.0, atol=1e-3)


def test_item_tower_forward():
    item_vocab = ["101", "102", "103"]
    cat_vocab = ["Action", "Comedy", "Drama"]
    tower = ItemTower(item_vocab, cat_vocab, embedding_dim=64)

    inputs = {
        "item_id": tf.constant(["101"]),
        "primary_category": tf.constant(["Drama"]),
        "item_popularity_score": tf.constant([0.8], dtype=tf.float32),
        "item_avg_rating": tf.constant([3.8], dtype=tf.float32),
    }
    embedding = tower(inputs)
    assert embedding.shape == (1, 64)
    norm = np.linalg.norm(embedding.numpy()[0])
    assert np.isclose(norm, 1.0, atol=1e-3)
