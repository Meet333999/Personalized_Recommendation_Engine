"""
Pydantic Schemas for FastAPI Request and Response Validation.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    models: Dict[str, Any]
    vector_search: Dict[str, Any]
    cache: Dict[str, Any]
    serving: Dict[str, Any]


class RecommendationItem(BaseModel):
    item_id: str
    title: str
    primary_category: str
    categories: List[str]
    release_year: int
    average_rating: float
    interaction_count: int
    popularity_score: float
    retrieval_score: float
    ranking_score: float
    strategy: str
    reason: Optional[str] = None
    rank: int
    poster_url: Optional[str] = None
    description: Optional[str] = None


class RecommendationResponse(BaseModel):
    user_id: str
    strategy: str
    cached: bool
    total_processing_ms: float
    retrieval_stage: Dict[str, Any]
    ranking_stage: Dict[str, Any]
    recommendations: List[RecommendationItem]


class UserProfileResponse(BaseModel):
    user_id: str
    interaction_count: int
    average_rating: float
    rating_std: float
    top_preferred_category: str
    first_seen: Optional[int] = None
    last_seen: Optional[int] = None


class UserHistoryItem(BaseModel):
    item_id: str
    title: str
    primary_category: str
    rating: float
    timestamp: int
    recency_days: float
    poster_url: Optional[str] = None


class UserHistoryResponse(BaseModel):
    user_id: str
    total_interactions: int
    history: List[UserHistoryItem]


class UserPreferencesResponse(BaseModel):
    user_id: str
    top_category: str
    category_affinity_breakdown: Dict[str, float]
    avg_rating_given: float
    engagement_level: str


class ItemDetailResponse(BaseModel):
    item_id: str
    title: str
    primary_category: str
    categories: List[str]
    release_year: int
    average_rating: float
    interaction_count: int
    popularity_score: float
    poster_url: Optional[str] = None
    description: Optional[str] = None


class PopularItem(BaseModel):
    item_id: str
    title: str
    primary_category: str
    rating_count: int
    average_rating: float
    poster_url: Optional[str] = None


class PopularCategory(BaseModel):
    category: str
    item_count: int
    total_interactions: int


class OverviewAnalyticsResponse(BaseModel):
    total_users: int
    total_items: int
    total_interactions: int
    average_interactions_per_user: float
    most_popular_items: List[PopularItem]
    most_popular_categories: List[PopularCategory]


class RecommendationAnalyticsResponse(BaseModel):
    cache_hits: int
    cache_misses: int
    cache_hit_ratio_percent: float
    avg_pipeline_latency_ms: float
    retrieval_model: str
    ranking_models_active: List[str]


class ModelStatusResponse(BaseModel):
    retrieval_model: Dict[str, Any]
    ranking_models: Dict[str, Any]
    faiss_index: Dict[str, Any]
    serving_mode: str
    last_trained: Optional[str] = None


class AdminActionResponse(BaseModel):
    status: str
    message: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None
