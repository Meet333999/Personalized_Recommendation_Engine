import React, { useState } from "react";
import {
  SlidersHorizontal,
  Clock,
  Layers,
  Database,
  Star,
  Info,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Zap,
} from "lucide-react";
import { api, RecommendationResult } from "../services/api";

const PRESET_USERS = [
  { id: "1", label: "User 1 (Active)" },
  { id: "24", label: "User 24" },
  { id: "150", label: "User 150" },
  { id: "414", label: "User 414 (Frequent)" },
  { id: "999999", label: "New User (Cold Start)" },
];

const CATEGORIES = [
  "All",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Thriller",
];

export const PlaygroundTab: React.FC = () => {
  const [userId, setUserId] = useState<string>("1");
  const [limit, setLimit] = useState<number>(10);
  const [category, setCategory] = useState<string>("All");
  const [modelType, setModelType] = useState<string>("dcn");
  const [excludeWatched, setExcludeWatched] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecommendations(
        userId.trim(),
        limit,
        category === "All" ? undefined : category,
        excludeWatched,
        modelType
      );
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form Card in Cream & Coral */}
      <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F5F2EB] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#1C1917] flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-[#F05A36]" />
                <span>Recommendation Generator</span>
              </h2>
              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#FFF0EB] text-[#D93815] border border-[#FCDAD1]">
                INFERENCE
              </span>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Execute real-time candidate retrieval and neural ranking for user profiles
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            {PRESET_USERS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setUserId(preset.id)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  userId === preset.id
                    ? "bg-[#FFF0EB] border-[#FCDAD1] text-[#D93815] font-semibold"
                    : "bg-[#FAF8F5] border-[#EAE5DC] text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Form - Precisely Aligned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* User ID */}
          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1.5">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-white border border-[#EAE5DC] rounded-lg px-3 py-2 text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#F05A36] focus:ring-1 focus:ring-[#F05A36] font-mono transition-colors h-10"
            />
          </div>

          {/* Top-K Limit */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-[#57534E] mb-1.5">
              <span>Candidate Output (N)</span>
              <span className="tabular-nums font-mono text-[#F05A36] font-bold">{limit}</span>
            </div>
            <div className="h-10 flex items-center">
              <input
                type="range"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full accent-[#F05A36] h-2 bg-[#EAE5DC] rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1.5">Category Filter</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-[#EAE5DC] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F05A36] focus:ring-1 focus:ring-[#F05A36] transition-colors h-10"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Ranking Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1.5">Stage 2 Ranker</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-white border border-[#EAE5DC] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F05A36] focus:ring-1 focus:ring-[#F05A36] transition-colors font-medium h-10"
            >
              <option value="dcn">DCN-v2 (Deep & Cross)</option>
              <option value="wide_and_deep">Wide & Deep</option>
            </select>
          </div>

          {/* Action Trigger - PyMaster Coral Button */}
          <div className="flex flex-col space-y-1.5">
            <label className="flex items-center space-x-2 text-xs text-[#57534E] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeWatched}
                onChange={(e) => setExcludeWatched(e.target.checked)}
                className="rounded border-[#EAE5DC] text-[#F05A36] focus:ring-[#F05A36]"
              />
              <span>Exclude watched</span>
            </label>

            <button
              onClick={handleRecommend}
              disabled={loading}
              className="w-full h-10 px-4 rounded-lg bg-[#F05A36] hover:bg-[#E04826] active:bg-[#D03E1C] text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Executing Pipeline...</span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Run Inference</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Diagnostics Telemetry Strip with Green Preserved for Cache Hit */}
      {result && (
        <div className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE5DC]">
            <div className="text-[#78716C] flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Total Latency</span>
            </div>
            <div className="text-sm font-bold text-[#1C1917] mt-1 tabular-nums font-mono">
              {result.total_processing_ms} ms
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE5DC]">
            <div className="text-[#78716C] flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Stage 1 (FAISS)</span>
            </div>
            <div className="text-sm font-bold text-[#1C1917] mt-1 tabular-nums font-mono">
              {result.retrieval_stage.retrieved_count} items
            </div>
            <div className="text-[#A8A29E] text-[10px] tabular-nums font-mono">{result.retrieval_stage.latency_ms} ms</div>
          </div>

          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE5DC]">
            <div className="text-[#78716C] flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Stage 2 (Ranked)</span>
            </div>
            <div className="text-sm font-bold text-[#1C1917] mt-1 tabular-nums font-mono">
              {result.ranking_stage.ranked_count} items
            </div>
            <div className="text-[#A8A29E] text-[10px] tabular-nums font-mono">{result.ranking_stage.latency_ms} ms</div>
          </div>

          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE5DC]">
            <div className="text-[#78716C]">Model Head</div>
            <div className="text-sm font-bold text-[#1C1917] mt-1 uppercase font-mono">
              {result.ranking_stage.model}
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE5DC]">
            <div className="text-[#78716C]">Strategy Path</div>
            <div className="text-sm font-bold text-[#1C1917] mt-1 truncate capitalize">
              {result.strategy.replace("_", " ")}
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EAE5DC]">
            <div className="text-[#78716C] flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Cache Buffer</span>
            </div>
            <div className={`text-sm font-bold mt-1 font-mono ${result.cached ? "text-emerald-700" : "text-amber-700"}`}>
              {result.cached ? "HIT" : "MISS"}
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-lg border border-[#EAE5DC] bg-white" />
          ))}
        </div>
      )}

      {/* Recommended Items Grid */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#57534E] uppercase tracking-wider">
              Output Candidates ({result.recommendations.length})
            </h3>
            <span className="text-xs text-[#78716C] font-mono">
              Calibrated Deep Ranking Scores
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.recommendations.map((item) => (
              <div
                key={item.item_id}
                className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-6 h-6 rounded bg-[#FAF8F5] border border-[#EAE5DC] flex items-center justify-center text-xs font-mono font-bold text-[#57534E] flex-shrink-0 tabular-nums">
                      {item.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1C1917] truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#78716C] tabular-nums font-mono">{item.release_year}</p>
                    </div>
                    <span className="inline-flex items-center space-x-1 text-xs font-semibold text-[#1C1917] bg-[#FAF8F5] border border-[#EAE5DC] px-2 py-0.5 rounded tabular-nums flex-shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{item.average_rating}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.categories.map((c, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#EAE5DC] font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {item.reason && (
                    <div className="mt-3 text-xs text-[#57534E] flex items-start space-x-1.5 bg-[#FAF8F5] p-2 rounded border border-[#EAE5DC]">
                      <Info className="w-3.5 h-3.5 text-[#F05A36] flex-shrink-0 mt-0.5" />
                      <span>{item.reason}</span>
                    </div>
                  )}
                </div>

                {/* Score breakdown metrics */}
                <div className="pt-3 border-t border-[#F5F2EB] grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#FAF8F5] p-2 rounded border border-[#EAE5DC]">
                    <div className="text-[#78716C] text-[10px]">Retrieval Cosine</div>
                    <div className="font-semibold text-[#1C1917] tabular-nums font-mono">{item.retrieval_score.toFixed(4)}</div>
                  </div>
                  <div className="bg-[#FFF0EB] p-2 rounded border border-[#FCDAD1]">
                    <div className="text-[#D93815] text-[10px] font-medium">Ranking Probability</div>
                    <div className="font-bold text-[#F05A36] tabular-nums font-mono">{item.ranking_score.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
