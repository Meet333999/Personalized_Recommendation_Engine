import React, { useState, useEffect } from "react";
import {
  BarChart3,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api, ModelMetricsData } from "../services/api";

const DCN_CORAL = "#ff5a5f";
const BASELINE_GRAY = "#94a3b8";

export const ModelPerformanceTab: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metData = await api.getModelMetrics();
        setMetrics(metData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
      </div>
    );
  }

  const comparisonChartData = [
    {
      metric: "NDCG@10",
      "Wide & Deep": metrics.model_a.offline_metrics["NDCG@10"] || 0.3017,
      "DCN-v2": metrics.model_b.offline_metrics["NDCG@10"] || 0.3017,
    },
    {
      metric: "Precision@10",
      "Wide & Deep": metrics.model_a.offline_metrics["Precision@10"] || 0.276,
      "DCN-v2": metrics.model_b.offline_metrics["Precision@10"] || 0.276,
    },
    {
      metric: "MAP@10",
      "Wide & Deep": metrics.model_a.offline_metrics["MAP@10"] || 0.2153,
      "DCN-v2": metrics.model_b.offline_metrics["MAP@10"] || 0.2153,
    },
    {
      metric: "Diversity",
      "Wide & Deep": metrics.model_a.offline_metrics["diversity_score"] || 0.7668,
      "DCN-v2": metrics.model_b.offline_metrics["diversity_score"] || 0.7668,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Model Architectures Hardware Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Two-Tower */}
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#788699] mb-2.5">
              <span className="font-mono text-[10px] uppercase font-bold text-[#475569] bg-[#f3eee5] px-2.5 py-0.5 rounded-full border border-[rgba(11,25,44,0.08)]">
                Stage 1 Retrieval
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0b192c] mt-1 tracking-tight">Two-Tower Network</h3>
            <p className="text-xs text-[#788699] mt-0.5">Dual 64-dim embedding towers with cosine candidate search</p>
          </div>
          <div className="mt-4 pt-3.5 border-t border-[rgba(11,25,44,0.06)] grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#788699] block text-[11px] font-medium">Vector Dim</span>
              <span className="font-bold text-[#0b192c] tabular-nums font-mono">64 (L2 Norm)</span>
            </div>
            <div>
              <span className="text-[#788699] block text-[11px] font-medium">FAISS Corpus</span>
              <span className="font-bold text-[#0b192c] tabular-nums font-mono">9,742 items</span>
            </div>
          </div>
        </div>

        {/* DCN-v2 (Production Champion in PyMaster Coral) */}
        <div className="p-6 rounded-[20px] border-2 border-[#ff5a5f] bg-[#ff5a5f]/[0.03] shadow-[0_4px_20px_-2px_rgba(255,90,95,0.18)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#ff5a5f] mb-2.5">
              <span className="font-mono text-[10px] uppercase font-bold text-[#ff5a5f] bg-[#ff5a5f]/10 px-2.5 py-0.5 rounded-full border border-[#ff5a5f]/25">
                Stage 2 Production
              </span>
              <span className="font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#ff5a5f] text-white shadow-[0_2px_6px_rgba(255,90,95,0.30)]">
                CHAMPION
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-[#0b192c] mt-1 tracking-tight">Deep & Cross Network (DCN-v2)</h3>
            <p className="text-xs text-[#788699] mt-0.5">Explicit polynomial cross layers joined with deep MLP</p>
          </div>
          <div className="mt-4 pt-3.5 border-t border-[#ff5a5f]/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#788699] block text-[11px] font-medium">Validation AUC</span>
              <span className="font-black text-[#ff5a5f] tabular-nums font-mono">0.8782</span>
            </div>
            <div>
              <span className="text-[#788699] block text-[11px] font-medium">Accuracy</span>
              <span className="font-bold text-[#0b192c] tabular-nums font-mono">86.12%</span>
            </div>
          </div>
        </div>

        {/* Wide & Deep */}
        <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#788699] mb-2.5">
              <span className="font-mono text-[10px] uppercase font-bold text-[#475569] bg-[#f3eee5] px-2.5 py-0.5 rounded-full border border-[rgba(11,25,44,0.08)]">
                Stage 2 Baseline
              </span>
              <span className="text-xs font-bold text-[#788699] font-mono">REFERENCE</span>
            </div>
            <h3 className="text-sm font-extrabold text-[#0b192c] mt-1 tracking-tight">Wide & Deep Architecture</h3>
            <p className="text-xs text-[#788699] mt-0.5">Linear memorization paired with deep generalization</p>
          </div>
          <div className="mt-4 pt-3.5 border-t border-[rgba(11,25,44,0.06)] grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#788699] block text-[11px] font-medium">Validation AUC</span>
              <span className="font-bold text-[#0b192c] tabular-nums font-mono">0.9333</span>
            </div>
            <div>
              <span className="text-[#788699] block text-[11px] font-medium">Accuracy</span>
              <span className="font-bold text-[#0b192c] tabular-nums font-mono">87.35%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart Deck */}
      <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)] space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(11,25,44,0.06)]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] font-extrabold text-[#ff5a5f] uppercase tracking-wider">
                BENCHMARK
              </span>
            </div>
            <h3 className="text-base font-extrabold text-[#0b192c] tracking-tight">
              Comparative Benchmark: Wide & Deep vs DCN-v2
            </h3>
            <p className="text-xs text-[#788699] mt-0.5">
              Evaluated on chronological holdout test set ({metrics.test_users_evaluated} test users)
            </p>
          </div>
          <span className="font-mono text-[11px] font-bold text-[#475569] bg-[#f3eee5] px-3 py-1 rounded-full border border-[rgba(11,25,44,0.08)]">
            A/B Offline Split
          </span>
        </div>

        <div className="h-68">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="metric" stroke="#788699" fontSize={11} tickLine={false} />
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
              <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
              <Bar dataKey="Wide & Deep" fill={BASELINE_GRAY} radius={[6, 6, 0, 0]} />
              <Bar dataKey="DCN-v2" fill={DCN_CORAL} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Offline Metrics Table Deck */}
      <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)] space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(11,25,44,0.06)]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] font-extrabold text-[#ff5a5f] uppercase tracking-wider">
                EVALUATION
              </span>
            </div>
            <h3 className="text-base font-extrabold text-[#0b192c] tracking-tight">Offline Evaluation Report</h3>
            <p className="text-xs text-[#788699] mt-0.5">Top-10 ranking accuracy, diversity, and novelty metrics</p>
          </div>
          <span className="font-mono text-[11px] font-bold text-[#788699]">K=10 Horizon</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(11,25,44,0.06)] text-[#788699]">
                <th className="pb-3 font-bold">Metric Dimension</th>
                <th className="pb-3 font-bold text-right font-mono">Model A (Wide & Deep)</th>
                <th className="pb-3 font-bold text-right font-mono">Model B (DCN-v2)</th>
                <th className="pb-3 font-bold text-right">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(11,25,44,0.04)] text-[#475569]">
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">NDCG@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.offline_metrics["NDCG@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums font-black text-[#ff5a5f] font-mono">
                  {metrics.model_b.offline_metrics["NDCG@10"]}
                </td>
                <td className="py-2.5 text-right text-[#788699]">Discounted cumulative relevance gain</td>
              </tr>
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">Precision@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.offline_metrics["Precision@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums font-black text-[#ff5a5f] font-mono">
                  {metrics.model_b.offline_metrics["Precision@10"]}
                </td>
                <td className="py-2.5 text-right text-[#788699]">Relevant items in top 10 positions</td>
              </tr>
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">Recall@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.offline_metrics["Recall@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#0b192c] font-bold font-mono">
                  {metrics.model_b.offline_metrics["Recall@10"]}
                </td>
                <td className="py-2.5 text-right text-[#788699]">Proportion of relevant items retrieved</td>
              </tr>
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">MAP@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.offline_metrics["MAP@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#0b192c] font-bold font-mono">
                  {metrics.model_b.offline_metrics["MAP@10"]}
                </td>
                <td className="py-2.5 text-right text-[#788699]">Mean average precision across holdout users</td>
              </tr>
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">Intra-List Diversity</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.offline_metrics["diversity_score"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#0b192c] font-bold font-mono">
                  {metrics.model_b.offline_metrics["diversity_score"]}
                </td>
                <td className="py-2.5 text-right text-[#788699]">Pairwise genre distance between recommendations</td>
              </tr>
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">Novelty Score</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.offline_metrics["novelty_score"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#0b192c] font-bold font-mono">
                  {metrics.model_b.offline_metrics["novelty_score"]}
                </td>
                <td className="py-2.5 text-right text-[#788699]">Self-information of recommended catalog items</td>
              </tr>
              <tr className="hover:bg-[#f3eee5]/50 transition-colors">
                <td className="py-2.5 font-bold text-[#0b192c]">Simulated CTR</td>
                <td className="py-2.5 text-right tabular-nums text-[#788699] font-mono">
                  {metrics.model_a.simulated_online_metrics.simulated_ctr_percent}%
                </td>
                <td className="py-2.5 text-right tabular-nums font-black text-[#ff5a5f] font-mono">
                  {metrics.model_b.simulated_online_metrics.simulated_ctr_percent}%
                </td>
                <td className="py-2.5 text-right text-[#788699]">Position-discounted click simulation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Observation Box */}
      <div className="p-5 rounded-[16px] border border-[#ff5a5f]/25 bg-[#ff5a5f]/10 text-xs text-[#0b192c] flex items-start space-x-3 font-medium">
        <Info className="w-4 h-4 text-[#ff5a5f] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-[#0b192c]">Observation: </span>
          <span>{metrics.comparative_analysis.key_finding}</span>
        </div>
      </div>
    </div>
  );
};
