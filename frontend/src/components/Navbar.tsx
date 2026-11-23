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
    <header className="border-b border-[#EAE5DC] bg-white sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Brand with PyMaster Coral accent */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#F05A36] text-white flex items-center justify-center shadow-xs">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-[#1C1917] tracking-tight">
                  Recommendation Engine
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#FFF0EB] text-[#D93815] border border-[#FCDAD1]">
                  CONSOLE
                </span>
              </div>
              <span className="block text-[11px] text-[#78716C]">
                Candidate Retrieval & Neural Ranking Environment
              </span>
            </div>
          </div>

          {/* Telemetry and Controls */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Status Telemetry Pill with Green Preserved */}
            <div className="hidden sm:flex items-center space-x-2.5 bg-[#FAF8F5] border border-[#EAE5DC] px-3 py-1.5 rounded-lg text-[#57534E]">
              <span
                className={`inline-flex rounded-full h-2 w-2 ${
                  isHealthy ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="font-semibold text-emerald-800">
                {isHealthy ? "Ready" : "Degraded"}
              </span>
              <span className="text-[#D6D1C7]">|</span>
              <span className="tabular-nums font-mono text-[#57534E]">
                {health?.vector_search?.total_items?.toLocaleString() || 0} vectors
              </span>
              <span className="text-[#D6D1C7]">|</span>
              <span className="tabular-nums font-mono text-emerald-700 font-semibold">
                {health?.cache?.hit_ratio_percent || 0}% hit
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 pl-2 border-l border-[#EAE5DC]">
              <button
                onClick={onClearCache}
                title="Clear Cache Buffer"
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-md transition-colors"
                aria-label="Flush Cache"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onRefresh}
                title="Refresh Metrics"
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-md transition-colors"
                aria-label="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Coral Active Tab Indicator */}
        <nav className="flex space-x-1 overflow-x-auto pt-1 pb-2 scrollbar-none relative border-t border-[#F5F2EB]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap z-10 ${
                  isActive
                    ? "text-[#D93815] font-semibold"
                    : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#FFF0EB] border border-[#FCDAD1] rounded-md -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-[#F05A36]" : "text-[#A8A29E]"
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
