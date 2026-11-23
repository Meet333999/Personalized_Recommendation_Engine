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

const CORAL_BAR_COLOR = "#F05A36";

export const OverviewTab: React.FC<OverviewTabProps> = ({ overview, health }) => {
  if (!overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-[#EAE5DC] bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-lg border border-[#EAE5DC] bg-white" />
          <div className="h-80 rounded-lg border border-[#EAE5DC] bg-white" />
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
      valueColor: "text-[#1C1917]",
    },
    {
      label: "Catalog Items",
      value: overview.total_items.toLocaleString(),
      detail: "Vectorized items",
      icon: Film,
      badge: "Corpus",
      valueColor: "text-[#1C1917]",
    },
    {
      label: "Total Interactions",
      value: overview.total_interactions.toLocaleString(),
      detail: "Evaluated events",
      icon: Zap,
      badge: "Logs",
      valueColor: "text-[#1C1917]",
    },
    {
      label: "Interactions/User",
      value: overview.average_interactions_per_user.toFixed(1),
      detail: "Density ratio",
      icon: TrendingUp,
      badge: "Ratio",
      valueColor: "text-[#1C1917]",
    },
    {
      label: "FAISS Vector Index",
      value: (health?.vector_search?.total_items || 9742).toLocaleString(),
      detail: "64-dim embeddings",
      icon: HardDrive,
      badge: "IndexFlatIP",
      valueColor: "text-emerald-700",
    },
    {
      label: "Cache Hit Ratio",
      value: `${health?.cache?.hit_ratio_percent || 0}%`,
      detail: `${health?.cache?.hits || 0} hits / ${health?.cache?.misses || 0} misses`,
      icon: Database,
      badge: "In-Memory",
      valueColor: "text-emerald-700",
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
              className="p-4 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[#78716C]">
                <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
                  {kpi.label}
                </span>
                <span className="p-1 rounded bg-[#FAF8F5] text-[#57534E]">
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold tracking-tight tabular-nums ${kpi.valueColor}`}>
                  {kpi.value}
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-[#78716C]">
                  <span>{kpi.detail}</span>
                  <span className="font-mono text-[10px] text-[#A8A29E]">{kpi.badge}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interaction Distribution Chart in Coral */}
        <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F5F2EB]">
            <div>
              <h3 className="text-sm font-bold text-[#1C1917]">Interaction Volume by Category</h3>
              <p className="text-xs text-[#78716C] mt-0.5">Distribution of user events grouped by primary genre</p>
            </div>
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFF0EB] border border-[#FCDAD1] text-[#D93815]">
              Aggregated
            </span>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.most_popular_categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="category"
                  stroke="#A8A29E"
                  fontSize={11}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#EAE5DC",
                    borderRadius: "6px",
                    color: "#1C1917",
                    fontSize: "12px",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  }}
                  cursor={{ fill: "rgba(240, 90, 54, 0.04)" }}
                />
                <Bar dataKey="total_interactions" radius={[3, 3, 0, 0]} fill={CORAL_BAR_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Interacted Items Table */}
        <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F5F2EB]">
              <div>
                <h3 className="text-sm font-bold text-[#1C1917]">High Volume Catalog Items</h3>
                <p className="text-xs text-[#78716C] mt-0.5">Items with the highest volume of recorded user ratings</p>
              </div>
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#EAE5DC] text-[#57534E]">
                Top Rated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F5F2EB] text-[#78716C]">
                    <th className="pb-2.5 font-medium w-10">#</th>
                    <th className="pb-2.5 font-medium">Title</th>
                    <th className="pb-2.5 font-medium">Category</th>
                    <th className="pb-2.5 font-medium text-right">Ratings</th>
                    <th className="pb-2.5 font-medium text-right">Mean</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F2EB] text-[#57534E]">
                  {overview.most_popular_items.map((item, idx) => (
                    <tr key={item.item_id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-2.5 text-[#A8A29E] font-mono tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-[#1C1917] max-w-xs truncate" title={item.title}>
                        {item.title}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#FAF8F5] text-[#57534E] border border-[#EAE5DC]">
                          {item.primary_category}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                        {item.rating_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-medium text-[#1C1917] tabular-nums">
                        <span className="inline-flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                          <span className="font-semibold">{item.average_rating.toFixed(1)}</span>
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
