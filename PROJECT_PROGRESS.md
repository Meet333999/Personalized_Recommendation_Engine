# Large-Scale Personalized Recommendation Engine - Project Progress

**Project**: Two-Stage Personalized Recommendation Engine (Two-Tower Retrieval + Deep Ranking)  
**Architecture**: Netflix / Amazon style Two-Stage Production Architecture  
**Status**: **PRODUCTION COMPLETE & DEPLOYED**  
**Last Updated**: 2026-11-23  

---

## 1. Phase Tracker

| Phase | Description | Status | Validation / Artifacts |
|---|---|---|---|
| **Phase 1** | Environment & Project Setup | **COMPLETED** | Directory structure, dependencies, configuration, .env, hardware detection |
| **Phase 2** | Dataset Ingestion & Multi-Dataset Support | **COMPLETED** | MovieLens 25M default + small fallback, cleaning, temporal train/val/test split |
| **Phase 3** | Spark Feature Engineering | **COMPLETED** | PySpark interaction/feature pipelines, Parquet outputs (user, item, interaction) |
| **Phase 4** | Stage 1: Two-Tower Retrieval Model | **COMPLETED** | TFRS User & Item towers, in-batch negative sampling, trained weights |
| **Phase 5** | Vector Indexing & FAISS Engine | **COMPLETED** | Offline item embedding dump, FAISS IndexFlatIP/IVF, top-K candidate retrieval |
| **Phase 6** | Stage 2: Deep Ranking Models (DCN & W&D) | **COMPLETED** | DCN-v2 and Wide & Deep ranking architectures, training, checkpointing |
| **Phase 7** | End-to-End Recommendation Pipeline | **COMPLETED** | Candidate retrieval -> Feature enrichment -> Deep ranking -> Top-N output |
| **Phase 8** | Cold-Start Strategy & Redis Caching | **COMPLETED** | New user/item fallback, Redis caching + in-memory fallback, TTL & cache stats |
| **Phase 9** | FastAPI Backend Serving & Endpoints | **COMPLETED** | REST API endpoints, Pydantic validation, CORS, error handling, OpenAPI docs |
| **Phase 10** | NVIDIA Triton Serving & Local Engine | **COMPLETED** | Model repository configs (config.pbtxt), Triton client + local TF serving fallback |
| **Phase 11** | Airflow Retraining Orchestration | **COMPLETED** | 12-task retraining DAG, retries, Python pipeline executor for local run |
| **Phase 12** | React + TypeScript + Tailwind Dashboard | **COMPLETED** | PyMaster Cream & Coral UI, Framer Motion, Recharts, chunk-split bundles |
| **Phase 13** | Model Evaluation & Offline/Simulated A/B | **COMPLETED** | NDCG, Recall, Precision, Diversity, Novelty, DCN vs W&D comparison report |
| **Phase 14** | Deployment, Testing & Verification | **COMPLETED** | 20/20 Pytest passing, local servers active, Vercel deployment completed |

---

## 2. Hardware & Environment Specifications

- **Operating System**: Windows 11 (64-bit)
- **CPU / RAM**: 16-thread CPU, 15.7 GB RAM
- **GPU**: NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)
- **Python**: 3.11.9
- **Core ML Frameworks**: TensorFlow 2.16.2 (`TF_USE_LEGACY_KERAS=1`), TensorFlow Recommenders 0.7.7, PyTorch 2.5.1+cu121
- **Data Engine**: PySpark 3.5.3 (Java 8 64-bit), PyArrow 17.0.0
- **Vector Search**: FAISS-CPU 1.9.0
- **Caching**: Redis 5.2.0 + Fakeredis 2.26.1 in-memory fallback
- **Serving**: Triton Client 2.47.0 + Local TensorFlow Keras Inference Engine
- **Web & API**: FastAPI 0.115.0, Uvicorn 0.32.0, Pydantic 2.14.3
- **Frontend**: Node.js v22.14.0, Vite 8.3.8, React 19, TypeScript, Tailwind CSS, Recharts, Lucide React

---

## 3. Deployed Links & Local Endpoints

- **Vercel Temporary Deployment**: `https://flying-monsoon-zy8qowm.tmp.now`
- **Vercel Claim Link**: `https://vercel.com/claim-deployment?code=012ab753-995e-4f2f-b045-e563d2f01e8c`
- **Local Frontend Console**: `http://localhost:5173/`
- **Local FastAPI Backend**: `http://localhost:8000/api`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
