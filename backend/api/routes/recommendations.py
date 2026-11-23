"""
FastAPI Routes: Personalized Recommendations.
"""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from backend.recommendation.pipeline import recommendation_pipeline
from backend.api.schemas.api_schemas import RecommendationResponse

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/{user_id}", response_model=RecommendationResponse)
def get_recommendations(
    user_id: str,
    limit: int = Query(10, ge=1, le=100, description="Number of recommendations to return"),
    category: Optional[str] = Query(None, description="Optional genre or category filter"),
    exclude_watched: bool = Query(True, description="Whether to exclude items previously interacted with"),
    model: str = Query("dcn", regex="^(dcn|wide_and_deep)$", description="Ranking model architecture ('dcn' or 'wide_and_deep')"),
):
    """Generate personalized recommendations via Two-Tower retrieval and Deep Ranking."""
    try:
        response = recommendation_pipeline.recommend(
            user_id=user_id,
            limit=limit,
            category=category,
            exclude_watched=exclude_watched,
            ranking_model_type=model,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failure: {str(e)}")
