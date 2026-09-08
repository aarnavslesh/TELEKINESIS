import {
  Cpu,
  Database,
  BookOpen,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

export default function ModelStatusInfoCard({ pendingSyncCount = 0 }) {
  return (
    <div
      id="model-status-info-card"
      className="insight-card-white p-5 rounded-2xl shadow-xs animate-slide-up"
    >
      {/* ── Header ── */}
      <h3 className="flex items-center gap-1.5 m-0 mb-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        <Cpu size={13} className="text-[#876DFF]" />
        Telemetry & Model Status
      </h3>

      {/* ── Telemetry Rows ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400 font-medium">Model Architecture</span>
          <span className="font-mono font-medium text-neutral-900 dark:text-white text-[11px]">
            SetFit / bge-small-en-v1.5
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-medium">
            <WifiOff size={11} /> Inference Execution
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
            Air-Gapped (Local CPU)
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-medium">
            <BookOpen size={11} /> Active Dictionary
          </span>
          <span className="font-medium text-neutral-900 dark:text-white text-xs">
            142 Seed CIS Rules
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-medium">
            <Database size={11} /> Pending Sync
          </span>
          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
            {pendingSyncCount} queued
          </span>
        </div>
      </div>

      {/* ── Sync & Retrain Button ── */}
      <button
        id="sync-retrain-btn"
        type="button"
        className="w-full mt-4 py-2 px-3 rounded-xl bg-[#101312] text-white hover:bg-black dark:bg-white/10 dark:hover:bg-white/15 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
      >
        <RefreshCw size={12} className="text-[#BAF91A]" />
        <span>Sync & Retrain Model Locally</span>
      </button>
    </div>
  );
}
