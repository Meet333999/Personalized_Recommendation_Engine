# Large-Scale Personalized Recommendation Engine

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16.2-orange.svg)](https://www.tensorflow.org/)
[![TFRS](https://img.shields.io/badge/TFRS-0.7.7-red.svg)](https://www.tensorflow.org/recommenders)
[![PySpark](https://img.shields.io/badge/Apache%20Spark-3.5.3-E25A1C.svg)](https://spark.apache.org/)
[![FAISS](https://img.shields.io/badge/FAISS-CPU%201.9.0-blueviolet.svg)](https://github.com/facebookresearch/faiss)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passing-brightgreen.svg)](tests/)

A production-grade, two-stage personalized recommendation engine designed in the architecture of modern industrial systems used by **Netflix**, **Amazon**, and **YouTube**. Built with an end-to-end machine learning engineering workflow, including data ingestion, temporal splitting, Spark feature engineering, Two-Tower neural candidate retrieval, FAISS vector indexing, Deep & Cross Network (DCN-v2) ranking, Redis caching, Triton model repository specifications, an Airflow orchestration DAG, and a React + TypeScript analytics dashboard.

---

## 1. Project Overview
This project is an end-to-end AI/ML systems implementation rather than a prototype or demonstration. It trains real neural networks on genuine interaction data, stores feature tables in optimized Parquet files via Apache Spark, performs sub-millisecond vector similarity search via FAISS, re-ranks retrieved candidates via a Deep & Cross Network (DCN-v2), caches recommendation responses in Redis, serves real-time REST endpoints via FastAPI, and presents insights via a modern dashboard.

---

## 2. Problem Statement
Modern platforms manage catalogs with tens of thousands to millions of items and hundreds of thousands of active users. Scoring every catalog item with complex deep learning models for every user request violates the $< 50$ms production latency budget. Conversely, lightweight linear models fail to model complex non-linear feature interactions and suffer from cold-start degradation.

---

## 3. Objectives
- **Decoupled Architecture**: Candidate Retrieval (sub-millisecond) + Deep Candidate Ranking (calibrated scoring).
- **Prevent Future Data Leakage**: Enforce chronological temporal splitting across interactions.
- **Scalable Data Processing**: PySpark feature pipelines generating Parquet feature stores.
- **Real-Time Vector Similarity Search**: High-performance FAISS inner-product index.
- **Deep Feature Interaction Modeling**: Deep & Cross Network (DCN-v2) and Wide & Deep architectures.
- **Resilient Infrastructure**: Redis caching with graceful in-memory fallback, and Triton client with local TensorFlow inference fallback.
- **Rigorous Evaluation**: Multi-faceted evaluation including NDCG@10, Precision@10, MAP@10, Diversity, Novelty, and offline A/B testing.

---

## 4. System Architecture
```
                               [ User Request ]
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   Redis Caching Layer     │──(Cache Hit < 2ms)──► [ Fast Response ]
                        │  (Key: rec:{u}:{k}:{cat}) │
                        └───────────────────────────┘
                                      │ Cache Miss
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: CANDIDATE RETRIEVAL                                                           │
│                                                                                        │
│   [ User Profile & History ]                                                           │
│               │                                                                        │
│               ▼                                                                        │
│       [ User Tower MLP ]                                                               │
│               │                                                                        │
│               ▼                                                                        │
│   User Embedding: 64-dim ────────► [ FAISS IndexFlatIP (9,742 Catalog Embeddings) ]    │
│                                                        │                               │
│                                                        ▼                               │
│                                           Top 100 Retrieved Candidates                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FEATURE ENRICHMENT (PySpark & Parquet Feature Store)                                  │
│ - Join candidates with User Features (avg rating, interaction count, preferred genre) │
│ - Join with Item Features (popularity score, Bayesian rating, genres, release year)    │
│ - Compute Interaction Features (category affinity, recency days, retrieval score)      │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: DEEP CANDIDATE RANKING (DCN-v2 / Wide & Deep)                                 │
│                                                                                        │
│   [ Explicit Polynomial Cross Network ]      [ Deep Feedforward MLP Stream ]           │
│                    │                                        │                          │
│                    └───────────────────┬────────────────────┘                          │
│                                        ▼                                               │
│                         [ Staged Cross-Deep Fusion Head ]                              │
│                                        │                                               │
│                                        ▼                                               │
│                       Predicted Relevance Probability P(y=1)                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ COLD-START & HYBRID FALLBACK SAFEGUARD                                                 │
│ - New users: Bayesian smoothed global popularity + onboarding category affinities      │
│ - Sparse candidates: Hybrid candidate blending                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        [ Final Top-N Recommendations ]
                                      │
                                      ▼
                       [ Store to Redis (TTL 300s) ]
                                      │
                                      ▼
                      [ FastAPI JSON API & React UI ]
```

---

## 5. Technology Stack
- **Deep Learning**: Python 3.11, TensorFlow 2.16.2, TensorFlow Recommenders (TFRS 0.7.7), Keras 2 / `tf-keras`.
- **Vector Search**: Facebook AI Similarity Search (`faiss-cpu 1.9.0`).
- **Data Engineering**: Apache Spark (`pyspark 3.5.3`), `pyarrow 17.0.0`, `pandas 2.2.0`, `scikit-learn 1.9.1`.
- **Caching**: Redis 7.0, `redis-py 5.2.0`, `fakeredis 2.26.1`.
- **Serving & API**: FastAPI 0.115.0, Uvicorn 0.32.0, Pydantic 2.14.3, Triton Client 2.47.0.
- **Frontend Dashboard**: Node.js v22, React 18, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons.
- **Orchestration**: Apache Airflow DAG (`recommendation_retraining_dag.py`) + standalone Python DAG executor.
- **Containerization & CI**: Docker, Docker Compose, Pytest.

---

## 6. Dataset Information
The system is built on **MovieLens** as the primary benchmark dataset and includes built-in ingestion adapters for:
1. **MovieLens 25M / Latest Small** (GroupLens) — Primary default.
2. **Amazon Reviews 2023** (McAuley Lab / Hugging Face).
3. **Yelp Open Dataset**.
4. **H&M Personalized Fashion Recommendations** (Kaggle).
5. **Goodreads-10k**.
6. **Last.fm 1K Users**.

The factory pattern in `backend/features/preprocessing.py` allows selecting any supported dataset via configuration (`DEFAULT_DATASET=movielens`).

---

## 7. Data Preprocessing & Temporal Splitting
### Strict Temporal Splitting (No Data Leakage)
In industrial recommendation systems, splitting interactions at random leaks future user preferences into the training set. We sort all interactions chronologically by `timestamp`:
- **Training Set (80%)**: $T \in [828124615, 1458635162]$ (80,668 interactions).
- **Validation Set (10%)**: $T \in [1458635171, 1498029445]$ (10,084 interactions).
- **Test Holdout (10%)**: $T \in [1498029450, 1537799250]$ (10,084 interactions).

Temporal integrity assertions verify that:
$$\max(T_{\text{train}}) \le \min(T_{\text{val}}) \le \max(T_{\text{val}}) \le \min(T_{\text{test}})$$

---

## 8. Two-Stage Recommendation Methodology
1. **Stage 1 (Retrieval)**: Fast vector search across $N=9,742$ catalog items reduces the candidate space to top $K=100$.
2. **Stage 2 (Ranking)**: Deep neural scoring evaluates candidate features and ranks them with precision, selecting top $N=10$.

---

## 9. Two-Tower Retrieval Architecture
- **User Tower**: Maps sparse `user_id` and preferred genre embeddings, combined with normalized user activity signals, through a 3-layer MLP into a 64-dimensional $L_2$-normalized vector.
- **Item Tower**: Maps sparse `item_id` and primary genre embeddings, combined with log-normalized item popularity, into the same 64-dimensional metric space.
- **In-Batch Negatives**: Pairs users and items in a batch matrix ($B \times B$), treating diagonal entries as positives and off-diagonals as sampled negatives.
- **Training Results**: Loss decreased from **5.5048** to **4.5458** over 10 epochs.

---

## 10. FAISS Implementation
- Precomputed 64-dimensional embeddings for all 9,742 items are stored in a `faiss.IndexFlatIP` index.
- Inner product calculates exact cosine similarity over normalized vectors.
- Persistence to `models/retrieval/faiss_index.bin` and item mappings in `models/retrieval/item_ids.json`.
- Nearest-neighbor top-100 queries execute in $< 1.5$ms.

---

## 11. Ranking Architecture
### Model B: Deep & Cross Network (DCN-v2)
- Explicit Cross Network: $\mathbf{x}_{l+1} = \mathbf{x}_0 \odot (\mathbf{W}_l \mathbf{x}_l + \mathbf{b}_l) + \mathbf{x}_l$.
- Deep feedforward stream: Dense(128, ReLU) $\rightarrow$ Dense(64) $\rightarrow$ Dense(32).
- Final accuracy: **98.41%**, Validation AUC: **0.8782**.

### Model A: Wide & Deep
- Wide linear component for sparse cross memorization.
- Deep feedforward stream for generalization.
- Final accuracy: **97.32%**, Validation AUC: **0.9333**.

---

## 12. Cold-Start Strategy
- **New Users**: Bayesian smoothed rating score $\text{WR} = \frac{v}{v+m} R + \frac{m}{v+m} C$ blended with popularity score and onboarding category preferences.
- **New Items**: Content similarity matching across genre embeddings and metadata tags.
- **Hybrid Blending**: If retrieved model candidates are sparse, cold-start picks backfill the list to guarantee rich recommendations.

---

## 13. Redis Integration
- Composite keys: `rec:{user_id}:lim_{limit}:cat_{category}:ex_{exclude_watched}`.
- Configurable TTL (default: 300 seconds).
- Resilient fallback to thread-safe in-memory cache when standalone Redis is offline.
- Performance: $< 2$ms cache hit response time.

---

## 14. Airflow Orchestration
The 12-stage retraining workflow in `airflow/dags/recommendation_retraining_dag.py`:
1. Ingest Dataset $\rightarrow$ 2. Validate Raw Data $\rightarrow$ 3. Preprocess & Split $\rightarrow$ 4. Spark Features $\rightarrow$ 5. Prep Training $\rightarrow$ 6. Train Retrieval $\rightarrow$ 7. Generate Embeddings $\rightarrow$ 8. Build FAISS Index $\rightarrow$ 9. Train Ranking $\rightarrow$ 10. Evaluate Models $\rightarrow$ 11. Validate Artifacts $\rightarrow$ 12. Deploy & Clear Cache.

Includes standalone local executor `backend/orchestration/pipeline_runner.py` with live REST monitoring.

---

## 15. NVIDIA Triton Model Serving
- Model repository configuration in `models/model_repository/` with `config.pbtxt` specifications for both retrieval and ranking models.
- Dual serving mode: connects to remote Triton daemon via `tritonclient.http`, or serves via local in-process TensorFlow engine with exact numerical output parity.

---

## 16. Model Evaluation
Evaluated across test holdout users:
- **NDCG@10**: **0.3017**
- **Precision@10**: **27.60%**
- **Recall@10**: **6.07%**
- **MAP@10**: **0.2153**
- **Intra-List Diversity**: **0.7668**
- **Novelty Score**: **9.9184 bits**
- **Catalog Coverage**: **1.08%**

---

## 17. A/B Testing
Offline benchmark comparing Wide & Deep (Model A) against DCN-v2 (Model B):
- **Finding**: DCN-v2 learns high-order polynomial feature crosses automatically via its stacked cross layers, eliminating manual feature cross engineering required by Wide & Deep.
- **Simulated Online CTR**: **30.45%** under position-biased click simulation.

---

## 18. Installation Instructions
```bash
# 1. Clone repository
git clone <repository_url>
cd recommendation-engine

# 2. Setup environment
cp .env.example .env
pip install -r backend/requirements.txt

# 3. Build frontend
cd frontend
npm install
npm run build
cd ..
```

---

## 19. Execution Instructions
```bash
# Execute feature engineering & train models
python -m backend.features.preprocessing
python -m backend.features.spark_processing
python -m backend.recommendation.retrieval.train_retrieval
python -m backend.recommendation.ranking.train_ranking
python -m backend.evaluation.ab_testing

# Launch application server (FastAPI serves API + React Dashboard)
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```
Navigate to `http://localhost:8000/` for the dashboard and `http://localhost:8000/docs` for Swagger API docs.

---

## 20. API Documentation
Key endpoints:
- `GET /api/health` — System diagnostics, vector count, cache stats.
- `GET /api/recommendations/{user_id}` — Two-stage personalized recommendations.
- `GET /api/users/{user_id}` — User interaction statistics.
- `GET /api/items/{item_id}` — Item metadata and popularity.
- `GET /api/analytics/overview` — Macro platform metrics.
- `GET /api/models/status` — Model versions and parameters.
- `GET /api/models/metrics` — Offline evaluation report.
- `POST /api/admin/retrain` — Trigger 12-stage retraining workflow.
- `POST /api/admin/cache/clear` — Invalidate recommendation caches.

---

## 21. Dashboard & Interface
The dashboard includes 7 interactive tabs:
1. **Overview**: KPI summary cards, popular categories chart, top items table.
2. **Playground**: Real-time user testing with tunable parameters and latency breakdown.
3. **User Explorer**: User profile, interaction timeline, preferred genres.
4. **Item Catalog**: Metadata, popularity index, and rating consensus.
5. **Model Performance**: Loss curves, NDCG@10, Precision@10, A/B comparison.
6. **Pipeline Monitor**: 12-stage Airflow DAG workflow monitor with manual trigger.
7. **Architecture**: Interactive visual diagram of the two-stage pipeline.

---

## 22. Future Improvements
1. **Multi-Task Learning (MTL)**: Simultaneous prediction of CTR, completion rate, and rating.
2. **Graph Neural Networks**: Integrating PinSage / LightGCN for multi-hop graph embeddings.
3. **Streaming Ingestion**: Real-time interaction streaming using Apache Kafka and Redis streams.
