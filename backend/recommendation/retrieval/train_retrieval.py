"""
Training script for Two-Tower Retrieval Model.
Prepares datasets, executes training and validation loops, logs losses,
generates catalog embeddings, and saves model artifacts.
"""
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import json
import logging
from pathlib import Path
from typing import Dict, Any, List
import numpy as np
import pandas as pd
import tensorflow as tf
import tf_keras as keras

from backend.config.config import settings
from backend.recommendation.retrieval.two_tower_model import TwoTowerModel, UserTower, ItemTower

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def create_tf_dataset(df: pd.DataFrame, batch_size: int = 256, shuffle: bool = True) -> tf.data.Dataset:
    """Convert pandas DataFrame of interaction features to tf.data.Dataset."""
    feature_dict = {
        "user_id": df["user_id"].astype(str).values,
        "item_id": df["item_id"].astype(str).values,
        "user_top_category": df["user_top_category"].fillna("Unknown").astype(str).values,
        "primary_category": df["primary_category"].fillna("Unknown").astype(str).values,
        "user_interaction_count": df["user_avg_rating"].fillna(0.0).astype(np.float32).values,
        "user_avg_rating": df["user_avg_rating"].fillna(3.0).astype(np.float32).values,
        "item_popularity_score": df["item_popularity_score"].fillna(0.0).astype(np.float32).values,
        "item_avg_rating": df["item_avg_rating"].fillna(3.0).astype(np.float32).values,
    }
    ds = tf.data.Dataset.from_tensor_slices(feature_dict)
    if shuffle:
        ds = ds.shuffle(buffer_size=min(len(df), 50000), seed=42)
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


def train_two_tower_model(
    epochs: int = 5,
    batch_size: int = 256,
    embedding_dim: int = 64,
    learning_rate: float = 0.001,
) -> Dict[str, Any]:
    """Execute Two-Tower training, evaluation, and artifact generation."""
    logger.info("Initializing Two-Tower Retrieval Model training...")
    feat_dir = settings.DATA_FEATURES_DIR
    models_dir = settings.RETRIEVAL_MODEL_DIR
    models_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load Data
    train_df = pd.read_parquet(feat_dir / "train_features.parquet")
    val_df = pd.read_parquet(feat_dir / "val_features.parquet")
    items_df = pd.read_parquet(feat_dir / "item_features.parquet")

    # Filter positive or meaningful interactions for retrieval training (implicit positive feedback)
    train_pos = train_df[train_df["rating"] >= 3.0].copy()
    val_pos = val_df[val_df["rating"] >= 3.0].copy()
    if len(train_pos) < 1000:
        train_pos = train_df

    user_vocab = sorted(train_df["user_id"].unique().tolist())
    item_vocab = sorted(items_df["item_id"].unique().tolist())
    cat_vocab = sorted(items_df["primary_category"].unique().tolist())

    logger.info("Vocabularies: %d users, %d items, %d categories.", len(user_vocab), len(item_vocab), len(cat_vocab))

    train_ds = create_tf_dataset(train_pos, batch_size=batch_size, shuffle=True)
    val_ds = create_tf_dataset(val_pos, batch_size=batch_size, shuffle=False)

    # 2. Build Model
    model = TwoTowerModel(
        user_vocab=user_vocab,
        item_vocab=item_vocab,
        category_vocab=cat_vocab,
        embedding_dim=embedding_dim,
    )
    optimizer = keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(optimizer=optimizer)

    # 3. Training Loop
    history = {"train_loss": [], "val_loss": [], "epochs": []}
    logger.info("Starting training loop for %d epochs...", epochs)

    best_val_loss = float("inf")
    best_weights_path = models_dir / "two_tower_best.weights.h5"

    for epoch in range(1, epochs + 1):
        train_losses = []
        for step, batch in enumerate(train_ds):
            with tf.GradientTape() as tape:
                loss = model.compute_loss(batch, training=True)
                # Add regularization loss if any
                regularization_loss = sum(model.losses) if model.losses else 0.0
                total_loss = loss + regularization_loss

            gradients = tape.gradient(total_loss, model.trainable_variables)
            optimizer.apply_gradients(zip(gradients, model.trainable_variables))
            train_losses.append(float(loss.numpy()))

        val_losses = []
        for val_batch in val_ds:
            v_loss = model.compute_loss(val_batch, training=False)
            val_losses.append(float(v_loss.numpy()))

        epoch_train_loss = float(np.mean(train_losses))
        epoch_val_loss = float(np.mean(val_losses)) if val_losses else epoch_train_loss

        history["epochs"].append(epoch)
        history["train_loss"].append(epoch_train_loss)
        history["val_loss"].append(epoch_val_loss)

        logger.info("Epoch %d/%d - Train Loss: %.4f - Val Loss: %.4f",
                    epoch, epochs, epoch_train_loss, epoch_val_loss)

        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            model.save_weights(str(best_weights_path))

    # 4. Generate Item Embeddings for All Catalog Items
    logger.info("Generating embeddings for all %d catalog items...", len(items_df))
    item_feature_dict = {
        "item_id": tf.constant(items_df["item_id"].astype(str).values),
        "primary_category": tf.constant(items_df["primary_category"].fillna("Unknown").astype(str).values),
        "item_popularity_score": tf.constant(items_df["item_popularity_score"].fillna(0.0).astype(np.float32).values),
        "item_avg_rating": tf.constant(items_df["item_avg_rating"].fillna(3.0).astype(np.float32).values),
    }

    # Predict in chunks to conserve memory
    item_embeddings_list = []
    chunk_size = 1000
    total_items = len(items_df)

    for i in range(0, total_items, chunk_size):
        chunk_inputs = {
            k: v[i:i + chunk_size] for k, v in item_feature_dict.items()
        }
        emb = model.item_tower(chunk_inputs, training=False)
        item_embeddings_list.append(emb.numpy())

    all_item_embeddings = np.vstack(item_embeddings_list).astype(np.float32)
    all_item_ids = items_df["item_id"].astype(str).tolist()

    # Save artifacts
    np.save(str(models_dir / "item_embeddings.npy"), all_item_embeddings)
    with open(models_dir / "item_ids.json", "w") as f:
        json.dump(all_item_ids, f)

    # Save metadata & vocabularies
    meta_info = {
        "embedding_dim": embedding_dim,
        "user_vocab_size": len(user_vocab),
        "item_vocab_size": len(item_vocab),
        "category_vocab": cat_vocab,
        "final_train_loss": history["train_loss"][-1],
        "final_val_loss": history["val_loss"][-1],
        "best_val_loss": best_val_loss,
    }
    with open(models_dir / "retrieval_metadata.json", "w") as f:
        json.dump(meta_info, f, indent=2)

    with open(models_dir / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    # Save vocabularies for inference
    with open(models_dir / "user_vocab.json", "w") as f:
        json.dump(user_vocab, f)
    with open(models_dir / "item_vocab.json", "w") as f:
        json.dump(item_vocab, f)

    logger.info("Saved Two-Tower retrieval artifacts to %s", models_dir)
    return {
        "status": "success",
        "epochs": epochs,
        "train_loss": history["train_loss"][-1],
        "val_loss": history["val_loss"][-1],
        "embeddings_shape": list(all_item_embeddings.shape),
    }


if __name__ == "__main__":
    res = train_two_tower_model(epochs=settings.RETRIEVAL_EPOCHS, batch_size=settings.RETRIEVAL_BATCH_SIZE)
    print("Retrieval Training Result:", res)
