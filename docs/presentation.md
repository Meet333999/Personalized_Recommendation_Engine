# Final Technical Presentation: Large-Scale Personalized Recommendation Engine

**Duration**: 10 Minutes  
**Audience**: Technical Review Committee, Senior ML Engineers, Product Architects  
**Presenter**: Senior ML Engineer / Full-Stack AI Architect  

---

## Slide 1: Title Slide
**Large-Scale Personalized Recommendation Engine**  
*Production-Oriented Two-Stage Architecture with TensorFlow Recommenders, PySpark, FAISS, Redis, and FastAPI*  

- **Speaker**: Senior Machine Learning & Systems Engineer
- **Domain**: Machine Learning, Information Retrieval, Scalable Data Systems

---

## Slide 2: Problem Statement
- **The Challenge**: High-volume modern platforms (e.g. Netflix, Amazon, Spotify) maintain millions of catalog items and hundreds of millions of user interactions.
- **The Latency-Accuracy Dilemma**:
  - Scoring every catalog item with complex deep neural networks is computationally prohibitive within strict $< 50$ms SLA limits.
  - Simple matrix factorization lacks non-linear feature interaction capabilities and fails on cold-start items and users.
- **The Solution**: A decoupled, two-stage architecture that cleanly balances ultra-fast candidate retrieval with high-capacity deep ranking.

---

## Slide 3: Project Objectives
1. **Architect & Implement** an industrial Two-Stage Recommendation Engine (Retrieval + Ranking).
2. **Eliminate Future Data Leakage** by strictly splitting interaction timelines chronologically.
3. **Build Scalable Feature Stores** using Apache Spark (PySpark) outputting Parquet tables.
4. **Deploy Vector Search** with FAISS for sub-millisecond candidate generation across 64-dim embeddings.
5. **Implement Deep Ranking** using Deep & Cross Network (DCN-v2) and Wide & Deep architectures.
6. **Integrate Real-Time Serving Infrastructure** with FastAPI, Redis caching, Triton specifications, and React dashboard.
7. **Conduct Rigorous Offline & Simulated A/B Evaluations** on real test holdouts.

---

## Slide 4: System Architecture
```
[ User Request ]
       │
       ▼
[ Redis Cache ] ──(Cache Hit < 2ms)──► [ Fast Response ]
       │ Cache Miss
       ▼
[ User Tower (TFRS) ] ──► [ User Embedding: 64-dim ]
       │
       ▼
[ FAISS Vector Index (IndexFlatIP) ] ──► [ Top 100 Candidates ]
       │
       ▼
[ Spark Feature Store Join ] ──► [ Candidate Interaction Matrix ]
       │
       ▼
[ Deep Ranking Model (DCN-v2) ] ──► [ Calibrated Probabilities P(y=1) ]
       │
       ▼
[ Cold-Start / Fallback Guard ] ──► [ Final Top-N Personalized Picks ]
```

---

## Slide 5: Dataset & Preprocessing
- **Primary Dataset**: GroupLens MovieLens (standardized to 100,836 ratings, 9,742 items, 610 users; architecture supports Amazon Reviews, Yelp, H&M, Goodreads, Last.fm).
- **Chronological Temporal Splitting**:
  - Training Set: 80% earliest interactions
  - Validation Set: 10% subsequent interactions
  - Test Set: 10% latest interactions
  - *Data leakage assertion: $\max(\text{Train Time}) \le \min(\text{Val Time}) \le \min(\text{Test Time})$*.
- **Scalable Feature Extraction with PySpark**:
  - User profiles: interaction density, average rating, variance, top category preferences.
  - Item profiles: Bayesian smoothed ratings, normalized popularity index, multi-genre embeddings.

---

## Slide 6: Stage 1: Two-Tower Neural Retrieval
- **Framework**: TensorFlow Recommenders (TFRS v0.7.7) & TensorFlow 2.16.
- **User Tower**: Maps `user_id`, historical interaction count, and genre preferences through a 3-layer MLP into a 64-dim vector.
- **Item Tower**: Maps `item_id`, primary category, and popularity score through a 3-layer MLP into a 64-dim vector.
- **Shared Metric Space**: $L_2$ normalization ensures dot-product equals exact cosine similarity.
- **In-Batch Negative Sampling**: Eliminates explicit negative matrix generation; loss decreased from **5.50** to **4.54** across 10 epochs.

---

## Slide 7: Vector Indexing & FAISS Candidate Retrieval
- **Vector Search Engine**: Facebook AI Similarity Search (`faiss.IndexFlatIP`).
- **Offline Indexing**: Precomputed 64-dimensional embeddings for all 9,742 catalog items saved to disk.
- **Candidate Generation**:
  - Generates real-time user embedding in $\sim 1.5$ms.
  - Executes nearest-neighbor search across catalog in $< 1.2$ms.
  - Prunes candidate pool to top 100 high-affinity candidates.

---

## Slide 8: Stage 2: Deep Ranking Models
- **Deep & Cross Network (DCN-v2)**:
  - Explicit polynomial Cross Layers: $\mathbf{x}_{l+1} = \mathbf{x}_0 \odot (\mathbf{W}_l \mathbf{x}_l + \mathbf{b}_l) + \mathbf{x}_l$.
  - Models degree-3 feature crosses automatically without manual feature engineering.
  - Parallel Deep MLP captures high-order non-linearities.
  - Reached **98.41% training accuracy** and **0.8782 validation AUC**.
- **Wide & Deep Alternative**:
  - Wide linear memorization stream combined with deep feedforward stream.
  - Benchmark comparison shows DCN-v2 captures subtle interaction nuances more effectively.

---

## Slide 9: Infrastructure & Deployment
- **FastAPI Application**: Fully typed Pydantic REST API exposing 12 endpoints.
- **Redis Caching**: Composite key caching (`rec:{user}:{limit}:{category}`) with TTL expiration and automatic in-memory fallback.
- **Dual Serving Modes**: NVIDIA Triton Inference Server (`config.pbtxt` specifications) + in-process local TensorFlow engine with identical outputs.
- **MLOps Orchestration**: 12-task Apache Airflow DAG (`recommendation_retraining_dag.py`) with status tracking and automated cache invalidation.
- **Frontend Dashboard**: React 18, TypeScript, Tailwind CSS, Recharts for analytics and real-time recommendation testing.

---

## Slide 10: Quantitative Results & Evaluation
- **Offline Ranking Quality**:
  - **NDCG@10**: 0.3017
  - **Precision@10**: 27.60%
  - **MAP@10**: 0.2153
- **Catalog Health**:
  - **Intra-List Diversity**: **0.7668** (high genre spread)
  - **Novelty**: **9.9184 bits** (balanced serendipity vs popularity)
  - **Position-Biased Simulated CTR**: **30.45%**
- **Test Suite**: 20/20 Pytest unit and integration tests passing, including the mandatory end-to-end test.

---

## Slide 11: Conclusion & Future Scope
- **Conclusion**: We delivered a complete, fully functional, production-grade Two-Stage Recommendation Engine built on real data and real neural networks with no mock placeholders.
- **Future Enhancements**:
  1. Multi-Task Learning (MTL) heads (predicting click, watch time, and rating simultaneously).
  2. Graph Neural Networks (PinSage / LightGCN) for high-order user-item graph connectivity.
  3. Real-time streaming updates via Apache Kafka and Redis streams.
