"""
Tests for Feature Engineering Pipelines.
"""
import pytest
from pathlib import Path
import pandas as pd
from backend.config.config import settings


def test_feature_tables_exist():
    feat_dir = settings.DATA_FEATURES_DIR
    assert (feat_dir / "user_features.parquet").exists()
    assert (feat_dir / "item_features.parquet").exists()
    assert (feat_dir / "train_features.parquet").exists()


def test_user_features_schema():
    users_df = pd.read_parquet(settings.DATA_FEATURES_DIR / "user_features.parquet")
    required = ["user_id", "user_interaction_count", "user_avg_rating", "user_top_category"]
    for col in required:
        assert col in users_df.columns
    assert len(users_df) > 0


def test_item_features_schema():
    items_df = pd.read_parquet(settings.DATA_FEATURES_DIR / "item_features.parquet")
    required = ["item_id", "item_interaction_count", "item_avg_rating", "primary_category", "item_popularity_score"]
    for col in required:
        assert col in items_df.columns
    assert len(items_df) > 0
