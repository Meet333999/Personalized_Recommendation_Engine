import React from "react";
import {
  Users,
  Film,
  Zap,
  TrendingUp,
  HardDrive,
  Database,
  Star,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { OverviewData, HealthData } from "../services/api";

interface OverviewTabProps {
  overview: OverviewData | null;
  health: HealthData | null;
}

const CORAL_COLOR = "#ff5a5f";

export const OverviewTab: React.FC<OverviewTabProps> = ({ overview, health }) => {
  if (!overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-88 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
          <div className="h-88 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Indexed Users",
      value: overview.total_users.toLocaleString(),
      detail: "Active profiles",
      icon: Users,
      badge: "Profiles",
      valueColor: "text-[#0b192c]",
    },
    {
      label: "Catalog Items",
      value: overview.total_items.toLocaleString(),
      detail: "Vectorized corpus",
      icon: Film,
      badge: "Corpus",
      valueColor: "text-[#0b192c]",
    },
    {
      label: "Interactions",
      value: overview.total_interactions.toLocaleString(),
      detail: "Evaluated events",
      icon: Zap,
      badge: "Logs",
      valueColor: "text-[#0b192c]",
    },
    {
      label: "Avg Activity",
      value: overview.average_interactions_per_user.toFixed(1),
      detail: "Interactions / user",
      icon: TrendingUp,
      badge: "Density",
      valueColor: "text-[#0b192c]",
    },
    {
      label: "FAISS Index",
      value: (health?.vector_search?.total_items || 9742).toLocaleString(),
      detail: "64-dim embeddings",
      icon: HardDrive,
      badge: "IndexFlatIP",
      valueColor: "text-[#10b981]",
    },
    {
      label: "Cache Buffer",
      value: `${health?.cache?.hit_ratio_percent || 0}%`,
      detail: `${health?.cache?.hits || 0} hits / ${health?.cache?.misses || 0} misses`,
      icon: Database,
      badge: "Active",
      valueColor: "text-[#10b981]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] hover:border-[#ff5a5f]/40 hover:shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)] transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[#788699]">
                <span className="text-[11px] font-bold text-[#788699] uppercase tracking-wider font-mono">
                  {kpi.label}
                </span>
                <span className="w-7 h-7 rounded-[10px] bg-[#f3eee5] border border-[rgba(11,25,44,0.06)] text-[#0b192c] flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-black tracking-tight tabular-nums ${kpi.valueColor}`}>
                  {kpi.value}
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-[#788699]">
                  <span className="font-medium">{kpi.detail}</span>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f3eee5] text-[#475569]">
                    {kpi.badge}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interaction Distribution Chart in PyMaster Coral */}
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(11,25,44,0.06)]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[10px] font-extrabold text-[#ff5a5f] uppercase tracking-wider">
                  TELEMETRY
                </span>
              </div>
              <h3 className="text-base font-extrabold text-[#0b192c] tracking-tight">Interaction Volume by Category</h3>
              <p className="text-xs text-[#788699] mt-0.5">Distribution of user events grouped by primary genre</p>
            </div>
            <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ff5a5f]/10 border border-[#ff5a5f]/25 text-[#ff5a5f]">
              Aggregated
            </span>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.most_popular_categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="category"
                  stroke="#788699"
                  fontSize={11}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#788699" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "rgba(11, 25, 44, 0.08)",
                    borderRadius: "12px",
                    color: "#0b192c",
                    fontSize: "12px",
                    boxShadow: "0 4px 20px -2px rgba(11, 25, 44, 0.08)",
                  }}
                  cursor={{ fill: "rgba(255, 90, 95, 0.04)" }}
                />
                <Bar dataKey="total_interactions" radius={[6, 6, 0, 0]} fill={CORAL_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Interacted Items Table */}
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(11,25,44,0.06)]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] font-extrabold text-[#ff5a5f] uppercase tracking-wider">
                    CORPUS
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#0b192c] tracking-tight">High Volume Catalog Items</h3>
                <p className="text-xs text-[#788699] mt-0.5">Items with the highest volume of recorded user ratings</p>
              </div>
              <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#f3eee5] border border-[rgba(11,25,44,0.08)] text-[#475569]">
                Top Rated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(11,25,44,0.06)] text-[#788699]">
                    <th className="pb-3 font-bold w-10 font-mono">#</th>
                    <th className="pb-3 font-bold">Title</th>
                    <th className="pb-3 font-bold">Category</th>
                    <th className="pb-3 font-bold text-right font-mono">Ratings</th>
                    <th className="pb-3 font-bold text-right">Mean</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(11,25,44,0.04)] text-[#475569]">
                  {overview.most_popular_items.map((item, idx) => (
                    <tr key={item.item_id} className="hover:bg-[#f3eee5]/50 transition-colors">
                      <td className="py-2.5 text-[#788699] font-mono tabular-nums font-bold">{idx + 1}</td>
                      <td className="py-2.5 font-bold text-[#0b192c] max-w-xs truncate" title={item.title}>
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-10 rounded-[6px] overflow-hidden bg-[#f3eee5] border border-[rgba(11,25,44,0.06)] flex-shrink-0 flex items-center justify-center shadow-2xs">
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
                            <div className={`w-full h-full items-center justify-center bg-[#f3eee5] ${item.poster_url ? "hidden" : "flex"}`}>
                              <Film className="w-3.5 h-3.5 text-[#788699]/60" />
                            </div>
                          </div>
                          <span className="truncate">{item.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f3eee5] text-[#475569] border border-[rgba(11,25,44,0.08)]">
                          {item.primary_category}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono font-medium">
                        {item.rating_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-bold text-[#0b192c] tabular-nums">
                        <span className="inline-flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                          <span>{item.average_rating.toFixed(1)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
