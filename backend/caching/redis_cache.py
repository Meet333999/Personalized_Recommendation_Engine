"""
Redis Caching Layer with Resilient In-Memory Fallback.
Caches recommendations, user embeddings, item metadata, and popularity statistics.
Tracks hit/miss metrics and provides cache invalidation capabilities.
"""
import json
import logging
import time
from typing import Dict, Any, Optional, List, Union
import redis
from backend.config.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class InMemoryCache:
    """Thread-safe in-memory cache with TTL expiration for fallback when Redis is offline."""

    def __init__(self):
        self._store: Dict[str, Tuple[str, float]] = {}

    def get(self, key: str) -> Optional[str]:
        if key in self._store:
            val, expiry = self._store[key]
            if expiry == 0 or time.time() < expiry:
                return val
            del self._store[key]
        return None

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        expiry = time.time() + ex if ex else 0
        self._store[key] = (value, expiry)
        return True

    def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self._store:
                del self._store[k]
                count += 1
        return count

    def flushdb(self) -> bool:
        self._store.clear()
        return True

    def keys(self, pattern: str = "*") -> List[str]:
        now = time.time()
        # Clean expired
        expired = [k for k, (_, exp) in self._store.items() if exp != 0 and now >= exp]
        for k in expired:
            del self._store[k]
        return list(self._store.keys())


class RedisCacheService:
    """Production Redis caching service with automatic health monitoring and in-memory fallback."""

    def __init__(self):
        self.host = settings.REDIS_HOST
        self.port = settings.REDIS_PORT
        self.db = settings.REDIS_DB
        self.password = settings.REDIS_PASSWORD
        self.default_ttl = settings.CACHE_TTL_SECONDS

        self.client = None
        self.is_connected = False
        self.backend = "in-memory"

        self.hits = 0
        self.misses = 0

        self._in_memory = InMemoryCache()
        self.connect()

    def connect(self) -> bool:
        """Attempt to connect to Redis server; gracefully fallback if unavailable."""
        try:
            client = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                password=self.password,
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
            )
            client.ping()
            self.client = client
            self.is_connected = True
            self.backend = "redis"
            logger.info("Connected to Redis at %s:%d (db=%d)", self.host, self.port, self.db)
            return True
        except Exception as e:
            self.is_connected = False
            self.client = None
            self.backend = "in-memory"
            logger.info("Redis not available on %s:%d (%s). Operating in-memory cache fallback.", self.host, self.port, e)
            return False

    def _get_raw(self, key: str) -> Optional[str]:
        if self.is_connected and self.client:
            try:
                return self.client.get(key)
            except Exception:
                self.is_connected = False
                return self._in_memory.get(key)
        return self._in_memory.get(key)

    def _set_raw(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        ttl = ttl if ttl is not None else self.default_ttl
        if self.is_connected and self.client:
            try:
                return bool(self.client.set(key, value, ex=ttl))
            except Exception:
                self.is_connected = False
                return self._in_memory.set(key, value, ex=ttl)
        return self._in_memory.set(key, value, ex=ttl)

    # 1. Recommendation Caching
    def get_recommendations(
        self,
        user_id: str,
        limit: int,
        category: Optional[str] = None,
        exclude_watched: bool = True,
    ) -> Optional[List[Dict[str, Any]]]:
        cat_key = category or "all"
        key = f"rec:{user_id}:lim_{limit}:cat_{cat_key}:ex_{exclude_watched}"
        raw = self._get_raw(key)
        if raw is not None:
            self.hits += 1
            return json.loads(raw)
        self.misses += 1
        return None

    def set_recommendations(
        self,
        user_id: str,
        limit: int,
        recommendations: List[Dict[str, Any]],
        category: Optional[str] = None,
        exclude_watched: bool = True,
        ttl: Optional[int] = None,
    ) -> bool:
        cat_key = category or "all"
        key = f"rec:{user_id}:lim_{limit}:cat_{cat_key}:ex_{exclude_watched}"
        return self._set_raw(key, json.dumps(recommendations), ttl=ttl)

    # 2. User Embedding Caching
    def get_user_embedding(self, user_id: str) -> Optional[List[float]]:
        key = f"emb:user:{user_id}"
        raw = self._get_raw(key)
        if raw is not None:
            self.hits += 1
            return json.loads(raw)
        self.misses += 1
        return None

    def set_user_embedding(self, user_id: str, embedding: List[float], ttl: int = 600) -> bool:
        key = f"emb:user:{user_id}"
        return self._set_raw(key, json.dumps(embedding), ttl=ttl)

    # 3. Item Metadata Caching
    def get_item_metadata(self, item_id: str) -> Optional[Dict[str, Any]]:
        key = f"meta:item:{item_id}"
        raw = self._get_raw(key)
        if raw is not None:
            self.hits += 1
            return json.loads(raw)
        self.misses += 1
        return None

    def set_item_metadata(self, item_id: str, metadata: Dict[str, Any], ttl: int = 3600) -> bool:
        key = f"meta:item:{item_id}"
        return self._set_raw(key, json.dumps(metadata), ttl=ttl)

    # 4. Cache Management & Stats
    def clear_all(self) -> bool:
        """Clear all recommendation cache keys."""
        logger.info("Clearing cache keys across engine...")
        if self.is_connected and self.client:
            try:
                self.client.flushdb()
            except Exception:
                pass
        self._in_memory.flushdb()
        return True

    def get_stats(self) -> Dict[str, Any]:
        """Return cache health metrics and hit ratios."""
        total_requests = self.hits + self.misses
        hit_ratio = round((self.hits / total_requests) * 100, 2) if total_requests > 0 else 0.0
        return {
            "status": "connected" if self.is_connected else "in-memory-fallback",
            "backend": self.backend,
            "host": self.host if self.is_connected else "local-process",
            "port": self.port if self.is_connected else 0,
            "hits": self.hits,
            "misses": self.misses,
            "total_requests": total_requests,
            "hit_ratio_percent": hit_ratio,
        }


# Global singleton instance
cache_service = RedisCacheService()
