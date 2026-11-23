import React, { useState, useEffect } from "react";
import { Users, Search, History, Star, Heart } from "lucide-react";
import { api } from "../services/api";

export const UserExplorerTab: React.FC = () => {
  const [userId, setUserId] = useState<string>("1");
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUserData = async (id: string) => {
    setLoading(true);
    try {
      const [profData, histData, prefData] = await Promise.all([
        api.getUserProfile(id),
        api.getUserHistory(id, 15),
        api.getUserPreferences(id),
      ]);
      setProfile(profData);
      setHistory(histData);
      setPreferences(prefData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData("1");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      fetchUserData(userId.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-[#1C1917] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#F05A36]" />
              <span>User Profiles</span>
            </h2>
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#FFF0EB] text-[#D93815] border border-[#FCDAD1]">
              LOOKUP
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Inspect individual interaction records, category affinities, and ratings
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (e.g. 1)"
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

      {loading && !profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs" />
          ))}
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs">
            <div className="text-[#78716C] uppercase tracking-wider text-[11px] font-medium">User Identifier</div>
            <div className="text-xl font-bold text-[#1C1917] mt-1 font-mono">#{profile.user_id}</div>
          </div>
          <div className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs">
            <div className="text-[#78716C] uppercase tracking-wider text-[11px] font-medium">Recorded Ratings</div>
            <div className="text-xl font-bold text-[#1C1917] mt-1 tabular-nums font-mono">
              {profile.interaction_count}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs">
            <div className="text-[#78716C] uppercase tracking-wider text-[11px] font-medium">Mean Rating</div>
            <div className="text-xl font-bold text-[#1C1917] mt-1 tabular-nums flex items-center space-x-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{profile.average_rating}</span>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs">
            <div className="text-[#78716C] uppercase tracking-wider text-[11px] font-medium">Top Affinity</div>
            <div className="text-xl font-bold text-[#D93815] mt-1 truncate">
              {profile.top_preferred_category}
            </div>
          </div>
        </div>
      )}

      {/* Category Affinities with Coral Progress Bars */}
      {preferences && (
        <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F2EB]">
            <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center space-x-2">
              <Heart className="w-3.5 h-3.5 text-[#F05A36]" />
              <span>Inferred Category Affinities</span>
            </h3>
            <span className="font-mono text-[11px] text-[#78716C]">Distribution %</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(preferences.category_affinity_breakdown || {}).map(([cat, score]: any) => (
              <div key={cat} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DC]">
                <div className="text-xs font-semibold text-[#1C1917] truncate">{cat}</div>
                <div className="text-base font-bold text-[#1C1917] mt-1 tabular-nums font-mono">
                  {(score * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-[#EAE5DC] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[#F05A36] h-full rounded-full transition-all duration-300"
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Table */}
      {history && (
        <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F2EB]">
            <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center space-x-2">
              <History className="w-3.5 h-3.5 text-[#F05A36]" />
              <span>Recent Interactions ({history.total_interactions})</span>
            </h3>
            <span className="text-xs text-[#78716C] font-mono">Chronological Sequence</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F5F2EB] text-[#78716C]">
                  <th className="pb-2.5 font-medium w-16">Item ID</th>
                  <th className="pb-2.5 font-medium">Title</th>
                  <th className="pb-2.5 font-medium">Category</th>
                  <th className="pb-2.5 font-medium text-right">Rating</th>
                  <th className="pb-2.5 font-medium text-right">Recency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F2EB] text-[#57534E]">
                {history.history.map((int: any) => (
                  <tr key={int.item_id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-2.5 font-mono text-[#78716C]">#{int.item_id}</td>
                    <td className="py-2.5 font-medium text-[#1C1917]">{int.title}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#FAF8F5] text-[#57534E] border border-[#EAE5DC] font-medium">
                        {int.primary_category}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span className="inline-flex items-center space-x-1 text-[#1C1917] font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                        <span>{int.rating}</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                      {int.recency_days}d ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
