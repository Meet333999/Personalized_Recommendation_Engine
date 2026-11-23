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
  Film,
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
      {/* Configuration Form Deck in PyMaster Style */}
      <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[rgba(11,25,44,0.06)] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-[#0b192c] flex items-center space-x-2 tracking-tight">
                <SlidersHorizontal className="w-4 h-4 text-[#ff5a5f]" />
                <span>Recommendation Generator</span>
              </h2>
              <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ff5a5f]/10 text-[#ff5a5f] border border-[#ff5a5f]/25">
                INFERENCE
              </span>
            </div>
            <p className="text-xs text-[#788699] mt-0.5">
              Execute real-time candidate retrieval and neural ranking for user profiles
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            {PRESET_USERS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setUserId(preset.id)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                  userId === preset.id
                    ? "bg-[#0b192c] border-[#0b192c] text-[#faf7f2] font-bold shadow-[0_2px_8px_rgba(11,25,44,0.15)]"
                    : "bg-white border-[rgba(11,25,44,0.08)] text-[#475569] font-semibold hover:border-[#ff5a5f] hover:text-[#0b192c] hover:-translate-y-0.5 shadow-[0_1px_3px_rgba(11,25,44,0.04)]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* User ID */}
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 font-mono">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-white border border-[rgba(11,25,44,0.08)] rounded-[12px] px-3.5 py-2 text-sm text-[#0b192c] placeholder-[#788699] focus:outline-none focus:border-[#ff5a5f] focus:ring-2 focus:ring-[#ff5a5f]/20 font-mono transition-all h-10 shadow-[inset_0_1px_3px_rgba(11,25,44,0.04)]"
            />
          </div>

          {/* Top-K Limit */}
          <div>
            <div className="flex justify-between text-xs font-bold text-[#475569] mb-1.5">
              <span>Candidate Output (N)</span>
              <span className="tabular-nums font-mono text-[#ff5a5f] font-extrabold">{limit}</span>
            </div>
            <div className="h-10 flex items-center">
              <input
                type="range"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full accent-[#ff5a5f] h-2 bg-[#ede7dc] rounded-full cursor-pointer"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5">Category Filter</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-[rgba(11,25,44,0.08)] rounded-[12px] px-3.5 py-2 text-sm text-[#0b192c] focus:outline-none focus:border-[#ff5a5f] focus:ring-2 focus:ring-[#ff5a5f]/20 transition-all h-10 shadow-[inset_0_1px_3px_rgba(11,25,44,0.04)]"
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
            <label className="block text-xs font-bold text-[#475569] mb-1.5">Stage 2 Ranker</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-white border border-[rgba(11,25,44,0.08)] rounded-[12px] px-3.5 py-2 text-sm text-[#0b192c] focus:outline-none focus:border-[#ff5a5f] focus:ring-2 focus:ring-[#ff5a5f]/20 transition-all font-semibold h-10 shadow-[inset_0_1px_3px_rgba(11,25,44,0.04)]"
            >
              <option value="dcn">DCN-v2 (Deep & Cross)</option>
              <option value="wide_and_deep">Wide & Deep</option>
            </select>
          </div>

          {/* Action Trigger - PyMaster Coral Action Button */}
          <div className="flex flex-col space-y-1.5">
            <label className="flex items-center space-x-2 text-xs text-[#475569] cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={excludeWatched}
                onChange={(e) => setExcludeWatched(e.target.checked)}
                className="rounded border-[rgba(11,25,44,0.15)] text-[#ff5a5f] focus:ring-[#ff5a5f]"
              />
              <span>Exclude watched</span>
            </label>

            <button
              onClick={handleRecommend}
              disabled={loading}
              className="w-full h-10 px-5 rounded-[12px] bg-[#ff5a5f] hover:bg-[#e84e53] active:scale-[0.98] text-white font-extrabold text-sm shadow-[0_4px_14px_rgba(255,90,95,0.30)] hover:shadow-[0_6px_18px_rgba(255,90,95,0.35)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
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
        <div className="p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Diagnostics Telemetry Strip */}
      {result && (
        <div className="p-5 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <div className="bg-[#f3eee5]/80 p-3 rounded-[14px] border border-[rgba(11,25,44,0.06)]">
            <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-[#ff5a5f]" />
              <span>Total Latency</span>
            </div>
            <div className="text-sm font-extrabold text-[#0b192c] mt-1.5 tabular-nums font-mono">
              {result.total_processing_ms} ms
            </div>
          </div>

          <div className="bg-[#f3eee5]/80 p-3 rounded-[14px] border border-[rgba(11,25,44,0.06)]">
            <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
              <Layers className="w-3.5 h-3.5 text-[#ff5a5f]" />
              <span>Stage 1 (FAISS)</span>
            </div>
            <div className="text-sm font-extrabold text-[#0b192c] mt-1.5 tabular-nums font-mono">
              {result.retrieval_stage.retrieved_count} items
            </div>
            <div className="text-[#788699] text-[10px] tabular-nums font-mono">{result.retrieval_stage.latency_ms} ms</div>
          </div>

          <div className="bg-[#f3eee5]/80 p-3 rounded-[14px] border border-[rgba(11,25,44,0.06)]">
            <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
              <Sliders className="w-3.5 h-3.5 text-[#ff5a5f]" />
              <span>Stage 2 (Ranked)</span>
            </div>
            <div className="text-sm font-extrabold text-[#0b192c] mt-1.5 tabular-nums font-mono">
              {result.ranking_stage.ranked_count} items
            </div>
            <div className="text-[#788699] text-[10px] tabular-nums font-mono">{result.ranking_stage.latency_ms} ms</div>
          </div>

          <div className="bg-[#f3eee5]/80 p-3 rounded-[14px] border border-[rgba(11,25,44,0.06)]">
            <div className="text-[#788699] font-bold">Model Head</div>
            <div className="text-sm font-extrabold text-[#0b192c] mt-1.5 uppercase font-mono">
              {result.ranking_stage.model}
            </div>
          </div>

          <div className="bg-[#f3eee5]/80 p-3 rounded-[14px] border border-[rgba(11,25,44,0.06)]">
            <div className="text-[#788699] font-bold">Strategy Path</div>
            <div className="text-sm font-extrabold text-[#0b192c] mt-1.5 truncate capitalize">
              {result.strategy.replace("_", " ")}
            </div>
          </div>

          <div className="bg-[#f3eee5]/80 p-3 rounded-[14px] border border-[rgba(11,25,44,0.06)]">
            <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
              <Database className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Cache Buffer</span>
            </div>
            <div className={`text-sm font-black mt-1.5 font-mono ${result.cached ? "text-[#10b981]" : "text-[#788699]"}`}>
              {result.cached ? "HIT" : "MISS"}
            </div>
          </div>
        </div>
      )}

      {/* Recommended Items Grid */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] font-extrabold text-[#ff5a5f] uppercase tracking-wider">
                RESULTS
              </span>
              <h3 className="text-xs font-extrabold text-[#0b192c] uppercase tracking-wider font-mono">
                Output Candidates ({result.recommendations.length})
              </h3>
            </div>
            <span className="text-xs text-[#788699] font-mono font-medium">
              Calibrated Deep Ranking Scores
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.recommendations.map((item) => (
              <div
                key={item.item_id}
                className="p-5 rounded-[16px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] hover:border-[#ff5a5f] hover:shadow-[0_4px_20px_-2px_rgba(11,25,44,0.08)] hover:translate-x-1 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Movie Poster Thumbnail with Tactile Fallback */}
                    <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-[10px] overflow-hidden bg-[#f3eee5] border border-[rgba(11,25,44,0.08)] flex-shrink-0 relative shadow-xs flex items-center justify-center">
                      {item.poster_url ? (
                        <img
                          src={item.poster_url}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center p-1 text-center bg-[#f3eee5] ${
                          item.poster_url ? "hidden" : "flex"
                        }`}
                      >
                        <Film className="w-5 h-5 text-[#788699]/60 mb-1" />
                        <span className="text-[9px] font-mono text-[#788699] font-bold leading-tight">
                          {item.release_year || "Movie"}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-6 h-6 rounded-[8px] bg-[#f3eee5] border border-[rgba(11,25,44,0.08)] flex items-center justify-center text-[11px] font-mono font-black text-[#0b192c] flex-shrink-0 tabular-nums">
                          {item.rank}
                        </span>
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-[#0b192c] bg-[#f3eee5] border border-[rgba(11,25,44,0.08)] px-2.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.average_rating}</span>
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-[#0b192c] tracking-tight mt-1.5 line-clamp-2" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#788699] tabular-nums font-mono font-medium mt-0.5">
                        {item.release_year} &bull; {item.primary_category}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.categories.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3eee5] text-[#475569] border border-[rgba(11,25,44,0.08)] font-semibold"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {item.reason && (
                    <div className="mt-3.5 text-xs text-[#475569] flex items-start space-x-1.5 bg-[#f3eee5]/80 p-2.5 rounded-[12px] border border-[rgba(11,25,44,0.06)] font-medium">
                      <Info className="w-3.5 h-3.5 text-[#ff5a5f] flex-shrink-0 mt-0.5" />
                      <span>{item.reason}</span>
                    </div>
                  )}
                </div>

                {/* Score breakdown metrics */}
                <div className="pt-3.5 border-t border-[rgba(11,25,44,0.06)] grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#f3eee5]/80 p-2.5 rounded-[12px] border border-[rgba(11,25,44,0.06)]">
                    <div className="text-[#788699] text-[10px] font-bold font-mono">RETRIEVAL COSINE</div>
                    <div className="font-bold text-[#0b192c] tabular-nums font-mono text-sm mt-0.5">{item.retrieval_score.toFixed(4)}</div>
                  </div>
                  <div className="bg-[#ff5a5f]/10 p-2.5 rounded-[12px] border border-[#ff5a5f]/25">
                    <div className="text-[#ff5a5f] text-[10px] font-extrabold font-mono">RANKING PROB</div>
                    <div className="font-black text-[#ff5a5f] tabular-nums font-mono text-sm mt-0.5">{item.ranking_score.toFixed(4)}</div>
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
