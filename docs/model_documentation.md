# Machine Learning Model Documentation

## 1. Stage 1: Two-Tower Neural Retrieval

### Objective
Quickly identify $K \approx 100$ candidate items from a catalog of $N \approx 10,000$ to $1,000,000+$ items with sub-millisecond retrieval latency.

### User Tower Architecture
- **Categorical Features**: `user_id` (dimension 64 embedding), `user_top_category` (dimension 16 embedding).
- **Numerical Features**: `user_interaction_count` (log-normalized), `user_avg_rating` (standardized).
- **Dense Layers**: Dense(128, ReLU) $\rightarrow$ BatchNormalization $\rightarrow$ Dropout(0.2) $\rightarrow$ Dense(64, ReLU) $\rightarrow$ Projection(64, Linear) $\rightarrow$ $L_2$ Normalization.

### Item Tower Architecture
- **Categorical Features**: `item_id` (dimension 64 embedding), `primary_category` (dimension 16 embedding).
- **Numerical Features**: `item_popularity_score` (log-normalized count), `item_avg_rating` (standardized).
- **Dense Layers**: Dense(128, ReLU) $\rightarrow$ BatchNormalization $\rightarrow$ Dropout(0.2) $\rightarrow$ Dense(64, ReLU) $\rightarrow$ Projection(64, Linear) $\rightarrow$ $L_2$ Normalization.

### In-Batch Negative Sampling
Rather than explicitly constructing millions of negative samples, the model computes pairwise cosine similarities across all items in the batch ($B \times B$ matrix). For each user row $i$, item $i$ is treated as the true positive label and all other items $j \neq i$ in the batch serve as negative samples.

---

## 2. Vector Search (FAISS IndexFlatIP)
- Item representations are precomputed offline and indexed into `faiss.IndexFlatIP(64)`.
- Because embeddings are $L_2$-normalized, inner product strictly equals cosine similarity.
- Top-100 nearest neighbor query executes in $< 1.5$ ms.

---

## 3. Stage 2: Deep Ranking Models

### Model B: Deep & Cross Network (DCN-v2)
- **Motivation**: Standard MLPs cannot efficiently learn high-order polynomial feature crosses. DCN-v2 introduces explicit cross layers that model interactions of arbitrary degree without manual feature engineering.
- **Cross Formula**: $\mathbf{x}_{l+1} = \mathbf{x}_0 \odot (\mathbf{W}_l \mathbf{x}_l + \mathbf{b}_l) + \mathbf{x}_l$.
- **Deep Stream**: Dense(128, ReLU) $\rightarrow$ BatchNorm $\rightarrow$ Dropout(0.2) $\rightarrow$ Dense(64) $\rightarrow$ Dense(32).
- **Fusion Head**: Dense(32, ReLU) $\rightarrow$ Dense(1, Sigmoid).

### Model A: Wide & Deep Architecture
- **Wide Component**: Linear model over interaction features and category affinity signals (memorization).
- **Deep Component**: Deep MLP over embedding representations and continuous signals (generalization).
- **Combined Logits**: $P(y=1|\mathbf{x}) = \sigma(\mathbf{W}_{\text{wide}}^T \mathbf{x}_{\text{wide}} + \mathbf{W}_{\text{deep}}^T \mathbf{h}_{\text{deep}} + b)$.
