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
      <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-[#1C1917] flex items-center space-x-2">
              <Film className="w-4 h-4 text-[#F05A36]" />
              <span>Catalog Items</span>
            </h2>
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#FFF0EB] text-[#D93815] border border-[#FCDAD1]">
              CORPUS
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Inspect item vector parameters, metadata attributes, and popularity scores
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="Item ID (e.g. 1, 260)"
            className="bg-white border border-[#EAE5DC] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F05A36] focus:ring-1 focus:ring-[#F05A36] font-mono w-40 transition-colors h-10"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-4 bg-[#F05A36] hover:bg-[#E04826] active:bg-[#D03E1C] text-white rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5 disabled:opacity-50 shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {loading && !item && (
        <div className="h-64 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs" />
      )}

      {item && (
        <div className="p-6 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#F5F2EB] pb-5">
            <div>
              <div className="text-xs font-mono font-bold text-[#78716C]">Item #{item.item_id}</div>
              <h3 className="text-xl font-bold text-[#1C1917] mt-1">{item.title}</h3>
              <p className="text-xs text-[#78716C] mt-1 font-mono">Release Year: {item.release_year}</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-[#78716C]">Catalog Mean Rating</div>
              <div className="text-xl font-bold text-[#1C1917] flex items-center sm:justify-end space-x-1 mt-0.5 tabular-nums">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{item.average_rating}</span>
              </div>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="text-[#78716C] flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#F05A36]" />
                <span>Primary Category</span>
              </div>
              <div className="text-sm font-bold text-[#1C1917] mt-2">{item.primary_category}</div>
            </div>

            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="text-[#78716C] flex items-center space-x-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Rating Count</span>
              </div>
              <div className="text-sm font-bold text-[#1C1917] mt-2 tabular-nums font-mono">
                {item.interaction_count} ratings
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="text-[#78716C] flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#F05A36]" />
                <span>Popularity Index</span>
              </div>
              <div className="text-sm font-bold text-[#D93815] mt-2 tabular-nums font-mono">
                {item.popularity_score.toFixed(3)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="text-[#78716C] flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5 text-[#78716C]" />
                <span>Vector Dimension</span>
              </div>
              <div className="text-sm font-bold text-[#1C1917] mt-2 font-mono">64-dim L2</div>
            </div>
          </div>

          {/* Genre Tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#57534E] uppercase tracking-wider">
              Categorical Attributes
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.categories.map((c: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-[#FAF8F5] text-[#57534E] border border-[#EAE5DC] text-xs font-medium"
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
