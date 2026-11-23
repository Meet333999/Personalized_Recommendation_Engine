"""
Two-Tower Retrieval Neural Network using TensorFlow Recommenders (TFRS).
User Tower and Item Tower produce calibrated embeddings in a shared metric space.
"""
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from typing import List, Dict, Any, Tuple
import tensorflow as tf
import tensorflow_recommenders as tfrs
import tf_keras as keras
from tf_keras import layers


class UserTower(keras.Model):
    """User representation tower mapping user attributes to a fixed-dimension vector."""

    def __init__(
        self,
        user_vocab: List[str],
        category_vocab: List[str],
        embedding_dim: int = 64,
        name: str = "user_tower",
    ):
        super().__init__(name=name)
        self.embedding_dim = embedding_dim

        # User ID embedding
        self.user_lookup = layers.StringLookup(vocabulary=user_vocab, mask_token=None)
        self.user_embedding = layers.Embedding(
            input_dim=len(user_vocab) + 1,
            output_dim=embedding_dim,
            name="user_id_embedding",
        )

        # User top category embedding
        self.cat_lookup = layers.StringLookup(vocabulary=category_vocab, mask_token=None)
        self.cat_embedding = layers.Embedding(
            input_dim=len(category_vocab) + 1,
            output_dim=16,
            name="user_cat_embedding",
        )

        # Dense projection layers
        self.dense_1 = layers.Dense(128, activation="relu", name="user_dense_1")
        self.batch_norm = layers.BatchNormalization(name="user_bn")
        self.dropout = layers.Dropout(0.2, name="user_dropout")
        self.dense_2 = layers.Dense(64, activation="relu", name="user_dense_2")
        self.projection = layers.Dense(embedding_dim, activation=None, name="user_projection")

    def call(self, inputs: Dict[str, tf.Tensor], training: bool = False) -> tf.Tensor:
        user_id = inputs["user_id"]
        user_cat = inputs.get("user_top_category", tf.constant(["Unknown"]))
        interaction_count = tf.expand_dims(tf.cast(inputs.get("user_interaction_count", 0.0), tf.float32), -1)
        avg_rating = tf.expand_dims(tf.cast(inputs.get("user_avg_rating", 3.0), tf.float32), -1)

        # Normalization of numerical features
        interaction_norm = tf.math.log1p(tf.maximum(0.0, interaction_count)) / 10.0
        rating_norm = (avg_rating - 3.0) / 2.0

        user_emb = self.user_embedding(self.user_lookup(user_id))
        cat_emb = self.cat_embedding(self.cat_lookup(user_cat))

        combined = tf.concat([user_emb, cat_emb, interaction_norm, rating_norm], axis=-1)
        x = self.dense_1(combined)
        x = self.batch_norm(x, training=training)
        x = self.dropout(x, training=training)
        x = self.dense_2(x)
        out = self.projection(x)

        # L2 normalize so dot product equals cosine similarity
        return tf.linalg.l2_normalize(out, axis=-1)


class ItemTower(keras.Model):
    """Item representation tower mapping item metadata to the shared metric space."""

    def __init__(
        self,
        item_vocab: List[str],
        category_vocab: List[str],
        embedding_dim: int = 64,
        name: str = "item_tower",
    ):
        super().__init__(name=name)
        self.embedding_dim = embedding_dim

        # Item ID embedding
        self.item_lookup = layers.StringLookup(vocabulary=item_vocab, mask_token=None)
        self.item_embedding = layers.Embedding(
            input_dim=len(item_vocab) + 1,
            output_dim=embedding_dim,
            name="item_id_embedding",
        )

        # Primary Category embedding
        self.cat_lookup = layers.StringLookup(vocabulary=category_vocab, mask_token=None)
        self.cat_embedding = layers.Embedding(
            input_dim=len(category_vocab) + 1,
            output_dim=16,
            name="item_cat_embedding",
        )

        # Dense projection layers
        self.dense_1 = layers.Dense(128, activation="relu", name="item_dense_1")
        self.batch_norm = layers.BatchNormalization(name="item_bn")
        self.dropout = layers.Dropout(0.2, name="item_dropout")
        self.dense_2 = layers.Dense(64, activation="relu", name="item_dense_2")
        self.projection = layers.Dense(embedding_dim, activation=None, name="item_projection")

    def call(self, inputs: Dict[str, tf.Tensor], training: bool = False) -> tf.Tensor:
        item_id = inputs["item_id"]
        primary_cat = inputs.get("primary_category", tf.constant(["Unknown"]))
        pop_score = tf.expand_dims(tf.cast(inputs.get("item_popularity_score", 0.0), tf.float32), -1)
        avg_rating = tf.expand_dims(tf.cast(inputs.get("item_avg_rating", 3.0), tf.float32), -1)

        rating_norm = (avg_rating - 3.0) / 2.0

        item_emb = self.item_embedding(self.item_lookup(item_id))
        cat_emb = self.cat_embedding(self.cat_lookup(primary_cat))

        combined = tf.concat([item_emb, cat_emb, pop_score, rating_norm], axis=-1)
        x = self.dense_1(combined)
        x = self.batch_norm(x, training=training)
        x = self.dropout(x, training=training)
        x = self.dense_2(x)
        out = self.projection(x)

        # L2 normalize
        return tf.linalg.l2_normalize(out, axis=-1)


class TwoTowerModel(tfrs.models.Model):
    """Complete Two-Tower Neural Recommender with In-Batch Negative Sampling."""

    def __init__(
        self,
        user_vocab: List[str],
        item_vocab: List[str],
        category_vocab: List[str],
        embedding_dim: int = 64,
        temperature: float = 0.05,
    ):
        super().__init__()
        self.user_tower = UserTower(user_vocab, category_vocab, embedding_dim)
        self.item_tower = ItemTower(item_vocab, category_vocab, embedding_dim)
        self.temperature = temperature

        # Standard TFRS Retrieval task with cosine similarity
        self.task = tfrs.tasks.Retrieval(
            loss=keras.losses.CategoricalCrossentropy(
                from_logits=True,
                reduction=tf.keras.losses.Reduction.SUM_OVER_BATCH_SIZE,
            ),
            temperature=self.temperature,
        )

    def compute_loss(self, features: Dict[str, tf.Tensor], training: bool = False) -> tf.Tensor:
        user_embeddings = self.user_tower(features, training=training)
        item_embeddings = self.item_tower(features, training=training)

        # In-batch sampled softmax loss
        return self.task(user_embeddings, item_embeddings)
