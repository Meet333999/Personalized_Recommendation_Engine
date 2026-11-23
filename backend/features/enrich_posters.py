"""
Batch Movie Poster Enricher using OMDB API.
Fetches official Amazon/IMDb CDN poster URLs for all candidate and catalog items.
"""
import os
import json
import time
import logging
import urllib.request
from typing import Dict, Set
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

POSTERS_FILE = "data/processed/movie_posters.json"
LINKS_FILE = "data/raw/ml-latest-small/links.csv"


def fetch_poster_by_imdb_id(imdb_id: str) -> str | None:
    """Fetch poster image URL from OMDB using open educational key."""
    try:
        url = f"https://www.omdbapi.com/?i={imdb_id}&apikey=trilogy"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            poster = data.get("Poster")
            if poster and poster.startswith("http") and poster != "N/A":
                return poster
    except Exception as e:
        logger.debug(f"OMDB lookup failed for {imdb_id}: {e}")
    return None


def enrich_catalog_posters(max_items: int = 500) -> int:
    """Enrich movie_posters.json with posters for all recommendation candidates."""
    if not os.path.exists(LINKS_FILE):
        logger.error(f"Links file {LINKS_FILE} not found.")
        return 0

    links_df = pd.read_csv(LINKS_FILE).set_index("movieId")

    posters: Dict[str, str] = {}
    if os.path.exists(POSTERS_FILE):
        try:
            with open(POSTERS_FILE, "r", encoding="utf-8") as f:
                posters = json.load(f)
        except Exception:
            posters = {}

    from backend.recommendation.pipeline import RecommendationPipeline
    pipeline = RecommendationPipeline()

    target_ids: Set[int] = set()

    # 1. Collect all candidates for test & demo users
    for uid in ["1", "24", "150", "414", "999999"]:
        for cat in [None, "Action", "Comedy", "Drama", "Adventure", "Animation", "Horror", "Sci-Fi", "Thriller"]:
            for model in ["dcn", "wide_and_deep"]:
                try:
                    res = pipeline.recommend(uid, limit=30, category=cat, ranking_model_type=model)
                    for item in res.get("recommendations", []):
                        target_ids.add(int(item["item_id"]))
                except Exception:
                    pass

    # 2. Add top popular items from item features
    item_feat_path = "data/features/item_features.parquet"
    if os.path.exists(item_feat_path):
        item_df = pd.read_parquet(item_feat_path)
        top_items = item_df.sort_values(by="item_interaction_count", ascending=False).head(100)
        for _, row in top_items.iterrows():
            target_ids.add(int(row["item_id"]))

    logger.info(f"Targeting {len(target_ids)} distinct candidate movie IDs. Currently mapped: {len(posters)}")

    added_count = 0
    for mid in target_ids:
        s_mid = str(mid)
        if s_mid in posters and posters[s_mid] and posters[s_mid].startswith("http"):
            continue

        if mid not in links_df.index:
            continue

        imdb_raw = links_df.loc[mid]["imdbId"]
        if pd.isna(imdb_raw):
            continue

        imdb_id = f"tt{str(int(imdb_raw)).zfill(7)}"
        poster_url = fetch_poster_by_imdb_id(imdb_id)
        if poster_url:
            posters[s_mid] = poster_url
            added_count += 1
            if added_count % 10 == 0:
                logger.info(f"Enriched {added_count} new movie posters...")

        # Small polite delay
        time.sleep(0.05)

    os.makedirs(os.path.dirname(POSTERS_FILE), exist_ok=True)
    with open(POSTERS_FILE, "w", encoding="utf-8") as f:
        json.dump(posters, f, indent=2)

    logger.info(f"Finished enrichment! Added {added_count} new posters. Total in catalog: {len(posters)}")
    return added_count


if __name__ == "__main__":
    enrich_catalog_posters()
