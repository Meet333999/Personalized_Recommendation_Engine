"""
Deep Ranking Models: Deep & Cross Network (DCN-v2) and Wide & Deep Neural Network.
Predicts calibrated relevance probabilities for retrieved candidates.
"""
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from typing import List, Dict, Any, Optional
import tensorflow as tf
import tf_keras as keras
from tf_keras import layers


class CrossLayer(layers.Layer):
    """Explicit feature crossing layer: x_{l+1} = x_0 * (W * x_l + b) + x_l."""

    def __init__(self, projection_dim: Optional[int] = None, **kwargs):
        super().__init__(**kwargs)
        self.projection_dim = projection_dim

    def build(self, input_shape):
        dim = input_shape[-1]
        self.dense = layers.Dense(dim, use_bias=True)
        super().build(input_shape)

    def call(self, x0: tf.Tensor, xl: tf.Tensor) -> tf.Tensor:
        # x_0 * (W * x_l + b) + x_l
        interaction = x0 * self.dense(xl)
        return interaction + xl


class CrossNetwork(layers.Layer):
    """Stack of Cross Layers to capture explicit bounded-degree feature interactions."""

    def __init__(self, num_layers: int = 3, **kwargs):
        super().__init__(**kwargs)
        self.num_layers = num_layers
        self.cross_layers = [CrossLayer(name=f"cross_layer_{i}") for i in range(num_layers)]

    def call(self, x0: tf.Tensor) -> tf.Tensor:
        xl = x0
        for layer in self.cross_layers:
            xl = layer(x0, xl)
        return xl


class DCNRankingModel(keras.Model):
    """Deep & Cross Network (DCN-v2) for Candidate Ranking."""

    def __init__(
        self,
        user_vocab: List[str],
        item_vocab: List[str],
        category_vocab: List[str],
        embedding_dim: int = 32,
        num_cross_layers: int = 3,
        name: str = "dcn_ranking_model",
    ):
        super().__init__(name=name)
        # Vocabularies & Lookups
        self.user_lookup = layers.StringLookup(vocabulary=user_vocab, mask_token=None)
        self.user_emb = layers.Embedding(len(user_vocab) + 1, embedding_dim, name="user_emb")

        self.item_lookup = layers.StringLookup(vocabulary=item_vocab, mask_token=None)
        self.item_emb = layers.Embedding(len(item_vocab) + 1, embedding_dim, name="item_emb")

        self.cat_lookup = layers.StringLookup(vocabulary=category_vocab, mask_token=None)
        self.user_cat_emb = layers.Embedding(len(category_vocab) + 1, 8, name="user_cat_emb")
        self.item_cat_emb = layers.Embedding(len(category_vocab) + 1, 8, name="item_cat_emb")

        # Explicit Cross Network
        self.cross_network = CrossNetwork(num_layers=num_cross_layers)

        # Deep MLP Stream
        self.deep_dense1 = layers.Dense(128, activation="relu", name="deep_dense1")
        self.deep_bn1 = layers.BatchNormalization()
        self.deep_dropout1 = layers.Dropout(0.2)
        self.deep_dense2 = layers.Dense(64, activation="relu", name="deep_dense2")
        self.deep_bn2 = layers.BatchNormalization()
        self.deep_dense3 = layers.Dense(32, activation="relu", name="deep_dense3")

        # Fusion Head
        self.fusion_dense = layers.Dense(32, activation="relu", name="fusion_dense")
        self.prediction_head = layers.Dense(1, activation="sigmoid", name="ranking_score")

    def call(self, inputs: Dict[str, tf.Tensor], training: bool = False) -> tf.Tensor:
        # Categorical embeddings
        u_emb = self.user_emb(self.user_lookup(inputs["user_id"]))
        i_emb = self.item_emb(self.item_lookup(inputs["item_id"]))
        uc_emb = self.user_cat_emb(self.cat_lookup(inputs.get("user_top_category", tf.constant(["Unknown"]))))
        ic_emb = self.item_cat_emb(self.cat_lookup(inputs.get("primary_category", tf.constant(["Unknown"]))))

        # Continuous / numerical features
        num_features = [
            tf.expand_dims(tf.cast(inputs.get("user_interaction_count", 0.0), tf.float32) / 100.0, -1),
            tf.expand_dims((tf.cast(inputs.get("user_avg_rating", 3.0), tf.float32) - 3.0) / 2.0, -1),
            tf.expand_dims(tf.cast(inputs.get("item_popularity_score", 0.0), tf.float32), -1),
            tf.expand_dims((tf.cast(inputs.get("item_avg_rating", 3.0), tf.float32) - 3.0) / 2.0, -1),
            tf.expand_dims(tf.cast(inputs.get("category_affinity", 0.0), tf.float32), -1),
            tf.expand_dims(tf.cast(inputs.get("retrieval_score", 0.5), tf.float32), -1),
        ]
        num_tensor = tf.concat(num_features, axis=-1)

        # Concatenate into input representation x0
        x0 = tf.concat([u_emb, i_emb, uc_emb, ic_emb, num_tensor], axis=-1)

        # Cross stream
        x_cross = self.cross_network(x0)

        # Deep stream
        x_deep = self.deep_dense1(x0)
        x_deep = self.deep_bn1(x_deep, training=training)
        x_deep = self.deep_dropout1(x_deep, training=training)
        x_deep = self.deep_dense2(x_deep)
        x_deep = self.deep_bn2(x_deep, training=training)
        x_deep = self.deep_dense3(x_deep)

        # Stack & Fuse
        combined = tf.concat([x_cross, x_deep], axis=-1)
        fused = self.fusion_dense(combined)
        return self.prediction_head(fused)


