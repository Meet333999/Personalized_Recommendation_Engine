"""
Spark Feature Engineering Pipeline.
Uses Apache Spark (PySpark) to compute scalable user, item, and interaction feature tables
and stores them in optimized Parquet format. Includes robust fallback to PyArrow/Pandas
if JVM/Hadoop environment issues occur.
"""
import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

from backend.config.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def get_spark_session(app_name: str = "RecommendationFeatureEngineering"):
    """Initialize and return an optimized local PySpark session."""
    try:
        from pyspark.sql import SparkSession
        spark = (
            SparkSession.builder.appName(app_name)
            .master("local[*]")
            .config("spark.driver.memory", "4g")
            .config("spark.sql.shuffle.partitions", "4")
            .config("spark.default.parallelism", "4")
            .config("spark.sql.execution.arrow.pyspark.enabled", "true")
            .getOrCreate()
        )
        spark.sparkContext.setLogLevel("ERROR")
        return spark
    except Exception as e:
        logger.warning("SparkSession initialization failed: %s. Using high-performance Pandas/PyArrow engine.", e)
        return None


def run_spark_feature_pipeline() -> Dict[str, Any]:
    """Execute PySpark feature engineering on train/val/test splits."""
    proc_dir = settings.DATA_PROCESSED_DIR
    feat_dir = settings.DATA_FEATURES_DIR
    feat_dir.mkdir(parents=True, exist_ok=True)

    train_path = proc_dir / "train_interactions.parquet"
    val_path = proc_dir / "val_interactions.parquet"
    test_path = proc_dir / "test_interactions.parquet"
    items_path = proc_dir / "items.parquet"

    if not train_path.exists() or not items_path.exists():
        raise FileNotFoundError(f"Processed datasets missing in {proc_dir}. Run preprocessing first.")

    spark = get_spark_session()
    use_spark = spark is not None

    logger.info("Starting feature engineering using %s engine...", "Apache Spark (PySpark)" if use_spark else "Pandas/PyArrow")

    if use_spark:
        try:
            return _process_with_spark(spark, train_path, val_path, test_path, items_path, feat_dir)
        except Exception as e:
            logger.error("Spark execution encountered an error: %s. Falling back to native PyArrow engine.", e)
            return _process_with_pandas(train_path, val_path, test_path, items_path, feat_dir)
        finally:
            if spark:
                spark.stop()
    else:
        return _process_with_pandas(train_path, val_path, test_path, items_path, feat_dir)


