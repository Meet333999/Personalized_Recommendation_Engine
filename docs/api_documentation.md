# API Documentation

The recommendation platform exposes full RESTful endpoints via FastAPI. Live OpenAPI interactive documentation is accessible at `http://localhost:8000/docs`.

---

## 1. System Health

### `GET /api/health`
Returns the status of vector search, models, cache, and inference engine.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-23T02:26:17Z",
  "models": {
    "retrieval_ready": true,
    "ranking_ready": true
  },
  "vector_search": {
    "loaded": true,
    "total_items": 9742,
    "embedding_dim": 64,
    "index_type": "IndexFlatIP"
  },
  "cache": {
    "status": "in-memory-fallback",
    "backend": "in-memory",
    "hits": 14,
    "misses": 5,
    "hit_ratio_percent": 73.68
  },
  "serving": {
    "serving_mode": "local_fallback",
    "triton_connected": false
  }
}
```

---

## 2. Recommendations

### `GET /api/recommendations/{user_id}`
Generates two-stage personalized recommendations for a given user.

**Parameters:**
- `user_id` (path, string): Unique user ID (e.g. `"1"` or unobserved user `"999999"`).
- `limit` (query, int, default: `10`): Number of recommendations to return.
- `category` (query, string, optional): Genre/category filter (e.g. `"Comedy"`, `"Action"`).
- `exclude_watched` (query, bool, default: `true`): Exclude previously rated items.
- `model` (query, string, default: `"dcn"`): Ranking model architecture (`"dcn"` or `"wide_and_deep"`).

**Response (200 OK):**
```json
{
  "user_id": "1",
  "strategy": "two_stage_dcn",
  "cached": false,
  "total_processing_ms": 14.8,
  "retrieval_stage": {
    "retrieved_count": 100,
    "filtered_count": 82,
    "latency_ms": 2.1
  },
  "ranking_stage": {
    "ranked_count": 82,
    "model": "dcn",
    "latency_ms": 11.2
  },
  "recommendations": [
    {
      "item_id": "260",
      "title": "Star Wars: Episode IV - A New Hope (1977)",
      "primary_category": "Action",
      "categories": ["Action", "Adventure", "Sci-Fi"],
      "release_year": 1977,
      "average_rating": 4.23,
      "interaction_count": 251,
      "popularity_score": 0.892,
      "retrieval_score": 0.9412,
      "ranking_score": 0.9854,
      "strategy": "two_stage_dcn",
      "rank": 1
    }
  ]
}
```

---

## 3. User & Item Explorer

### `GET /api/users/{user_id}`
Returns profile interaction metrics for a given user.

### `GET /api/users/{user_id}/history`
Returns chronological interaction history for a given user.

### `GET /api/users/{user_id}/preferences`
Returns inferred category affinities and engagement classification.

### `GET /api/items/{item_id}`
Returns item metadata, category list, rating count, and popularity score.

---

## 4. Analytics & Models

### `GET /api/analytics/overview`
Macro analytics: total users, items, interactions, popular categories, and top items.

### `GET /api/analytics/recommendations`
Recommendation system operational KPIs, hit ratios, and latencies.

### `GET /api/models/status`
Architecture specifications, vocabulary sizes, and training losses.

### `GET /api/models/metrics`
Offline A/B testing benchmark report comparing DCN-v2 vs Wide & Deep.

---

## 5. Administration

### `POST /api/admin/retrain`
Asynchronously triggers the 12-stage retraining workflow.

### `POST /api/admin/cache/clear`
Flushes recommendation caches across Redis and in-memory stores.