class WideAndDeepRankingModel(keras.Model):
    """Wide & Deep Learning for Recommender Systems (Cheng et al.)."""

    def __init__(
        self,
        user_vocab: List[str],
        item_vocab: List[str],
        category_vocab: List[str],
        embedding_dim: int = 32,
        name: str = "wide_and_deep_model",
    ):
        super().__init__(name=name)
        # Deep stream embeddings
        self.user_lookup = layers.StringLookup(vocabulary=user_vocab, mask_token=None)
        self.user_emb = layers.Embedding(len(user_vocab) + 1, embedding_dim)

        self.item_lookup = layers.StringLookup(vocabulary=item_vocab, mask_token=None)
        self.item_emb = layers.Embedding(len(item_vocab) + 1, embedding_dim)

        self.cat_lookup = layers.StringLookup(vocabulary=category_vocab, mask_token=None)
        self.user_cat_emb = layers.Embedding(len(category_vocab) + 1, 8)
        self.item_cat_emb = layers.Embedding(len(category_vocab) + 1, 8)

        # Deep MLP
        self.deep1 = layers.Dense(128, activation="relu")
        self.dropout = layers.Dropout(0.2)
        self.deep2 = layers.Dense(64, activation="relu")
        self.deep3 = layers.Dense(32, activation="relu")

        # Wide Linear Layer
        self.wide_linear = layers.Dense(1, use_bias=False, name="wide_linear")
        self.bias = self.add_weight(shape=(1,), initializer="zeros", trainable=True, name="bias")

        # Deep projection
        self.deep_linear = layers.Dense(1, use_bias=False, name="deep_linear")

    def call(self, inputs: Dict[str, tf.Tensor], training: bool = False) -> tf.Tensor:
        # Deep features
        u_emb = self.user_emb(self.user_lookup(inputs["user_id"]))
        i_emb = self.item_emb(self.item_lookup(inputs["item_id"]))
        uc_emb = self.user_cat_emb(self.cat_lookup(inputs.get("user_top_category", tf.constant(["Unknown"]))))
        ic_emb = self.item_cat_emb(self.cat_lookup(inputs.get("primary_category", tf.constant(["Unknown"]))))

        num_features = [
            tf.expand_dims(tf.cast(inputs.get("user_interaction_count", 0.0), tf.float32) / 100.0, -1),
            tf.expand_dims((tf.cast(inputs.get("user_avg_rating", 3.0), tf.float32) - 3.0) / 2.0, -1),
            tf.expand_dims(tf.cast(inputs.get("item_popularity_score", 0.0), tf.float32), -1),
            tf.expand_dims((tf.cast(inputs.get("item_avg_rating", 3.0), tf.float32) - 3.0) / 2.0, -1),
            tf.expand_dims(tf.cast(inputs.get("category_affinity", 0.0), tf.float32), -1),
            tf.expand_dims(tf.cast(inputs.get("retrieval_score", 0.5), tf.float32), -1),
        ]
        num_tensor = tf.concat(num_features, axis=-1)

        deep_in = tf.concat([u_emb, i_emb, uc_emb, ic_emb, num_tensor], axis=-1)
        d = self.deep1(deep_in)
        d = self.dropout(d, training=training)
        d = self.deep2(d)
        d = self.deep3(d)
        deep_out = self.deep_linear(d)

        # Wide features (linear combination of sparse/affinity signals)
        wide_in = tf.concat([
            tf.expand_dims(tf.cast(inputs.get("category_affinity", 0.0), tf.float32), -1),
            tf.expand_dims(tf.cast(inputs.get("item_popularity_score", 0.0), tf.float32), -1),
            tf.expand_dims(tf.cast(inputs.get("retrieval_score", 0.5), tf.float32), -1),
        ], axis=-1)
        wide_out = self.wide_linear(wide_in)

        # Output probability: sigmoid(wide + deep + bias)
        logits = wide_out + deep_out + self.bias
        return tf.sigmoid(logits)