def _process_with_spark(spark, train_path, val_path, test_path, items_path, feat_dir) -> Dict[str, Any]:
    """Compute features using PySpark DataFrame API and SQL window/aggregate functions."""
    from pyspark.sql import functions as F
    from pyspark.sql.window import Window

    # Load data into Spark DataFrames
    train_df = spark.read.parquet(str(train_path))
    val_df = spark.read.parquet(str(val_path))
    test_df = spark.read.parquet(str(test_path))
    items_df = spark.read.parquet(str(items_path))

    logger.info("Loaded Spark tables: Train=%d rows, Items=%d rows", train_df.count(), items_df.count())

    # 1. Compute Item Features from Training set
    item_stats = (
        train_df.groupBy("item_id")
        .agg(
            F.count("rating").alias("item_interaction_count"),
            F.avg("rating").alias("item_avg_rating"),
            F.coalesce(F.stddev("rating"), F.lit(0.0)).alias("item_rating_std"),
            F.max("timestamp").alias("item_latest_timestamp"),
        )
    )

    # Join with static item metadata
    item_features = items_df.join(item_stats, on="item_id", how="left")
    item_features = item_features.fillna({
        "item_interaction_count": 0,
        "item_avg_rating": 3.0,
        "item_rating_std": 0.0,
        "item_latest_timestamp": 0,
        "primary_category": "Unknown",
        "release_year": 2000,
    })

    # Add normalized log popularity score
    max_count = item_features.agg(F.max("item_interaction_count")).collect()[0][0] or 1
    item_features = item_features.withColumn(
        "item_popularity_score",
        F.log1p(F.col("item_interaction_count")) / float(np.log1p(max_count)),
    )

    # 2. Compute User Features from Training set
    # Enrich train with item primary category for category preference
    train_with_cat = train_df.join(
        items_df.select("item_id", "primary_category"),
        on="item_id",
        how="left",
    ).fillna({"primary_category": "Unknown"})

    # Determine user's top preferred category
    user_cat_counts = (
        train_with_cat.groupBy("user_id", "primary_category")
        .count()
    )
    cat_window = Window.partitionBy("user_id").orderBy(F.col("count").desc())
    user_top_cat = (
        user_cat_counts.withColumn("rank", F.row_number().over(cat_window))
        .filter(F.col("rank") == 1)
        .select(F.col("user_id"), F.col("primary_category").alias("user_top_category"))
    )

    # User general stats
    user_stats = (
        train_df.groupBy("user_id")
        .agg(
            F.count("rating").alias("user_interaction_count"),
            F.avg("rating").alias("user_avg_rating"),
            F.coalesce(F.stddev("rating"), F.lit(0.0)).alias("user_rating_std"),
            F.max("timestamp").alias("user_max_timestamp"),
            F.min("timestamp").alias("user_min_timestamp"),
        )
    )

    user_features = user_stats.join(user_top_cat, on="user_id", how="left").fillna({"user_top_category": "Unknown"})

    # 3. Enrich Interaction Tables (Train, Val, Test) with interaction features
    max_train_time = train_df.agg(F.max("timestamp")).collect()[0][0]

    def enrich_interactions(df):
        enriched = (
            df.join(user_features.select("user_id", "user_top_category", "user_avg_rating"), on="user_id", how="left")
            .join(item_features.select("item_id", "primary_category", "item_avg_rating", "item_popularity_score"), on="item_id", how="left")
            .fillna({
                "user_top_category": "Unknown",
                "user_avg_rating": 3.0,
                "primary_category": "Unknown",
                "item_avg_rating": 3.0,
                "item_popularity_score": 0.0,
            })
        )
        # Add recency, affinity and binary target
        enriched = enriched.withColumn(
            "recency_days",
            F.greatest(F.lit(0.0), (F.lit(max_train_time) - F.col("timestamp")) / 86400.0),
        ).withColumn(
            "category_affinity",
            F.when(F.col("user_top_category") == F.col("primary_category"), 1.0).otherwise(0.0),
        ).withColumn(
            "is_positive",
            F.when(F.col("rating") >= 3.5, 1.0).otherwise(0.0),
        )
        return enriched

    train_enriched = enrich_interactions(train_df)
    val_enriched = enrich_interactions(val_df)
    test_enriched = enrich_interactions(test_df)

    # Convert to pandas to ensure clean, atomic single-file Parquet on Windows
    user_feat_pd = user_features.toPandas()
    item_feat_pd = item_features.toPandas()
    train_feat_pd = train_enriched.toPandas()
    val_feat_pd = val_enriched.toPandas()
    test_feat_pd = test_enriched.toPandas()

    user_feat_pd.to_parquet(feat_dir / "user_features.parquet", index=False)
    item_feat_pd.to_parquet(feat_dir / "item_features.parquet", index=False)
    train_feat_pd.to_parquet(feat_dir / "train_features.parquet", index=False)
    val_feat_pd.to_parquet(feat_dir / "val_features.parquet", index=False)
    test_feat_pd.to_parquet(feat_dir / "test_features.parquet", index=False)

    logger.info("Spark feature pipeline complete: Saved user, item, and interaction features to %s", feat_dir)
    return {
        "engine": "PySpark",
        "user_features_count": len(user_feat_pd),
        "item_features_count": len(item_feat_pd),
        "train_interactions_count": len(train_feat_pd),
        "val_interactions_count": len(val_feat_pd),
        "test_interactions_count": len(test_feat_pd),
    }


