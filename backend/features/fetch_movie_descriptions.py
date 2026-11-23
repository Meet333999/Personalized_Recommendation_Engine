"""
Movie Descriptions & Synopses Fetcher and Cache.
Fetches concise movie plots from OMDB API and provides fallback contextual synopses.
"""
import os
import json
import time
import logging
import urllib.request
from typing import Dict, Optional, Set
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DESCRIPTIONS_FILE = "data/processed/movie_descriptions.json"
LINKS_FILE = "data/raw/ml-latest-small/links.csv"
ITEM_FEATURES_FILE = "data/features/item_features.parquet"


def generate_fallback_synopsis(title: str, genres: str, year: int, avg_rating: float = 3.5) -> str:
    """Generate a clean, professional contextual synopsis if no plot is available."""
    clean_title = title.split("(")[0].strip() if "(" in title else title
    cats = [c.strip() for c in genres.replace("|", ", ").split(", ") if c.strip()]
    genre_text = " and ".join(cats[:2]) if len(cats) >= 2 else (cats[0] if cats else "Cinema")
    
    if avg_rating >= 4.0:
        tone = "Acclaimed by critics and audiences alike"
    elif avg_rating >= 3.5:
        tone = "A well-regarded catalog favorite"
    else:
        tone = "An engaging genre exploration"
        
    return f"{tone}, this {year} {genre_text} release follows {clean_title} through compelling characters, striking visual atmosphere, and memorable narrative pacing."


def fetch_plot_from_omdb(imdb_id: str) -> Optional[str]:
    """Fetch official plot synopsis from OMDB API."""
    try:
        url = f"https://www.omdbapi.com/?i={imdb_id}&apikey=trilogy"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            plot = data.get("Plot")
            if plot and plot != "N/A" and len(plot.strip()) > 10:
                return plot.strip()
    except Exception as e:
        logger.debug(f"OMDB lookup failed for {imdb_id}: {e}")
    return None


def load_movie_descriptions(file_path: str = DESCRIPTIONS_FILE) -> Dict[str, str]:
    """Load cached movie descriptions dictionary."""
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load {file_path}: {e}")
    return {}


def build_descriptions_cache(max_fetch: int = 400) -> Dict[str, str]:
    """Build and enrich movie_descriptions.json for all candidates and top catalog movies."""
    descriptions: Dict[str, str] = load_movie_descriptions()
    
    if not os.path.exists(LINKS_FILE):
        logger.error(f"Links file {LINKS_FILE} not found.")
        return descriptions

    links_df = pd.read_csv(LINKS_FILE).set_index("movieId")
    
    target_ids: Set[int] = set()
    
    # 1. Pipeline recommendations for demo users
    try:
        from backend.recommendation.pipeline import RecommendationPipeline
        pipeline = RecommendationPipeline()
        for uid in ["1", "24", "150", "414", "999999"]:
            for cat in [None, "Action", "Comedy", "Drama", "Adventure", "Animation", "Sci-Fi", "Thriller"]:
                for m in ["dcn", "wide_and_deep"]:
                    try:
                        res = pipeline.recommend(uid, limit=20, category=cat, ranking_model_type=m)
                        for it in res.get("recommendations", []):
                            target_ids.add(int(it["item_id"]))
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"Could not extract pipeline targets: {e}")

    # 2. Add top 100 high volume items
    if os.path.exists(ITEM_FEATURES_FILE):
        try:
            item_df = pd.read_parquet(ITEM_FEATURES_FILE)
            for _, r in item_df.sort_values(by="item_interaction_count", ascending=False).head(100).iterrows():
                target_ids.add(int(r["item_id"]))
        except Exception as e:
            logger.warning(f"Could not load item features: {e}")

    logger.info(f"Targeting {len(target_ids)} items for description enrichment. Already cached: {len(descriptions)}")
    
    fetched = 0
    for mid in target_ids:
        s_mid = str(mid)
        if s_mid in descriptions and descriptions[s_mid]:
            continue

        plot: Optional[str] = None
        if mid in links_df.index:
            raw_imdb = links_df.loc[mid]["imdbId"]
            if pd.notna(raw_imdb):
                imdb_id = f"tt{str(int(raw_imdb)).zfill(7)}"
                plot = fetch_plot_from_omdb(imdb_id)
                time.sleep(0.04)

        if not plot and os.path.exists(ITEM_FEATURES_FILE):
            # Fallback to high-quality contextual synopsis
            try:
                item_df = pd.read_parquet(ITEM_FEATURES_FILE).set_index("item_id")
                if s_mid in item_df.index:
                    row = item_df.loc[s_mid]
                    plot = generate_fallback_synopsis(
                        title=str(row.get("title", f"Movie {mid}")),
                        genres=str(row.get("genres", "Drama")),
                        year=int(row.get("release_year", 2000)),
                        avg_rating=float(row.get("item_avg_rating", 3.5)),
                    )
            except Exception:
                pass

        if plot:
            descriptions[s_mid] = plot
            fetched += 1
            if fetched % 15 == 0:
                logger.info(f"Enriched {fetched} descriptions...")

    os.makedirs(os.path.dirname(DESCRIPTIONS_FILE), exist_ok=True)
    with open(DESCRIPTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(descriptions, f, indent=2)

    logger.info(f"Saved {len(descriptions)} descriptions to {DESCRIPTIONS_FILE}")
    return descriptions


if __name__ == "__main__":
    build_descriptions_cache()
