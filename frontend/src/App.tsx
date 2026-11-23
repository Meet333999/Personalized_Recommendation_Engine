import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { OverviewTab } from "./components/OverviewTab";
import { PlaygroundTab } from "./components/PlaygroundTab";
import { UserExplorerTab } from "./components/UserExplorerTab";
import { ItemExplorerTab } from "./components/ItemExplorerTab";
import { ModelPerformanceTab } from "./components/ModelPerformanceTab";
import { PipelineMonitorTab } from "./components/PipelineMonitorTab";
import { ArchitectureTab } from "./components/ArchitectureTab";
import { api, HealthData, OverviewData } from "./services/api";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchGlobalData = async () => {
    try {
      const [hData, oData] = await Promise.all([api.getHealth(), api.getOverview()]);
      setHealth(hData);
      setOverview(oData);
    } catch (e) {
      console.error("Initial load failed:", e);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    try {
      await api.clearCache();
      setBanner({ type: "success", text: "Recommendation cache buffer cleared successfully." });
      setTimeout(() => setBanner(null), 3000);
      fetchGlobalData();
    } catch (e: any) {
      setBanner({ type: "error", text: "Failed to clear cache buffer: " + e.message });
      setTimeout(() => setBanner(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col font-sans selection:bg-[#F05A36]/15">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onClearCache={handleClearCache}
        onRefresh={fetchGlobalData}
      />

      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className={`px-4 py-2 text-xs font-medium border-b flex items-center justify-center space-x-2 z-40 ${
              banner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {banner.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
            )}
            <span>{banner.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "overview" && <OverviewTab overview={overview} health={health} />}
        {activeTab === "playground" && <PlaygroundTab />}
        {activeTab === "users" && <UserExplorerTab />}
        {activeTab === "items" && <ItemExplorerTab />}
        {activeTab === "models" && <ModelPerformanceTab />}
        {activeTab === "pipeline" && <PipelineMonitorTab />}
        {activeTab === "architecture" && <ArchitectureTab />}
      </main>

      <footer className="border-t border-[#EAE5DC] bg-white py-4 text-xs text-[#78716C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-medium text-[#1C1917]">Recommendation Engine Console</span>
            <span className="text-[#D6D1C7]">|</span>
            <span className="font-mono text-[11px] text-[#78716C]">Core Runtime 2.16.2</span>
          </div>
          <div className="flex items-center space-x-3 text-[#78716C] font-mono text-[11px]">
            <span>FAISS IndexFlatIP</span>
            <span>•</span>
            <span className="text-[#F05A36] font-semibold">DCN-v2 Ranker</span>
            <span>•</span>
            <span>Spark Feature Store</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