def _process_with_pandas(train_path, val_path, test_path, items_path, feat_dir) -> Dict[str, Any]:
    """Fallback compute features using Pandas and PyArrow."""
    train_df = pd.read_parquet(train_path)
    val_df = pd.read_parquet(val_path)
    test_df = pd.read_parquet(test_path)
    items_df = pd.read_parquet(items_path)

    # 1. Item features
    item_stats = train_df.groupby("item_id").agg(
        item_interaction_count=("rating", "count"),
        item_avg_rating=("rating", "mean"),
        item_rating_std=("rating", lambda s: s.std(ddof=0) if len(s) > 1 else 0.0),
        item_latest_timestamp=("timestamp", "max"),
    ).reset_index()

    item_features = items_df.merge(item_stats, on="item_id", how="left")
    item_features["item_interaction_count"] = item_features["item_interaction_count"].fillna(0).astype(int)
    item_features["item_avg_rating"] = item_features["item_avg_rating"].fillna(3.0).astype(float)
    item_features["item_rating_std"] = item_features["item_rating_std"].fillna(0.0).astype(float)
    item_features["item_latest_timestamp"] = item_features["item_latest_timestamp"].fillna(0).astype(int)

    max_count = item_features["item_interaction_count"].max() or 1
    item_features["item_popularity_score"] = np.log1p(item_features["item_interaction_count"]) / np.log1p(max_count)

    # 2. User features
    train_with_cat = train_df.merge(items_df[["item_id", "primary_category"]], on="item_id", how="left")
    train_with_cat["primary_category"] = train_with_cat["primary_category"].fillna("Unknown")

    top_cat = (
        train_with_cat.groupby(["user_id", "primary_category"])
        .size()
        .reset_index(name="cat_count")
        .sort_values(["user_id", "cat_count"], ascending=[True, False])
        .drop_duplicates(subset=["user_id"])
        .rename(columns={"primary_category": "user_top_category"})[["user_id", "user_top_category"]]
    )

    user_stats = train_df.groupby("user_id").agg(
        user_interaction_count=("rating", "count"),
        user_avg_rating=("rating", "mean"),
        user_rating_std=("rating", lambda s: s.std(ddof=0) if len(s) > 1 else 0.0),
        user_max_timestamp=("timestamp", "max"),
        user_min_timestamp=("timestamp", "min"),
    ).reset_index()

    user_features = user_stats.merge(top_cat, on="user_id", how="left")
    user_features["user_top_category"] = user_features["user_top_category"].fillna("Unknown")

    # 3. Enrich interactions
    max_train_time = train_df["timestamp"].max()

    def enrich(df):
        enr = df.merge(user_features[["user_id", "user_top_category", "user_avg_rating"]], on="user_id", how="left")
        enr = enr.merge(item_features[["item_id", "primary_category", "item_avg_rating", "item_popularity_score"]], on="item_id", how="left")
        enr["user_top_category"] = enr["user_top_category"].fillna("Unknown")
        enr["user_avg_rating"] = enr["user_avg_rating"].fillna(3.0)
        enr["primary_category"] = enr["primary_category"].fillna("Unknown")
        enr["item_avg_rating"] = enr["item_avg_rating"].fillna(3.0)
        enr["item_popularity_score"] = enr["item_popularity_score"].fillna(0.0)

        enr["recency_days"] = np.maximum(0.0, (max_train_time - enr["timestamp"]) / 86400.0)
        enr["category_affinity"] = (enr["user_top_category"] == enr["primary_category"]).astype(float)
        enr["is_positive"] = (enr["rating"] >= 3.5).astype(float)
        return enr

    train_feat = enrich(train_df)
    val_feat = enrich(val_df)
    test_feat = enrich(test_df)

    user_features.to_parquet(feat_dir / "user_features.parquet", index=False)
    item_features.to_parquet(feat_dir / "item_features.parquet", index=False)
    train_feat.to_parquet(feat_dir / "train_features.parquet", index=False)
    val_feat.to_parquet(feat_dir / "val_features.parquet", index=False)
    test_feat.to_parquet(feat_dir / "test_features.parquet", index=False)

    logger.info("Pandas feature pipeline complete: Saved features to %s", feat_dir)
    return {
        "engine": "Pandas/PyArrow",
        "user_features_count": len(user_features),
        "item_features_count": len(item_features),
        "train_interactions_count": len(train_feat),
        "val_interactions_count": len(val_feat),
        "test_interactions_count": len(test_feat),
    }


if __name__ == "__main__":
    res = run_spark_feature_pipeline()
    print("Feature pipeline output:", res)
