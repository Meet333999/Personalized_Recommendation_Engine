"""
FastAPI Routes: User Explorer & Analytics.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
import pandas as pd

from backend.config.config import settings
from backend.api.schemas.api_schemas import (
    UserProfileResponse,
    UserHistoryResponse,
    UserHistoryItem,
    UserPreferencesResponse,
)

router = APIRouter(prefix="/users", tags=["Users"])


def _get_user_features() -> pd.DataFrame:
    path = settings.DATA_FEATURES_DIR / "user_features.parquet"
    if not path.exists():
        raise HTTPException(status_code=404, detail="User feature store not generated yet.")
    return pd.read_parquet(path)


def _get_interactions() -> pd.DataFrame:
    path = settings.DATA_FEATURES_DIR / "train_features.parquet"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Interaction features not found.")
    return pd.read_parquet(path)


def _get_items() -> pd.DataFrame:
    path = settings.DATA_FEATURES_DIR / "item_features.parquet"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Item catalog not found.")
    return pd.read_parquet(path)


@router.get("/{user_id}", response_model=UserProfileResponse)
def get_user_profile(user_id: str):
    """Retrieve user interaction statistics and profile."""
    users_df = _get_user_features()
    user_row = users_df[users_df["user_id"] == str(user_id)]

    if user_row.empty:
        # Cold start user profile
        return UserProfileResponse(
            user_id=str(user_id),
            interaction_count=0,
            average_rating=3.0,
            rating_std=0.0,
            top_preferred_category="Unknown (Cold Start)",
        )

    row = user_row.iloc[0]
    return UserProfileResponse(
        user_id=str(row["user_id"]),
        interaction_count=int(row.get("user_interaction_count", 0)),
        average_rating=round(float(row.get("user_avg_rating", 3.0)), 2),
        rating_std=round(float(row.get("user_rating_std", 0.0)), 2),
        top_preferred_category=str(row.get("user_top_category", "Unknown")),
        first_seen=int(row.get("user_min_timestamp", 0)) if "user_min_timestamp" in row else None,
        last_seen=int(row.get("user_max_timestamp", 0)) if "user_max_timestamp" in row else None,
    )


@router.get("/{user_id}/history", response_model=UserHistoryResponse)
def get_user_history(user_id: str, limit: int = 20):
    """Retrieve chronological interaction history for a user."""
    interactions_df = _get_interactions()
    items_df = _get_items().set_index("item_id")

    user_ints = (
        interactions_df[interactions_df["user_id"] == str(user_id)]
        .sort_values(by="timestamp", ascending=False)
        .head(limit)
    )

    history_items = []
    for _, row in user_ints.iterrows():
        i_id = str(row["item_id"])
        item_title = f"Item {i_id}"
        item_cat = "Unknown"
        if i_id in items_df.index:
            meta = items_df.loc[i_id]
            item_title = str(meta.get("title", item_title))
            item_cat = str(meta.get("primary_category", item_cat))

        history_items.append(
            UserHistoryItem(
                item_id=i_id,
                title=item_title,
                primary_category=item_cat,
                rating=float(row.get("rating", 3.0)),
                timestamp=int(row.get("timestamp", 0)),
                recency_days=round(float(row.get("recency_days", 0.0)), 1),
            )
        )

    return UserHistoryResponse(
        user_id=str(user_id),
        total_interactions=len(user_ints),
        history=history_items,
    )


@router.get("/{user_id}/preferences", response_model=UserPreferencesResponse)
def get_user_preferences(user_id: str):
    """Retrieve inferred category affinities and engagement metrics."""
    interactions_df = _get_interactions()
    items_df = _get_items().set_index("item_id")

    user_ints = interactions_df[interactions_df["user_id"] == str(user_id)]
    if user_ints.empty:
        return UserPreferencesResponse(
            user_id=str(user_id),
            top_category="Unknown",
            category_affinity_breakdown={},
            avg_rating_given=3.0,
            engagement_level="Cold Start",
        )

    # Calculate category counts
    cats = []
    for _, r in user_ints.iterrows():
        iid = str(r["item_id"])
        if iid in items_df.index:
            cats.append(str(items_df.loc[iid].get("primary_category", "Unknown")))
        else:
            cats.append("Unknown")

    cat_series = pd.Series(cats).value_counts(normalize=True)
    top_cat = cat_series.index[0] if not cat_series.empty else "Unknown"

    affinity_dict = {str(k): round(float(v), 3) for k, v in cat_series.head(5).items()}
    avg_r = float(user_ints["rating"].mean())
    n_count = len(user_ints)
    eng_level = "High" if n_count > 100 else ("Medium" if n_count > 30 else "Low")

    return UserPreferencesResponse(
        user_id=str(user_id),
        top_category=top_cat,
        category_affinity_breakdown=affinity_dict,
        avg_rating_given=round(avg_r, 2),
        engagement_level=eng_level,
    )
