# Setup and Execution Guide

This guide describes how to run the Large-Scale Personalized Recommendation Engine locally on Windows, Linux, or macOS, and via Docker Compose.

---

## 1. Prerequisites
- Python 3.10+ (tested with Python 3.11.9)
- Java 8 or Java 11 (64-bit, for Apache PySpark)
- Node.js 18+ and npm (tested with Node v22.14.0)
- Optional: Docker and Docker Compose

---

## 2. Environment Installation

### Step A: Clone & Set Up Python Environment
```bash
git clone <repository_url>
cd recommendation-engine

# Copy environment configuration
cp .env.example .env

# Install Python dependencies
pip install -r requirements.txt
```

### Step B: Build Frontend Application
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 3. Data Pipeline & Model Training Execution

To execute the data processing and train the models:

### 1. Ingest & Preprocess Dataset
```bash
python -m backend.features.preprocessing
```
*Downloads MovieLens dataset, validates schema, deduplicates records, and creates chronological temporal train/val/test splits.*

### 2. PySpark Feature Engineering
```bash
python -m backend.features.spark_processing
```
*Executes scalable feature engineering using Apache Spark, saving user, item, and interaction feature stores in Parquet format.*

### 3. Train Two-Tower Retrieval Model
```bash
python -m backend.recommendation.retrieval.train_retrieval
```
*Trains User and Item towers with TensorFlow Recommenders, extracts catalog embeddings, and saves weights to `models/retrieval/`.*

### 4. Build FAISS Index
```bash
python -c "
import numpy as np, json
from backend.config.config import settings
from backend.vector_search.faiss_index import faiss_manager

embs = np.load(str(settings.RETRIEVAL_MODEL_DIR / 'item_embeddings.npy'))
with open(settings.RETRIEVAL_MODEL_DIR / 'item_ids.json') as f:
    item_ids = json.load(f)

faiss_manager.build_index(embs, item_ids)
faiss_manager.save()
print('FAISS index successfully built and saved!')
"
```

### 5. Train Deep Ranking Models (DCN-v2 and Wide & Deep)
```bash
python -m backend.recommendation.ranking.train_ranking
```
*Trains DCN-v2 and Wide & Deep models on negative-sampled training interactions.*

### 6. Run Offline A/B Model Evaluation
```bash
python -m backend.evaluation.ab_testing
```
*Generates offline evaluation metrics (NDCG@10, Recall, Precision, Diversity, Novelty, Simulated CTR) on test holdout users.*

---

## 4. Launching the Serving Application

### Option 1: Unified FastAPI Backend (Serves API + Frontend Dashboard)
```bash
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser to:
- **Interactive Dashboard**: `http://localhost:8000/`
- **Swagger OpenAPI Documentation**: `http://localhost:8000/docs`

### Option 2: Frontend Development Server
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 5. Running the Test Suite
```bash
pytest -v
```
Runs all 20 unit and end-to-end integration tests.

---

## 6. Docker Deployment (Production)
```bash
docker-compose up --build
```
Launches:
- `deeprec-backend` on port `8000`
- `deeprec-frontend` on port `3000`
- `deeprec-redis` on port `6379`
