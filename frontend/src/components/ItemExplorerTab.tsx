import React, { useState, useEffect } from "react";
import { Film, Search, Star, Hash, BarChart3, Tag } from "lucide-react";
import { api } from "../services/api";

export const ItemExplorerTab: React.FC = () => {
  const [itemId, setItemId] = useState<string>("1");
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getItemDetail(id);
      setItem(data);
    } catch (err: any) {
      setError(err.message || "Item not found in catalog");
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem("1");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemId.trim()) {
      fetchItem(itemId.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-extrabold text-[#0b192c] flex items-center space-x-2 tracking-tight">
              <Film className="w-4 h-4 text-[#ff5a5f]" />
              <span>Catalog Items</span>
            </h2>
            <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ff5a5f]/10 text-[#ff5a5f] border border-[#ff5a5f]/25">
              CORPUS
            </span>
          </div>
          <p className="text-xs text-[#788699] mt-0.5">
            Inspect item vector parameters, metadata attributes, and popularity scores
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="Item ID (e.g. 1, 260)"
            className="bg-white border border-[rgba(11,25,44,0.08)] rounded-[12px] px-3.5 py-2 text-sm text-[#0b192c] focus:outline-none focus:border-[#ff5a5f] focus:ring-2 focus:ring-[#ff5a5f]/20 font-mono w-44 transition-all h-10 shadow-[inset_0_1px_3px_rgba(11,25,44,0.04)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-5 bg-[#ff5a5f] hover:bg-[#e84e53] active:scale-[0.98] text-white rounded-[12px] text-sm font-extrabold transition-all flex items-center space-x-1.5 shadow-[0_4px_14px_rgba(255,90,95,0.30)] hover:shadow-[0_6px_18px_rgba(255,90,95,0.35)] cursor-pointer disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {loading && !item && (
        <div className="h-64 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
      )}

      {item && (
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 border-b border-[rgba(11,25,44,0.06)] pb-5">
            {/* Poster Card */}
            <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-[12px] overflow-hidden bg-[#f3eee5] border border-[rgba(11,25,44,0.08)] flex-shrink-0 relative shadow-sm flex items-center justify-center">
              {item.poster_url ? (
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
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
                className={`w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#f3eee5] ${
                  item.poster_url ? "hidden" : "flex"
                }`}
              >
                <Film className="w-8 h-8 text-[#788699]/50 mb-1" />
                <span className="text-[10px] font-mono text-[#788699] font-bold">
                  {item.release_year || "Movie"}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono font-extrabold text-[#788699]">ITEM #{item.item_id}</div>
                <h3 className="text-xl font-extrabold text-[#0b192c] mt-1 tracking-tight">{item.title}</h3>
                <p className="text-xs text-[#788699] mt-1 font-mono font-medium">Release Year: {item.release_year}</p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs text-[#788699] font-medium">Catalog Mean Rating</div>
                <div className="text-xl font-black text-[#0b192c] flex items-center sm:justify-end space-x-1 mt-0.5 tabular-nums">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{item.average_rating}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-[14px] bg-[#f3eee5]/80 border border-[rgba(11,25,44,0.06)]">
              <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
                <Tag className="w-3.5 h-3.5 text-[#ff5a5f]" />
                <span>Primary Category</span>
              </div>
              <div className="text-sm font-extrabold text-[#0b192c] mt-2">{item.primary_category}</div>
            </div>

            <div className="p-4 rounded-[14px] bg-[#f3eee5]/80 border border-[rgba(11,25,44,0.06)]">
              <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Rating Count</span>
              </div>
              <div className="text-sm font-extrabold text-[#0b192c] mt-2 tabular-nums font-mono">
                {item.interaction_count} ratings
              </div>
            </div>

            <div className="p-4 rounded-[14px] bg-[#f3eee5]/80 border border-[rgba(11,25,44,0.06)]">
              <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
                <BarChart3 className="w-3.5 h-3.5 text-[#ff5a5f]" />
                <span>Popularity Index</span>
              </div>
              <div className="text-sm font-black text-[#ff5a5f] mt-2 tabular-nums font-mono">
                {item.popularity_score.toFixed(3)}
              </div>
            </div>

            <div className="p-4 rounded-[14px] bg-[#f3eee5]/80 border border-[rgba(11,25,44,0.06)]">
              <div className="text-[#788699] flex items-center space-x-1.5 font-bold">
                <Hash className="w-3.5 h-3.5 text-[#788699]" />
                <span>Vector Dimension</span>
              </div>
              <div className="text-sm font-extrabold text-[#0b192c] mt-2 font-mono">64-dim L2</div>
            </div>
          </div>

          {/* Categorical Tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-[#0b192c] uppercase tracking-wider font-mono">
              Categorical Attributes
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.categories.map((c: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-[#f3eee5] text-[#475569] border border-[rgba(11,25,44,0.08)] text-xs font-semibold"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
