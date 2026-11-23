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

const DCN_CORAL = "#F05A36";
const BASELINE_GRAY = "#A8A29E";

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
            <div key={i} className="h-36 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs" />
          ))}
        </div>
        <div className="h-80 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs" />
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
        <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#78716C] mb-2">
              <span className="font-mono text-[10px] uppercase font-bold text-[#57534E] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE5DC]">
                Stage 1 Retrieval
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-[#1C1917] mt-1">Two-Tower Network</h3>
            <p className="text-xs text-[#78716C] mt-0.5">Dual 64-dim embedding towers with cosine candidate search</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F5F2EB] grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#78716C] block text-[11px]">Vector Dim</span>
              <span className="font-bold text-[#1C1917] tabular-nums font-mono">64 (L2 Norm)</span>
            </div>
            <div>
              <span className="text-[#78716C] block text-[11px]">FAISS Corpus</span>
              <span className="font-bold text-[#1C1917] tabular-nums font-mono">9,742 items</span>
            </div>
          </div>
        </div>

        {/* DCN-v2 (Production Champion in PyMaster Coral) */}
        <div className="p-5 rounded-lg border border-[#FCDAD1] bg-[#FFF0EB]/30 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#D93815] mb-2">
              <span className="font-mono text-[10px] uppercase font-bold text-[#D93815] bg-[#FFF0EB] px-2 py-0.5 rounded border border-[#FCDAD1]">
                Stage 2 Production
              </span>
              <span className="text-xs font-bold text-[#F05A36] font-mono">CHAMPION</span>
            </div>
            <h3 className="text-sm font-bold text-[#1C1917] mt-1">Deep & Cross Network (DCN-v2)</h3>
            <p className="text-xs text-[#78716C] mt-0.5">Explicit polynomial cross layers joined with deep MLP</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#FCDAD1]/60 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#78716C] block text-[11px]">Validation AUC</span>
              <span className="font-bold text-[#F05A36] tabular-nums font-mono">0.8782</span>
            </div>
            <div>
              <span className="text-[#78716C] block text-[11px]">Accuracy</span>
              <span className="font-bold text-[#1C1917] tabular-nums font-mono">86.12%</span>
            </div>
          </div>
        </div>

        {/* Wide & Deep */}
        <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#78716C] mb-2">
              <span className="font-mono text-[10px] uppercase font-bold text-[#57534E] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE5DC]">
                Stage 2 Baseline
              </span>
              <span className="text-xs font-medium text-[#78716C] font-mono">REFERENCE</span>
            </div>
            <h3 className="text-sm font-bold text-[#1C1917] mt-1">Wide & Deep Architecture</h3>
            <p className="text-xs text-[#78716C] mt-0.5">Linear memorization paired with deep generalization</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F5F2EB] grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#78716C] block text-[11px]">Validation AUC</span>
              <span className="font-bold text-[#1C1917] tabular-nums font-mono">0.9333</span>
            </div>
            <div>
              <span className="text-[#78716C] block text-[11px]">Accuracy</span>
              <span className="font-bold text-[#1C1917] tabular-nums font-mono">87.35%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart Card */}
      <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5F2EB]">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917]">
              Comparative Benchmark: Wide & Deep vs DCN-v2
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              Evaluated on chronological holdout test set ({metrics.test_users_evaluated} test users)
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#57534E] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#EAE5DC]">
            A/B Offline Split
          </span>
        </div>

        <div className="h-68">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="metric" stroke="#A8A29E" fontSize={11} tickLine={false} />
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
              <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
              <Bar dataKey="Wide & Deep" fill={BASELINE_GRAY} radius={[3, 3, 0, 0]} />
              <Bar dataKey="DCN-v2" fill={DCN_CORAL} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Offline Metrics Table */}
      <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5F2EB]">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917]">Offline Evaluation Report</h3>
            <p className="text-xs text-[#78716C] mt-0.5">Top-10 ranking accuracy, diversity, and novelty metrics</p>
          </div>
          <span className="font-mono text-[11px] text-[#78716C]">K=10 Horizon</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F5F2EB] text-[#78716C]">
                <th className="pb-2.5 font-medium">Metric Dimension</th>
                <th className="pb-2.5 font-medium text-right">Model A (Wide & Deep)</th>
                <th className="pb-2.5 font-medium text-right">Model B (DCN-v2)</th>
                <th className="pb-2.5 font-medium text-right">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EB] text-[#57534E]">
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">NDCG@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.offline_metrics["NDCG@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums font-bold text-[#F05A36] font-mono">
                  {metrics.model_b.offline_metrics["NDCG@10"]}
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Discounted cumulative relevance gain</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">Precision@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.offline_metrics["Precision@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums font-bold text-[#F05A36] font-mono">
                  {metrics.model_b.offline_metrics["Precision@10"]}
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Relevant items in top 10 positions</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">Recall@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.offline_metrics["Recall@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#1C1917] font-mono">
                  {metrics.model_b.offline_metrics["Recall@10"]}
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Proportion of relevant items retrieved</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">MAP@10</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.offline_metrics["MAP@10"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#1C1917] font-mono">
                  {metrics.model_b.offline_metrics["MAP@10"]}
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Mean average precision across holdout users</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">Intra-List Diversity</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.offline_metrics["diversity_score"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#1C1917] font-mono">
                  {metrics.model_b.offline_metrics["diversity_score"]}
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Pairwise genre distance between recommendations</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">Novelty Score</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.offline_metrics["novelty_score"]}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#1C1917] font-mono">
                  {metrics.model_b.offline_metrics["novelty_score"]}
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Self-information of recommended catalog items</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-[#1C1917]">Simulated CTR</td>
                <td className="py-2.5 text-right tabular-nums text-[#78716C] font-mono">
                  {metrics.model_a.simulated_online_metrics.simulated_ctr_percent}%
                </td>
                <td className="py-2.5 text-right tabular-nums font-bold text-[#F05A36] font-mono">
                  {metrics.model_b.simulated_online_metrics.simulated_ctr_percent}%
                </td>
                <td className="py-2.5 text-right text-[#78716C]">Position-discounted click simulation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Observation Box */}
      <div className="p-4 rounded-lg border border-[#FCDAD1] bg-[#FFF0EB] text-xs text-[#1C1917] flex items-start space-x-3">
        <Info className="w-4 h-4 text-[#F05A36] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#1C1917]">Observation: </span>
          <span>{metrics.comparative_analysis.key_finding}</span>
        </div>
      </div>
    </div>
  );
};
