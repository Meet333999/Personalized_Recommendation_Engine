"""
Movie Poster Resolution & Fetching Pipeline.
Integrates MovieLens links (tmdbId, imdbId) with pre-cached CDN poster mappings
and provides an automated TMDb API collector.
"""

import os
import json
import logging
import urllib.request
from typing import Dict, Optional
import pandas as pd

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

DEFAULT_POSTERS_PATH = "data/processed/movie_posters.json"
BABU_THOMAS_CSV_URL = "https://raw.githubusercontent.com/babu-thomas/movielens-posters/master/movie_poster.csv"

# Curated official high-resolution TMDb poster URLs for top modern & frequent movies
CURATED_MODERN_POSTERS: Dict[str, str] = {
    # The Matrix (1999)
    "2571": "https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    # Fight Club (1999)
    "2959": "https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    # Gladiator (2000)
    "3578": "https://image.tmdb.org/t/p/w342/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    # The Dark Knight (2008)
    "58559": "https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    # Inception (2010)
    "79132": "https://image.tmdb.org/t/p/w342/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    # Interstellar (2014)
    "109487": "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    # Memento (2000)
    "4226": "https://image.tmdb.org/t/p/w342/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg",
    # Shrek (2001)
    "4306": "https://image.tmdb.org/t/p/w342/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg",
    # Pirates of the Caribbean (2003)
    "6539": "https://image.tmdb.org/t/p/w342/z8onk7LV9Mra67dy575ifbaTKTl.jpg",
    # Lord of the Rings: Fellowship of the Ring (2001)
    "4993": "https://image.tmdb.org/t/p/w342/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
    # Lord of the Rings: The Two Towers (2002)
    "5952": "https://image.tmdb.org/t/p/w342/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg",
    # Lord of the Rings: Return of the King (2003)
    "7153": "https://image.tmdb.org/t/p/w342/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
    # The Departed (2006)
    "48516": "https://image.tmdb.org/t/p/w342/nT97ifVT2J1yMQmeq20Qblg61T.jpg",
    # The Prestige (2006)
    "48780": "https://image.tmdb.org/t/p/w342/tRNVtOQ9IIJst6mpP5A2JzM1Tj.jpg",
    # WALL-E (2008)
    "60069": "https://image.tmdb.org/t/p/w342/hbhFnRzzg6ZDmm8YAmxBnQAcqRs.jpg",
    # Up (2009)
    "68954": "https://image.tmdb.org/t/p/w342/vpbaStTMt8qqgE2daU0rbsYI0.jpg",
    # Avatar (2009)
    "72998": "https://image.tmdb.org/t/p/w342/kyeqWdyUXW608qlYkRqosgbbJyK.jpg",
    # The Avengers (2012)
    "89745": "https://image.tmdb.org/t/p/w342/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
    # Whiplash (2014)
    "112556": "https://image.tmdb.org/t/p/w342/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    # Mad Max: Fury Road (2015)
    "122886": "https://image.tmdb.org/t/p/w342/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
    # Spider-Man: Into the Spider-Verse (2018)
    "193587": "https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
    # Parasite (2019)
    "202439": "https://image.tmdb.org/t/p/w342/7IITTgloJzvGI1TAYymC2Nu8R0U.jpg",
    # Fall, The (2006)
    "59387": "https://image.tmdb.org/t/p/w342/j4q49Uo91dK6Xo7P43rU5Q5p0v.jpg",
}


def build_poster_dictionary(
    output_path: str = DEFAULT_POSTERS_PATH,
    tmdb_api_key: Optional[str] = None,
) -> Dict[str, str]:
    """
    Builds a JSON dictionary of {item_id: poster_url}.
    Merges babu-thomas IMDb CDN dataset + curated top movies + optional TMDb API.
    """
    posters: Dict[str, str] = {}

    # 1. Download babu-thomas open dataset (1,592 movies)
    try:
        logger.info(f"Downloading base poster mapping from {BABU_THOMAS_CSV_URL}...")
        req = urllib.request.Request(BABU_THOMAS_CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8").strip().split("\n")
            for line in content:
                parts = line.split(",", 1)
                if len(parts) == 2:
                    mid, url = parts[0].strip(), parts[1].strip()
                    if mid and url.startswith("http"):
                        posters[mid] = url
        logger.info(f"Loaded {len(posters)} base posters from open repository.")
    except Exception as e:
        logger.warning(f"Could not load open repository posters: {e}")

    # 2. Merge curated modern high-volume movies
    for mid, url in CURATED_MODERN_POSTERS.items():
        posters[mid] = url

    # 3. Optional: TMDb API enrichment if API key provided
    api_key = tmdb_api_key or os.getenv("TMDB_API_KEY")
    if api_key and os.path.exists("data/raw/ml-latest-small/links.csv"):
        logger.info("TMDB_API_KEY detected. Enriching catalog via TMDb API...")
        try:
            links = pd.read_csv("data/raw/ml-latest-small/links.csv")
            for _, row in links.iterrows():
                mid = str(row["movieId"])
                if mid in posters:
                    continue
                tmdb_id = row.get("tmdbId")
                if pd.isna(tmdb_id):
                    continue
                try:
                    url = f"https://api.themoviedb.org/3/movie/{int(tmdb_id)}?api_key={api_key}"
                    req = urllib.request.Request(url, headers={"User-Agent": "RecommendationEngine/1.0"})
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode())
                        poster_path = data.get("poster_path")
                        if poster_path:
                            posters[mid] = f"https://image.tmdb.org/t/p/w342{poster_path}"
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"TMDb API enrichment encountered error: {e}")

    # Ensure parent dir exists and save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(posters, f, indent=2)

    logger.info(f"Saved {len(posters)} movie posters to {output_path}")
    return posters


def load_movie_posters(posters_path: str = DEFAULT_POSTERS_PATH) -> Dict[str, str]:
    """Load pre-cached movie posters dictionary."""
    if os.path.exists(posters_path):
        try:
            with open(posters_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load {posters_path}: {e}")
    return {}


if __name__ == "__main__":
    build_poster_dictionary()
