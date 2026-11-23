"""
FastAPI Routes: Item Explorer & Metadata.
"""
from fastapi import APIRouter, HTTPException
import pandas as pd
from backend.config.config import settings
from backend.api.schemas.api_schemas import ItemDetailResponse
from backend.features.fetch_movie_posters import load_movie_posters
from backend.features.fetch_movie_descriptions import load_movie_descriptions

router = APIRouter(prefix="/items", tags=["Items"])
posters_map = load_movie_posters()
descriptions_map = load_movie_descriptions()


@router.get("/{item_id}", response_model=ItemDetailResponse)
def get_item_detail(item_id: str):
    """Retrieve metadata, categories, and popularity for an item."""
    path = settings.DATA_FEATURES_DIR / "item_features.parquet"
    if not path.exists():
        path = settings.DATA_PROCESSED_DIR / "items.parquet"

    if not path.exists():
        raise HTTPException(status_code=404, detail="Item catalog not found.")

    items_df = pd.read_parquet(path)
    item_row = items_df[items_df["item_id"] == str(item_id)]

    if item_row.empty:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found in catalog.")

    row = item_row.iloc[0]
    prim_cat = str(row.get("primary_category", "Unknown"))
    cat_str = str(row.get("categories_str", prim_cat))

    return ItemDetailResponse(
        item_id=str(row["item_id"]),
        title=str(row.get("title", f"Item {row['item_id']}")),
        primary_category=prim_cat,
        categories=cat_str.split("|"),
        release_year=int(row.get("release_year", 2000)),
        average_rating=round(float(row.get("item_avg_rating", 3.0)), 2),
        interaction_count=int(row.get("item_interaction_count", 0)),
        popularity_score=round(float(row.get("item_popularity_score", 0.0)), 3),
        poster_url=posters_map.get(str(row["item_id"])),
        description=descriptions_map.get(str(row["item_id"])),
    )
