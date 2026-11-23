import React from "react";
import {
  Layers,
  SlidersHorizontal,
  Users,
  Film,
  BarChart3,
  GitBranch,
  Cpu,
  Trash2,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { HealthData } from "../services/api";
import { motion } from "framer-motion";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthData | null;
  onClearCache: () => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  onClearCache,
  onRefresh,
}) => {
  const tabs = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "playground", label: "Recommendations", icon: SlidersHorizontal },
    { id: "users", label: "Users", icon: Users },
    { id: "items", label: "Catalog", icon: Film },
    { id: "models", label: "Model Evaluation", icon: BarChart3 },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "architecture", label: "System Architecture", icon: Cpu },
  ];

  const isHealthy = health?.status === "healthy";

  return (
    <header className="sticky top-0 z-50 bg-[#faf7f2]/92 backdrop-blur-xl border-b border-[rgba(11,25,44,0.08)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[58px]">
          {/* Brand with PyMaster Coral accent */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[12px] bg-[#ff5a5f] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(255,90,95,0.30)]">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold text-[#0b192c] tracking-tight">
                  Recommendation Engine
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-[#ff5a5f]/10 text-[#ff5a5f] border border-[#ff5a5f]/25">
                  CONSOLE
                </span>
              </div>
              <span className="block text-[11px] text-[#788699] font-medium">
                Candidate Retrieval & Neural Ranking Environment
              </span>
            </div>
          </div>

          {/* Telemetry and Controls */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Status Telemetry Pill with Green Preserved */}
            <div className="hidden sm:flex items-center space-x-2.5 bg-white border border-[rgba(11,25,44,0.08)] px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] text-[#475569]">
              <span
                className={`inline-flex rounded-full h-2 w-2 ${
                  isHealthy
                    ? "bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                    : "bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.35)]"
                }`}
              />
              <span className="font-bold text-[#0b192c]">
                {isHealthy ? "Ready" : "Degraded"}
              </span>
              <span className="text-[rgba(11,25,44,0.15)]">|</span>
              <span className="tabular-nums font-mono text-[#475569] font-medium">
                {health?.vector_search?.total_items?.toLocaleString() || 0} vectors
              </span>
              <span className="text-[rgba(11,25,44,0.15)]">|</span>
              <span className="tabular-nums font-mono text-[#10b981] font-bold">
                {health?.cache?.hit_ratio_percent || 0}% hit
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1.5 pl-2 border-l border-[rgba(11,25,44,0.08)]">
              <button
                onClick={onClearCache}
                title="Clear Cache Buffer"
                className="w-8 h-8 rounded-full bg-white border border-[rgba(11,25,44,0.08)] shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] flex items-center justify-center text-[#788699] hover:text-[#0b192c] hover:border-[#ff5a5f] hover:-translate-y-0.5 active:scale-95 transition-all"
                aria-label="Flush Cache"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRefresh}
                title="Refresh Metrics"
                className="w-8 h-8 rounded-full bg-white border border-[rgba(11,25,44,0.08)] shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] flex items-center justify-center text-[#788699] hover:text-[#0b192c] hover:border-[#ff5a5f] hover:-translate-y-0.5 active:scale-95 transition-all"
                aria-label="Refresh Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* PyMaster Nav Tabs */}
        <nav className="flex space-x-1.5 overflow-x-auto pt-1.5 pb-2.5 scrollbar-none relative border-t border-[rgba(11,25,44,0.06)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap z-10 ${
                  isActive
                    ? "text-[#faf7f2] font-bold shadow-[0_2px_8px_rgba(11,25,44,0.15)] bg-[#0b192c] border border-[#0b192c]"
                    : "text-[#475569] font-semibold hover:text-[#0b192c] hover:bg-white/80 border border-transparent hover:border-[rgba(11,25,44,0.08)] hover:shadow-xs"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-[#ff5a5f]" : "text-[#788699]"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
