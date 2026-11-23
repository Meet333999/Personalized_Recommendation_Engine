import React, { useState, useEffect } from "react";
import {
  GitBranch,
  Play,
  CheckCircle2,
  Clock,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { api, PipelineStatus, PipelineStage } from "../services/api";

export const PipelineMonitorTab: React.FC = () => {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const fetchPipeline = async () => {
    try {
      const data = await api.getPipelineStatus();
      setPipeline(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetrain = async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await api.triggerRetraining();
      setTriggerMsg(res.message);
      fetchPipeline();
    } catch (err: any) {
      setTriggerMsg(err.message || "Failed to trigger pipeline");
    } finally {
      setTriggering(false);
    }
  };

  if (loading && !pipeline) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="p-5 rounded-lg border border-[#EAE5DC] bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-bold text-[#1C1917] flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-[#F05A36]" />
              <span>Retraining Pipeline</span>
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                pipeline?.is_running
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {pipeline?.overall_status?.toUpperCase() || "IDLE"}
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Sequential 12-task pipeline for data ingestion, feature extraction, model retraining, and evaluation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPipeline}
            className="p-2 bg-[#FAF8F5] text-[#57534E] hover:text-[#1C1917] rounded-lg border border-[#EAE5DC] transition-colors"
            title="Refresh status"
            aria-label="Refresh pipeline status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRetrain}
            disabled={triggering || pipeline?.is_running}
            className="h-10 px-4 bg-[#F05A36] hover:bg-[#E04826] active:bg-[#D03E1C] text-white rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{pipeline?.is_running ? "Retraining in progress..." : "Trigger Retraining"}</span>
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div className="p-3.5 rounded-lg bg-[#FFF0EB] border border-[#FCDAD1] text-[#1C1917] text-xs flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#F05A36] flex-shrink-0" />
          <span>{triggerMsg}</span>
        </div>
      )}

      {/* 12-Stage Grid with Green Preserved for Completed Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pipeline?.stages?.map((stage: PipelineStage) => {
          const isDone = stage.status === "completed";
          const isRun = stage.status === "running";
          const isFail = stage.status === "failed";

          return (
            <div
              key={stage.id}
              className={`p-4 rounded-lg border transition-colors flex flex-col justify-between ${
                isDone
                  ? "bg-white border-[#EAE5DC] shadow-2xs"
                  : isRun
                  ? "bg-amber-50/40 border-amber-300 shadow-2xs"
                  : isFail
                  ? "bg-rose-50/40 border-rose-300 shadow-2xs"
                  : "bg-white/60 border-[#EAE5DC]/60 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-5 h-5 rounded bg-[#FAF8F5] flex items-center justify-center text-[11px] font-mono font-bold text-[#57534E] tabular-nums border border-[#EAE5DC]">
                    {stage.id}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${
                      isDone
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : isRun
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : isFail
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-[#FAF8F5] text-[#78716C]"
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#1C1917]">{stage.name}</h4>
                <p className="text-[11px] text-[#78716C] mt-1 line-clamp-2 leading-relaxed">
                  {stage.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-[#F5F2EB] flex items-center justify-between text-xs text-[#78716C]">
                <span className="flex items-center space-x-1 tabular-nums font-mono text-[11px]">
                  <Clock className="w-3 h-3 text-[#A8A29E]" />
                  <span>{stage.duration_s ? `${stage.duration_s}s` : "Pending"}</span>
                </span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
