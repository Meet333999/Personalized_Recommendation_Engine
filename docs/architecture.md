# System Architecture & Technical Design

## 1. Overview & Industrial Design Philosophy

Large-scale recommendation systems at platforms like Netflix, YouTube, and Amazon cannot rank millions of items in real-time with deep neural networks due to latency constraints ($< 50$ms). Consequently, an industrial **Two-Stage Architecture** is employed:

```
[ Catalog: 10,000+ to 1,000,000+ Items ]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 1: Candidate Retrieval (Two-Tower + FAISS)       │
│ - Ultra-low latency vector similarity search           │
│ - O(k log N) inner-product nearest-neighbor search     │
│ - Filter down to top ~100 candidate items              │
└────────────────────────────────────────────────────────┘
                   │ Top ~100 Candidates
                   ▼
┌────────────────────────────────────────────────────────┐
│ FEATURE ENRICHMENT STORE (PySpark & Parquet)           │
│ - Join candidate items with real-time user features    │
│ - Extract category affinity, recency, popularity       │
└────────────────────────────────────────────────────────┘
                   │ Enriched Candidate Feature Matrix
                   ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 2: Deep Ranking Model (DCN-v2 / Wide & Deep)     │
│ - High-capacity neural network modeling cross-features │
│ - Explicit polynomial cross network + Deep MLP         │
│ - Predicts calibrated relevance probability P(y=1|u,i) │
└────────────────────────────────────────────────────────┘
                   │ Sorted Probabilities
                   ▼
┌────────────────────────────────────────────────────────┐
│ POST-PROCESSING & COLD-START SAFEGUARD                 │
│ - Filter watched history & apply genre constraints     │
│ - Bayesian smoothed popularity for unobserved users    │
│ - Fallback hybrid blending if candidate pool < N       │
└────────────────────────────────────────────────────────┘
                   │ Top N Items (e.g. 10)
                   ▼
┌────────────────────────────────────────────────────────┐
│ REDIS CACHING LAYER (< 2ms Fast-Path)                  │
│ - Key: rec:{user_id}:{limit}:{category}:{exclude}      │
│ - Invalidation on model deployment or feedback update   │
└────────────────────────────────────────────────────────┘
                   │
                   ▼
         [ FastAPI REST API & React UI ]
```

---

## 2. Mathematical Formulations

### Stage 1: Two-Tower Neural Network
The user tower $f_U(\mathbf{x}_u; \Theta_u)$ maps sparse and dense user features to a vector $\mathbf{u} \in \mathbb{R}^d$.  
The item tower $f_I(\mathbf{x}_i; \Theta_i)$ maps item metadata to a vector $\mathbf{v} \in \mathbb{R}^d$.

Both vectors are $L_2$-normalized:
$$\hat{\mathbf{u}} = \frac{\mathbf{u}}{\|\mathbf{u}\|_2}, \quad \hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|_2}$$

The similarity score is given by the cosine inner product:
$$s(u, i) = \langle \hat{\mathbf{u}}, \hat{\mathbf{v}} \rangle = \hat{\mathbf{u}}^T \hat{\mathbf{v}}$$

The model is trained via in-batch sampled softmax loss with temperature $\tau$:
$$\mathcal{L} = -\sum_{j=1}^B \log \frac{\exp(s(u_j, i_j) / \tau)}{\sum_{k=1}^B \exp(s(u_j, i_k) / \tau)}$$

### Stage 2: Deep & Cross Network (DCN-v2)
The input $\mathbf{x}_0$ concatenates user embeddings, item embeddings, categorical features, and normalized continuous features.

The explicit **Cross Network** computes:
$$\mathbf{x}_{l+1} = \mathbf{x}_0 \odot (\mathbf{W}_l \mathbf{x}_l + \mathbf{b}_l) + \mathbf{x}_l$$

The **Deep Network** computes:
$$\mathbf{h}_0 = \mathbf{x}_0$$
$$\mathbf{h}_{k+1} = \text{ReLU}(\mathbf{W}_k \mathbf{h}_k + \mathbf{b}_k)$$

The outputs are stacked and passed to a prediction head:
$$\hat{y} = \sigma(\mathbf{W}_{\text{logits}} [\mathbf{x}_L; \mathbf{h}_K] + b)$$
