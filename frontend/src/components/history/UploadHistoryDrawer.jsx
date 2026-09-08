import { useEffect } from 'react';
import {
  X,
  History,
  FileCode,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Printer,
} from 'lucide-react';
import { sampleHistorySnapshots } from '../../data/sampleHistory';
import { exportDefensePdfReport, downloadDefensePdfReport } from '../../utils/pdfExport';

export default function UploadHistoryDrawer({
  isOpen,
  onClose,
  onLoadSnapshot,
  currentSnapshotId,
}) {
  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div id="upload-history-drawer" className="fixed inset-0 z-50 flex justify-end">
      {/* ── Backdrop ── */}
      <div
        id="history-backdrop"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* ── Slide-Out Drawer Panel ── */}
      <div
        id="history-drawer-panel"
        className="relative w-full max-w-md h-full flex flex-col z-10 bg-[#FBFBFA] dark:bg-[#121214] border-l border-neutral-200 dark:border-neutral-800 shadow-2xl animate-fade-in"
      >
        {/* ── Drawer Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#1A1A1E]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <History size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-sm font-semibold text-neutral-900 dark:text-white">
                  Audit History
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
                  {sampleHistorySnapshots.length} Runs
                </span>
              </div>
              <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Past compliance audit snapshots
              </p>
            </div>
          </div>

          <button
            id="close-history-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-transparent transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Snapshots Scrollable List ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sampleHistorySnapshots.map((snapshot) => {
            const isLoaded = currentSnapshotId === snapshot.id;
            const isPass = snapshot.score >= 80;

            return (
              <div
                key={snapshot.id}
                id={`history-snapshot-${snapshot.id}`}
                className={`bg-white dark:bg-[#1A1A1E] border rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative transition-all ${
                  isLoaded
                    ? 'border-neutral-900 dark:border-white ring-1 ring-neutral-900 dark:ring-white'
                    : 'border-neutral-200/80 dark:border-neutral-800/80'
                }`}
              >
                {/* Active Snapshot Tag */}
                {isLoaded && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                    Active
                  </span>
                )}

                {/* File Name & Time */}
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                    <FileCode size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className="truncate font-mono text-xs font-semibold text-neutral-900 dark:text-white m-0"
                      title={snapshot.fileName}
                    >
                      {snapshot.fileName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                      <Clock size={11} />
                      <span>{snapshot.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Benchmark Pill */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                    <ShieldCheck size={11} className="text-emerald-500" />
                    {snapshot.benchmark}
                  </span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {snapshot.firmware}
                  </span>
                </div>

                {/* Score Progress Bar & Stats */}
                <div className="p-3 rounded-xl bg-neutral-50/60 dark:bg-[#161619] border border-neutral-100 dark:border-neutral-800/60 mb-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      Compliance Score
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 font-semibold rounded-full border ${
                        isPass
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40'
                          : 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40'
                      }`}
                    >
                      {snapshot.score}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${isPass ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${snapshot.score}%` }}
                    />
                  </div>

                  {/* Pass / Fail / Warn stats */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={11} /> {snapshot.passed} Pass
                    </span>
                    <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                      <XCircle size={11} /> {snapshot.failed} Fail
                    </span>
                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={11} /> {snapshot.warnings} Warn
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    id={`load-snapshot-${snapshot.id}`}
                    type="button"
                    className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg text-xs font-medium px-4 py-2 flex-1 justify-center flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    onClick={() => {
                      onLoadSnapshot(snapshot);
                      onClose();
                    }}
                  >
                    <span>{isLoaded ? 'Reload Snapshot' : 'Load Snapshot'}</span>
                    <ArrowRight size={12} />
                  </button>

                  <button
                    id={`download-snapshot-pdf-${snapshot.id}`}
                    type="button"
                    className="p-2 rounded-lg bg-[#BAF91A] text-[#101312] hover:bg-[#c5fa3b] transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadDefensePdfReport(snapshot);
                    }}
                    title="Direct Download Defense PDF"
                  >
                    <Download size={14} strokeWidth={2.4} />
                  </button>

                  <button
                    id={`export-snapshot-pdf-${snapshot.id}`}
                    type="button"
                    className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportDefensePdfReport(snapshot);
                    }}
                    title="Print / Preview Defense Report"
                  >
                    <Printer size={14} className="text-[#876DFF]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Drawer Footer ── */}
        <div className="p-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#1A1A1E] text-center">
          <p className="m-0 text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
            AIR-GAPPED COMPLIANCE SNAPSHOT ARCHIVE
          </p>
        </div>
      </div>
    </div>
  );
}
