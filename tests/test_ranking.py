"""
Tests for Deep Ranking Models (DCN-v2 and Wide & Deep).
"""
import pytest
import tensorflow as tf
import numpy as np
from backend.recommendation.ranking.ranking_models import DCNRankingModel, WideAndDeepRankingModel


def test_dcn_ranking_forward():
    user_vocab = ["u1", "u2"]
    item_vocab = ["i1", "i2"]
    cat_vocab = ["Action", "Sci-Fi"]

    model = DCNRankingModel(user_vocab, item_vocab, cat_vocab, embedding_dim=16)
    inputs = {
        "user_id": tf.constant(["u1"]),
        "item_id": tf.constant(["i1"]),
        "user_top_category": tf.constant(["Action"]),
        "primary_category": tf.constant(["Action"]),
        "user_interaction_count": tf.constant([20.0], dtype=tf.float32),
        "user_avg_rating": tf.constant([4.0], dtype=tf.float32),
        "item_popularity_score": tf.constant([0.7], dtype=tf.float32),
        "item_avg_rating": tf.constant([4.1], dtype=tf.float32),
        "category_affinity": tf.constant([1.0], dtype=tf.float32),
        "retrieval_score": tf.constant([0.85], dtype=tf.float32),
    }

    out = model(inputs)
    assert out.shape == (1, 1)
    val = float(out.numpy()[0][0])
    assert 0.0 <= val <= 1.0


def test_wide_and_deep_ranking_forward():
    user_vocab = ["u1", "u2"]
    item_vocab = ["i1", "i2"]
    cat_vocab = ["Action", "Sci-Fi"]

    model = WideAndDeepRankingModel(user_vocab, item_vocab, cat_vocab, embedding_dim=16)
    inputs = {
        "user_id": tf.constant(["u1"]),
        "item_id": tf.constant(["i1"]),
        "user_top_category": tf.constant(["Action"]),
        "primary_category": tf.constant(["Action"]),
        "user_interaction_count": tf.constant([20.0], dtype=tf.float32),
        "user_avg_rating": tf.constant([4.0], dtype=tf.float32),
        "item_popularity_score": tf.constant([0.7], dtype=tf.float32),
        "item_avg_rating": tf.constant([4.1], dtype=tf.float32),
        "category_affinity": tf.constant([1.0], dtype=tf.float32),
        "retrieval_score": tf.constant([0.85], dtype=tf.float32),
    }

    out = model(inputs)
    assert out.shape == (1, 1)
    val = float(out.numpy()[0][0])
    assert 0.0 <= val <= 1.0
