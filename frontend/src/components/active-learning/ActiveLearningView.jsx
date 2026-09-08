import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Brain,
  AlertTriangle,
  Filter,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  X,
  Check,
  Copy,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import LiveTestSandbox from './LiveTestSandbox';
import ModelStatusInfoCard from './ModelStatusInfoCard';
import { sampleReviewQueue } from '../../data/sampleReviewQueue';
import {
  fetchPendingReviews,
  fetchAuditHistory,
  resolvePendingReview,
} from '../../services/api';
import { CATEGORIES } from '../../services/api';

/* ── Inline Reassign Dropdown ── */
function ReassignDropdown({ item, onReassign }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        id={`reassign-${item.id}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/15 text-neutral-200 bg-white/5 hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
      >
        <RefreshCw size={10} />
        <span>Reassign</span>
        <ChevronDown
          size={10}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 min-w-[170px] p-1.5 rounded-xl bg-[#101312] border border-white/15 shadow-2xl z-30 animate-fade-in backdrop-blur-xl">
          {CATEGORIES.map((cat) => {
            const isCurrent = cat === (item.assignedCategory || item.predicted);
            return (
              <button
                key={cat}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReassign(item.id, cat);
                  setOpen(false);
                }}
                className={`block w-full px-2.5 py-1.5 text-left text-xs rounded-lg border-0 cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-[#876DFF]/25 text-[#BAF91A] font-bold'
                    : 'text-neutral-300 hover:bg-white/10 font-medium'
                }`}
              >
                {cat}
                {isCurrent && (
                  <span className="ml-1 text-[10px] text-neutral-400 font-normal">
                    (current)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ActiveLearningView({
  onBack,
  onNavigateDashboard,
  highlightedReviewId,
  queue: externalQueue,
  onQueueChange,
}) {
  const [internalQueue, setInternalQueue] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const queue = externalQueue || internalQueue;
  const setQueue = onQueueChange || setInternalQueue;
  const [copiedId, setCopiedId] = useState(null);

  // Load REAL pending reviews from the backend on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reviews, uploads] = await Promise.all([
          fetchPendingReviews(),
          fetchAuditHistory().catch(() => []),
        ]);
        if (cancelled) return;
        const nameById = {};
        for (const u of uploads) nameById[u.id] = u.filename;
        const mapped = reviews.map((r) => ({
          id: r.id,
          rawCommand: r.command,
          source: nameById[r.upload_id] || 'uploaded config',
          predicted: r.predicted_label,
          confidence: typeof r.confidence === 'number' ? r.confidence : 0,
          status: 'pending',
        }));
        setQueue(mapped);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError('Could not load pending reviews — is the backend running on :8000?');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [setQueue]);

  // ── Actions ──
  const handleApprove = useCallback((id) => {
    const snapshot = queue;
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'approved', reviewed: true } : item,
      ),
    );
    resolvePendingReview(id, 'approve').catch(() => {
      setQueue(snapshot);
      alert('Approve failed — is the backend running?');
    });
  }, [setQueue, queue]);

  const handleReject = useCallback((id) => {
    const snapshot = queue;
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'rejected', reviewed: true } : item,
      ),
    );
    resolvePendingReview(id, 'reject').catch(() => {
      setQueue(snapshot);
      alert('Reject failed — is the backend running?');
    });
  }, [setQueue, queue]);

  const handleReassign = useCallback((id, newCategory) => {
    const snapshot = queue;
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, assignedCategory: newCategory, status: 'approved', reviewed: true }
          : item,
      ),
    );
    resolvePendingReview(id, 'relabel', newCategory).catch(() => {
      setQueue(snapshot);
      alert('Relabel failed — is the backend running?');
    });
  }, [setQueue, queue]);

  const handleApproveAllAbove80 = useCallback(() => {
    const targets = queue.filter((q) => q.status === 'pending');
    if (targets.length === 0) return;
    setQueue((prev) =>
      prev.map((item) =>
        item.status === 'pending' ? { ...item, status: 'approved', reviewed: true } : item,
      ),
    );
    Promise.allSettled(
      targets.map((t) => resolvePendingReview(t.id, 'approve')),
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) alert(`${failed} approve(s) failed — reload the page to see true state.`);
    });
  }, [setQueue, queue]);

  const handleCopy = useCallback((id, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const pending = queue.filter((q) => q.status === 'pending').length;
    const approved = queue.filter((q) => q.status === 'approved').length;
    const rejected = queue.filter((q) => q.status === 'rejected').length;
    return { total: queue.length, pending, approved, rejected };
  }, [queue]);

  const goBack = onBack || onNavigateDashboard;

  return (
    <main className="p-4 sm:p-6 space-y-6 animate-fade-in w-full">
      {/* ── Top Bar: Back to Cockpit Action + Title ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3">
          <button
            id="back-to-dashboard-btn"
            type="button"
            onClick={goBack}
            className="btn-obsidian text-xs font-semibold px-3.5 py-1.5 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={13} strokeWidth={2.4} />
            <span>← Back to Cockpit</span>
          </button>
          <div>
            <h1 className="m-0 text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
              Active Learning Review Queue
            </h1>
            <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Cisco IOS commands flagged below the 65% confidence cutoff for human auditor verification.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#E2FF99] text-[#101312] font-semibold">
          Human-in-the-Loop Mode
        </span>
      </div>

      {loadError && (
        <div className="insight-card-white p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 border-l-4 border-l-rose-500 shadow-xs">
          {loadError}
        </div>
      )}

      {/* ── Top Metrics Ribbon (Obsidian Glass Box) ── */}
      <div
        id="active-learning-stat-ribbon"
        className="insight-card-hero p-6 rounded-3xl text-white relative animate-slide-up"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#BAF91A] shadow-[0_0_8px_#BAF91A]" />
            <h2 className="text-base font-bold tracking-tight text-white m-0">
              Active Learning Feedback Telemetry
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300">
            SetFit Fine-Tuning Pipeline
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-4">
          {/* Tile 1: Flagged Edge Cases */}
          <div className="insight-stat-tile">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Flagged Edge Cases
              </span>
              <Brain size={14} className="text-[#876DFF]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-white font-mono">
                {stats.total}
              </span>
              <span className="text-xs text-neutral-400">snippets</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
              Uncertain predictions
            </p>
          </div>

          {/* Tile 2: Pending Review */}
          <div className="insight-stat-tile">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Pending Review
              </span>
              {stats.pending > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                  WAITING
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold tracking-tight font-mono ${stats.pending > 0 ? 'text-amber-400' : 'text-[#BAF91A]'}`}>
                {stats.pending}
              </span>
              <span className="text-xs text-neutral-400">items</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
              Human judgment required
            </p>
          </div>

          {/* Tile 3: Confidence Cutoff */}
          <div className="insight-stat-tile">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Confidence Cutoff
              </span>
              <Filter size={14} className="text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-white font-mono">
                &lt; 65%
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
              Conservative threshold
            </p>
          </div>

          {/* Tile 4: Sync Status */}
          <div className="insight-stat-tile">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Sync Status
              </span>
              <CheckCircle2 size={14} className="text-[#BAF91A]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-[#BAF91A] font-mono">
                {stats.approved}
              </span>
              <span className="text-xs text-neutral-400">staged</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
              Staged for dataset.csv
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-[#BAF91A]/60 to-transparent blur-[1px]" />
      </div>

      {/* ── Two-Column Layout (Expanded Review Queue + Right Rail) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── Left: Review Queue Table ── */}
        <section className="xl:col-span-8 flex flex-col gap-3 min-w-0">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1 h-7">
            <div className="flex items-center gap-2.5">
              <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Review Queue
              </h2>
              {stats.pending > 0 ? (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                  {stats.pending} pending
                </span>
              ) : (
                <span className="pill-pass">
                  All Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {stats.pending > 0 && (
                <button
                  type="button"
                  onClick={handleApproveAllAbove80}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Approve All
                </button>
              )}
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                {queue.length} commands
              </span>
            </div>
          </div>

          {/* ── High-Density Review Table (Obsidian Glass Box) ── */}
          <div className="insight-card-obsidian rounded-2xl overflow-hidden shadow-xl border border-white/10 text-white">
            {/* Table Header */}
            <div className="grid grid-cols-[minmax(220px,1.5fr)_150px_130px_190px] items-center gap-4 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
              {['CLI Command', 'Detected Category', 'Confidence', 'Quick Actions'].map((col, i) => (
                <span key={i} className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {col}
                </span>
              ))}
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/[0.06]">
              {queue.map((item) => {
                const isResolved = item.status === 'approved' || item.status === 'rejected';
                const confPct = (item.confidence * 100).toFixed(1);
                const isHighlighted = highlightedReviewId === item.id;

                return (
                  <div
                    key={item.id}
                    id={`review-row-${item.id}`}
                    className={`group grid grid-cols-[minmax(220px,1.5fr)_150px_130px_190px] items-center gap-4 px-5 py-3.5 transition-colors relative ${
                      isHighlighted
                        ? 'bg-white/[0.08] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#BAF91A]'
                        : isResolved
                        ? 'opacity-40 hover:bg-white/[0.02]'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* 1. CLI Command */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <code
                          className="font-mono text-xs bg-black/40 text-[#BAF91A] px-2.5 py-1 rounded-md border border-white/10 truncate inline-block max-w-full font-medium"
                          title={item.rawCommand}
                        >
                          {item.rawCommand}
                        </code>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(item.id, item.rawCommand);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-white cursor-pointer bg-transparent border-0 shrink-0"
                          title="Copy command"
                        >
                          {copiedId === item.id ? (
                            <Check size={11} className="text-[#BAF91A]" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono truncate" title={item.source}>
                        {item.source}
                      </span>
                    </div>

                    {/* 2. Detected Category */}
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-[#876DFF] text-[#C4B5FD] bg-[#876DFF]/15 whitespace-nowrap shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#876DFF]" />
                        {item.assignedCategory || item.predicted}
                      </span>
                    </div>

                    {/* 3. Confidence (Electric Lime Progress Bar + %) */}
                    <div className="flex flex-col gap-1 pr-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">
                          {confPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#BAF91A] transition-all duration-300"
                          style={{ width: `${Math.min(item.confidence * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* 4. Quick Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isResolved ? (
                        <>
                          {/* Approve (Electric Lime Mini-Pill) */}
                          <button
                            id={`approve-${item.id}`}
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            className="bg-[#BAF91A] text-black font-semibold hover:bg-[#C5FA3B] rounded-full text-xs px-3 py-1 transition-all cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                          >
                            <Check size={11} strokeWidth={2.8} />
                            <span>Approve</span>
                          </button>

                          {/* Reassign dropdown */}
                          <ReassignDropdown item={item} onReassign={handleReassign} />

                          {/* Reject / Discard Ghost Icon Button */}
                          <button
                            id={`reject-${item.id}`}
                            type="button"
                            onClick={() => handleReject(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-[#FF4D6D] hover:bg-white/10 transition-colors cursor-pointer shrink-0 bg-transparent border-0"
                            title="Discard"
                          >
                            <X size={13} strokeWidth={2.2} />
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            item.status === 'approved'
                              ? 'text-black bg-[#BAF91A] border-[#BAF91A]'
                              : 'text-neutral-400 bg-white/5 border-white/10'
                          }`}
                        >
                          {item.status === 'approved' ? (
                            <><Check size={10} strokeWidth={2.6} /> Approved</>
                          ) : (
                            <><X size={10} strokeWidth={2.6} /> Discarded</>
                          )}
                          {item.assignedCategory && item.assignedCategory !== item.predicted && (
                            <span className="opacity-80 ml-0.5 font-normal">
                              → {item.assignedCategory}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All done message */}
          {stats.pending === 0 && (
            <div className="insight-card-obsidian p-8 text-center shadow-lg border border-white/10 text-white animate-fade-in rounded-2xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#BAF91A]/20 text-[#BAF91A] mb-2">
                <CheckCircle2 size={20} />
              </div>
              <p className="m-0 text-sm font-bold text-white">
                Review Queue Fully Verified
              </p>
              <p className="m-0 text-xs text-neutral-400 mt-1">
                {stats.approved} approved · {stats.rejected} discarded · Staged for offline model fine-tuning
              </p>
            </div>
          )}
        </section>

        {/* ── Right: Sticky Sidebar Rail ── */}
        <aside className="xl:col-span-4 xl:sticky xl:top-20 flex flex-col gap-3">
          {/* Section Header - Aligns level with Review Queue header */}
          <div className="flex items-center justify-between px-1 h-7">
            <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Model Telemetry
            </h2>
            <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
              Offline Pipeline
            </span>
          </div>

          <div className="flex flex-col gap-6">
            <ModelStatusInfoCard pendingSyncCount={stats.approved} />
            <LiveTestSandbox />
          </div>
        </aside>
      </div>
    </main>
  );
}
