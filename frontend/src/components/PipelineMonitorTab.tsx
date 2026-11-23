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
        <div className="h-28 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-36 rounded-[16px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="p-6 rounded-[20px] border border-[rgba(11,25,44,0.08)] bg-white shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-extrabold text-[#0b192c] flex items-center space-x-2 tracking-tight">
              <GitBranch className="w-4 h-4 text-[#ff5a5f]" />
              <span>Retraining Pipeline</span>
            </h2>
            <span
              className={`text-xs px-3 py-0.5 rounded-full font-bold font-mono ${
                pipeline?.is_running
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {pipeline?.overall_status?.toUpperCase() || "IDLE"}
            </span>
          </div>
          <p className="text-xs text-[#788699] mt-1">
            Sequential 12-task pipeline for data ingestion, feature extraction, model retraining, and evaluation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPipeline}
            className="w-9 h-9 rounded-full bg-white border border-[rgba(11,25,44,0.08)] shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)] flex items-center justify-center text-[#788699] hover:text-[#0b192c] hover:border-[#ff5a5f] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
            title="Refresh status"
            aria-label="Refresh pipeline status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRetrain}
            disabled={triggering || pipeline?.is_running}
            className="h-10 px-5 bg-[#ff5a5f] hover:bg-[#e84e53] active:scale-[0.98] text-white rounded-[12px] text-sm font-extrabold transition-all flex items-center space-x-2 shadow-[0_4px_14px_rgba(255,90,95,0.30)] hover:shadow-[0_6px_18px_rgba(255,90,95,0.35)] cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{pipeline?.is_running ? "Retraining in progress..." : "Trigger Retraining"}</span>
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div className="p-4 rounded-[14px] bg-[#ff5a5f]/10 border border-[#ff5a5f]/25 text-[#0b192c] text-xs flex items-center space-x-2 font-medium">
          <Terminal className="w-4 h-4 text-[#ff5a5f] flex-shrink-0" />
          <span>{triggerMsg}</span>
        </div>
      )}

      {/* 12-Stage Grid with PyMaster Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pipeline?.stages?.map((stage: PipelineStage) => {
          const isDone = stage.status === "completed";
          const isRun = stage.status === "running";
          const isFail = stage.status === "failed";

          return (
            <div
              key={stage.id}
              className={`p-5 rounded-[16px] border transition-all flex flex-col justify-between ${
                isDone
                  ? "bg-white border-[rgba(11,25,44,0.08)] shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05),0_1px_2px_rgba(11,25,44,0.03)] hover:border-[#ff5a5f]/40 hover:shadow-[0_4px_20px_-2px_rgba(11,25,44,0.05)]"
                  : isRun
                  ? "bg-amber-50/40 border-amber-300 shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)]"
                  : isFail
                  ? "bg-rose-50/40 border-rose-300 shadow-[0_2px_10px_-1px_rgba(11,25,44,0.05)]"
                  : "bg-white/60 border-[rgba(11,25,44,0.04)] opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="w-6 h-6 rounded-[8px] bg-[#f3eee5] flex items-center justify-center text-[11px] font-mono font-black text-[#0b192c] tabular-nums border border-[rgba(11,25,44,0.08)]">
                    {stage.id}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold font-mono px-2.5 py-0.5 rounded-full ${
                      isDone
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : isRun
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : isFail
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-[#f3eee5] text-[#788699]"
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>

                <h4 className="text-xs font-extrabold text-[#0b192c] tracking-tight">{stage.name}</h4>
                <p className="text-[11px] text-[#788699] mt-1 line-clamp-2 leading-relaxed">
                  {stage.description}
                </p>
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-[rgba(11,25,44,0.06)] flex items-center justify-between text-xs text-[#788699]">
                <span className="flex items-center space-x-1 tabular-nums font-mono text-[11px] font-medium">
                  <Clock className="w-3 h-3 text-[#788699]" />
                  <span>{stage.duration_s ? `${stage.duration_s}s` : "Pending"}</span>
                </span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
