"""
Tests for Data Ingestion, Cleaning, and Chronological Temporal Splitting.
"""
import pytest
import pandas as pd
import numpy as np
from backend.features.preprocessing import DatasetFactory


def test_dataset_factory():
    loader = DatasetFactory.get_loader("movielens", "ml-latest-small")
    assert loader is not None
    assert loader.variant == "ml-latest-small"


def test_temporal_split_no_leakage():
    loader = DatasetFactory.get_loader("movielens", "ml-latest-small")
    # Synthetic interactions
    n = 100
    timestamps = np.sort(np.random.randint(1000, 5000, size=n))
    df = pd.DataFrame({
        "user_id": [f"u_{i%10}" for i in range(n)],
        "item_id": [f"i_{i%20}" for i in range(n)],
        "rating": np.random.choice([1.0, 3.0, 5.0], size=n),
        "timestamp": timestamps,
    })

    train, val, test, meta = loader.temporal_split(df, train_ratio=0.8, val_ratio=0.1)
    assert len(train) == 80
    assert len(val) == 10
    assert len(test) == 10

    # Assert strict chronological boundary
    assert train["timestamp"].max() <= val["timestamp"].min()
    assert val["timestamp"].max() <= test["timestamp"].min()
