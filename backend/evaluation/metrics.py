"""
Evaluation Metrics for Retrieval, Ranking, and Full Catalog Recommendation.
Calculates NDCG@K, Recall@K, Precision@K, MAP@K, Catalog Coverage, Diversity, Novelty, and Gini Coefficient.
"""
import numpy as np
from typing import List, Set, Dict, Any


def compute_recall_at_k(actual: Set[str], predicted: List[str], k: int = 10) -> float:
    """Recall@K = |actual items in top K| / |actual items|."""
    if not actual:
        return 0.0
    pred_k = set(predicted[:k])
    hits = len(actual.intersection(pred_k))
    return float(hits / len(actual))


def compute_precision_at_k(actual: Set[str], predicted: List[str], k: int = 10) -> float:
    """Precision@K = |actual items in top K| / K."""
    if k <= 0:
        return 0.0
    pred_k = set(predicted[:k])
    hits = len(actual.intersection(pred_k))
    return float(hits / k)


def compute_ndcg_at_k(actual: Set[str], predicted: List[str], k: int = 10) -> float:
    """Normalized Discounted Cumulative Gain at K (binary relevance)."""
    if not actual:
        return 0.0

    dcg = 0.0
    for idx, item in enumerate(predicted[:k], start=1):
        if item in actual:
            dcg += 1.0 / np.log2(idx + 1)

    idcg = sum(1.0 / np.log2(i + 1) for i in range(1, min(len(actual), k) + 1))
    return float(dcg / idcg) if idcg > 0 else 0.0


def compute_map_at_k(actual: Set[str], predicted: List[str], k: int = 10) -> float:
    """Mean Average Precision at K."""
    if not actual:
        return 0.0

    score = 0.0
    num_hits = 0.0
    for idx, item in enumerate(predicted[:k], start=1):
        if item in actual:
            num_hits += 1.0
            score += num_hits / idx

    return float(score / min(len(actual), k)) if min(len(actual), k) > 0 else 0.0


def compute_catalog_coverage(all_recommended_items: Set[str], total_catalog_items: int) -> float:
    """Catalog Coverage = |unique items recommended across all users| / |total catalog|."""
    if total_catalog_items <= 0:
        return 0.0
    return float(len(all_recommended_items) / total_catalog_items)


def compute_novelty(
    recommended_items: List[str], item_popularity_probs: Dict[str, float], k: int = 10
) -> float:
    """Novelty: Average self-information -log2(p(i)) of recommended items."""
    recs = recommended_items[:k]
    if not recs:
        return 0.0

    self_info = []
    for item in recs:
        p = item_popularity_probs.get(item, 1e-5)
        self_info.append(-np.log2(max(p, 1e-6)))

    return float(np.mean(self_info))


def compute_diversity(
    recommended_items: List[str], item_categories: Dict[str, Set[str]], k: int = 10
) -> float:
    """Intra-List Diversity: 1 - average pairwise Jaccard similarity of item categories."""
    recs = recommended_items[:k]
    if len(recs) <= 1:
        return 0.0

    similarities = []
    for i in range(len(recs)):
        for j in range(i + 1, len(recs)):
            cat_i = item_categories.get(recs[i], set())
            cat_j = item_categories.get(recs[j], set())
            union = len(cat_i.union(cat_j))
            if union == 0:
                sim = 1.0
            else:
                sim = len(cat_i.intersection(cat_j)) / union
            similarities.append(sim)

    return float(1.0 - np.mean(similarities)) if similarities else 0.0


def compute_gini_coefficient(item_recommendation_counts: List[int]) -> float:
    """Gini coefficient measuring popularity skew in recommendations (0 = equal, 1 = maximum skew)."""
    if not item_recommendation_counts or len(item_recommendation_counts) < 2:
        return 0.0

    arr = np.array(sorted(item_recommendation_counts), dtype=np.float64)
    n = len(arr)
    index = np.arange(1, n + 1)
    return float(((2 * np.sum(index * arr)) / (n * np.sum(arr))) - ((n + 1) / n))
