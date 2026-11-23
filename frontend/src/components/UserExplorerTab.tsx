import React, { useState, useEffect } from "react";
import { Users, Search, History, Star, Heart, Film } from "lucide-react";
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
      <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-extrabold text-[#0b192c] flex items-center space-x-2 tracking-tight">
              <Users className="w-4 h-4 text-[#ff5a5f]" />
              <span>User Profiles</span>
            </h2>
            <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ff5a5f]/10 text-[#ff5a5f] border border-[#ff5a5f]/25">
              LOOKUP
            </span>
          </div>
          <p className="text-xs text-[#788699] mt-0.5">
            Inspect individual interaction records, category affinities, and ratings
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (e.g. 1)"
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

      {loading && !profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
          ))}
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-5 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)]">
            <div className="text-[#788699] uppercase tracking-wider text-[11px] font-bold font-mono">User Identifier</div>
            <div className="text-xl font-black text-[#0b192c] mt-1.5 font-mono">#{profile.user_id}</div>
          </div>
          <div className="p-5 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)]">
            <div className="text-[#788699] uppercase tracking-wider text-[11px] font-bold font-mono">Recorded Ratings</div>
            <div className="text-xl font-black text-[#0b192c] mt-1.5 tabular-nums font-mono">
              {profile.interaction_count}
            </div>
          </div>
          <div className="p-5 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)]">
            <div className="text-[#788699] uppercase tracking-wider text-[11px] font-bold font-mono">Mean Rating</div>
            <div className="text-xl font-black text-[#0b192c] mt-1.5 tabular-nums flex items-center space-x-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{profile.average_rating}</span>
            </div>
          </div>
          <div className="p-5 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)]">
            <div className="text-[#788699] uppercase tracking-wider text-[11px] font-bold font-mono">Top Affinity</div>
            <div className="text-xl font-black text-[#ff5a5f] mt-1.5 truncate">
              {profile.top_preferred_category}
            </div>
          </div>
        </div>
      )}

      {/* Category Affinities with PyMaster Progress Bars */}
      {preferences && (
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(11,25,44,0.06)]">
            <h3 className="text-xs font-extrabold text-[#0b192c] uppercase tracking-wider flex items-center space-x-2 font-mono">
              <Heart className="w-3.5 h-3.5 text-[#ff5a5f]" />
              <span>Inferred Category Affinities</span>
            </h3>
            <span className="font-mono text-[11px] font-bold text-[#788699]">Distribution %</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(preferences.category_affinity_breakdown || preferences.category_affinity || {}).map(([cat, score]: any) => (
              <div key={cat} className="p-3.5 rounded-[14px] bg-[#f3eee5]/80 border border-[rgba(11,25,44,0.06)]">
                <div className="text-xs font-bold text-[#0b192c] truncate">{cat}</div>
                <div className="text-base font-black text-[#0b192c] mt-1 tabular-nums font-mono">
                  {(score * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-[#ede7dc] h-2 rounded-full mt-2.5 overflow-hidden border border-[rgba(11,25,44,0.06)]">
                  <div
                    className="bg-[#ff5a5f] h-full rounded-full transition-all duration-300"
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
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(11,25,44,0.06)]">
            <h3 className="text-xs font-extrabold text-[#0b192c] uppercase tracking-wider flex items-center space-x-2 font-mono">
              <History className="w-3.5 h-3.5 text-[#ff5a5f]" />
              <span>Recent Interactions ({history.total_interactions || (Array.isArray(history) ? history.length : 0)})</span>
            </h3>
            <span className="text-xs text-[#788699] font-mono font-medium">Chronological Sequence</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(11,25,44,0.06)] text-[#788699]">
                  <th className="pb-3 font-bold w-16 font-mono">Item ID</th>
                  <th className="pb-3 font-bold">Title</th>
                  <th className="pb-3 font-bold">Category</th>
                  <th className="pb-3 font-bold text-right">Rating</th>
                  <th className="pb-3 font-bold text-right font-mono">Recency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(11,25,44,0.04)] text-[#475569]">
                {(Array.isArray(history) ? history : history.history || []).map((int: any) => (
                  <tr key={int.item_id} className="hover:bg-[#f3eee5]/50 transition-colors">
                    <td className="py-2.5 font-mono text-[#788699] font-bold">#{int.item_id}</td>
                    <td className="py-2.5 font-bold text-[#0b192c]">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-9 rounded-[5px] overflow-hidden bg-[#f3eee5] border border-[rgba(11,25,44,0.06)] flex-shrink-0 flex items-center justify-center shadow-2xs">
                          {int.poster_url ? (
                            <img
                              src={int.poster_url}
                              alt={int.title}
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
                          <div className={`w-full h-full items-center justify-center bg-[#f3eee5] ${int.poster_url ? "hidden" : "flex"}`}>
                            <Film className="w-3 h-3 text-[#788699]/60" />
                          </div>
                        </div>
                        <span className="truncate">{int.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#f3eee5] text-[#475569] border border-[rgba(11,25,44,0.08)] font-semibold">
                        {int.primary_category}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span className="inline-flex items-center space-x-1 text-[#0b192c] font-black">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                        <span>{int.rating}</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono font-medium">
                      {int.recency_days !== undefined ? `${int.recency_days}d ago` : "Logged"}
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
