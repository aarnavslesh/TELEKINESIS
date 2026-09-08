import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  FileCode,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Printer,
  RotateCcw,
  Check,
  Server,
  Hash,
  Filter,
} from 'lucide-react';
import { sampleHistorySnapshots } from '../../data/sampleHistory';
import { exportDefensePdfReport, downloadDefensePdfReport } from '../../utils/pdfExport';

export default function AuditHistoryView({
  snapshots = sampleHistorySnapshots,
  currentSnapshotId,
  onLoadSnapshot,
  onBack,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'pass' | 'fail' | 'cis' | 'stig'
  const [downloadingId, setDownloadingId] = useState(null);

  // Filtered list of snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        snap.fileName.toLowerCase().includes(q) ||
        snap.hostname.toLowerCase().includes(q) ||
        snap.benchmark.toLowerCase().includes(q) ||
        snap.firmware.toLowerCase().includes(q) ||
        snap.profile.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterType === 'pass') return snap.score >= 80;
      if (filterType === 'fail') return snap.score < 80;
      if (filterType === 'cis') return snap.benchmark.toLowerCase().includes('cis');
      if (filterType === 'stig') return snap.benchmark.toLowerCase().includes('stig');
      return true;
    });
  }, [snapshots, searchQuery, filterType]);

  const handleDownload = async (e, snapshot) => {
    e.stopPropagation();
    if (downloadingId === snapshot.id) return;
    setDownloadingId(snapshot.id);
    try {
      await downloadDefensePdfReport(snapshot);
    } catch (err) {
      console.error('Failed to download defense report:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = (e, snapshot) => {
    e.stopPropagation();
    exportDefensePdfReport(snapshot);
  };

  return (
    <main className="p-4 sm:p-6 space-y-6 animate-fade-in w-full">
      {/* ── Top Bar: Back Action + Header Title ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <button
            id="history-back-to-cockpit-btn"
            type="button"
            onClick={onBack}
            className="btn-obsidian text-xs font-semibold px-3.5 py-1.5 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={13} strokeWidth={2.4} />
            <span>← Back to Cockpit</span>
          </button>
          <div>
            <h1 className="m-0 font-bold tracking-tight text-zinc-900 dark:text-white text-lg leading-tight flex items-center gap-2">
              <span>Historical Compliance Archive</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-400 text-black font-bold">
                Air-Gapped
              </span>
            </h1>
            <p className="m-0 text-zinc-500 font-medium text-xs mt-0.5">
              Immutable snapshot timeline of previous air-gapped network compliance verifications.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#121417] text-zinc-300 font-semibold border border-white/10 shadow-xs">
          {snapshots.length} Runs Stored
        </span>
      </div>

      {/* ── Top Filter & Search Ribbon (Dark Cockpit Glass Panel - MUST STAY BLACK) ── */}
      <div className="bg-[#121417] border border-white/10 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-4 flex-wrap">
        {/* Search Bar */}
        <div className="flex-1 min-w-[240px] max-w-md relative">
          <div className="relative flex items-center w-full">
            <Search size={14} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by filename, hostname, or benchmark..."
              className="w-full bg-black/40 border border-white/10 text-white placeholder-zinc-500 rounded-xl pl-9 pr-8 py-2.5 text-xs focus:border-lime-400 focus:outline-none font-mono transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-zinc-400 hover:text-zinc-200 text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1 font-mono">
            <Filter size={12} className="text-lime-400" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Runs' },
            { id: 'pass', label: 'Pass (≥80%)' },
            { id: 'fail', label: 'Needs Remediation (<80%)' },
            { id: 'cis', label: 'CIS Profiles' },
            { id: 'stig', label: 'DISA STIG' },
          ].map((pill) => {
            const isActive = filterType === pill.id;
            return (
              <button
                key={pill.id}
                id={`filter-pill-${pill.id}`}
                type="button"
                onClick={() => setFilterType(pill.id)}
                className={`text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-lime-400 text-black font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Snapshots Grid (Restored Clean White Cards) ── */}
      {filteredSnapshots.length > 0 ? (
        <div
          id="history-snapshots-grid"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5 items-stretch"
        >
          {filteredSnapshots.map((snapshot) => {
            const isLoaded = currentSnapshotId === snapshot.id;
            const isPass = snapshot.score >= 80;
            const isWarn = snapshot.score >= 65 && snapshot.score < 80;

            const scoreBadgeClass = isPass
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isWarn
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';

            const scoreBarColor = isPass
              ? 'bg-emerald-500'
              : isWarn
              ? 'bg-amber-500'
              : 'bg-rose-500';

            return (
              <div
                key={snapshot.id}
                id={`history-card-${snapshot.id}`}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative ${
                  isLoaded
                    ? 'border-lime-500 ring-2 ring-lime-400/40 shadow-md'
                    : 'border-zinc-200/80'
                }`}
              >
                {/* Active Indicator Tag */}
                {isLoaded && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-lime-400 text-black shadow-xs flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Active in Cockpit
                  </span>
                )}

                <div>
                  {/* Top Metadata: File Icon + Filename + Timestamp */}
                  <div className="flex items-start gap-3 mb-3 pr-16">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 shrink-0">
                      <FileCode size={18} className="text-[#6D4AFF]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="truncate text-zinc-900 font-mono font-bold text-sm m-0"
                        title={snapshot.fileName}
                      >
                        {snapshot.fileName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-zinc-500 font-mono text-xs">
                        <Clock size={11} />
                        <span>{snapshot.timestamp} UTC</span>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark, Firmware, and Hostname Tags */}
                  <div className="flex items-center gap-2 mb-3.5 flex-wrap text-zinc-500 font-mono text-xs">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                      <ShieldCheck size={11} className="text-lime-600" />
                      {snapshot.benchmark}
                    </span>
                    <span className="text-zinc-500">
                      {snapshot.firmware}
                    </span>
                    <span className="text-zinc-500 flex items-center gap-1 truncate">
                      <Server size={10} /> {snapshot.hostname}
                    </span>
                  </div>

                  {/* Score Progress Bar & Stats Box */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider font-mono">
                        Compliance Score
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 font-bold font-mono rounded-full border ${scoreBadgeClass}`}
                      >
                        {snapshot.score}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${scoreBarColor}`}
                        style={{ width: `${snapshot.score}%` }}
                      />
                    </div>

                    {/* Metric Counts */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200/60 font-mono">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                        <CheckCircle2 size={12} /> {snapshot.passed} Passed
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 font-semibold text-xs">
                        <XCircle size={12} /> {snapshot.failed} Failed
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
                        <AlertTriangle size={12} /> {snapshot.warnings} Warnings
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Hash Container */}
                  <div className="mb-4 flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 text-zinc-500 font-mono text-[11px] p-2 rounded-lg">
                    <Hash size={11} className="text-zinc-500 shrink-0" />
                    <span className="truncate select-all" title={snapshot.sha256}>
                      {snapshot.sha256}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                  <button
                    id={`load-snapshot-btn-${snapshot.id}`}
                    type="button"
                    onClick={() => onLoadSnapshot(snapshot)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isLoaded
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'bg-zinc-900 hover:bg-black text-white'
                    }`}
                  >
                    <span>{isLoaded ? 'Reload Cockpit' : 'Load Snapshot Into Cockpit'}</span>
                    <ArrowRight size={13} strokeWidth={2.4} className="text-lime-400" />
                  </button>

                  <button
                    id={`download-history-pdf-${snapshot.id}`}
                    type="button"
                    disabled={downloadingId === snapshot.id}
                    onClick={(e) => handleDownload(e, snapshot)}
                    className="p-2.5 rounded-xl bg-lime-400 text-black hover:bg-lime-300 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                    title="Direct Download Defense PDF"
                  >
                    {downloadingId === snapshot.id ? (
                      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    ) : (
                      <Download size={14} strokeWidth={2.4} />
                    )}
                  </button>

                  <button
                    id={`print-history-pdf-${snapshot.id}`}
                    type="button"
                    onClick={(e) => handlePrint(e, snapshot)}
                    className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer shadow-xs"
                    title="Print / Preview Defense Report"
                  >
                    <Printer size={14} className="text-[#876DFF]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-zinc-200/80 p-12 text-center rounded-2xl shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-600 mb-3">
            <Search size={22} className="text-zinc-800" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 m-0">
            No Snapshot Runs Match Your Filter
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keyword or switching the filter pills to 'All Runs'.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-lime-400 text-black hover:bg-lime-300 cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} />
            <span>Reset Filters</span>
          </button>
        </div>
      )}

      {/* ── Footer Metadata & Verification Status (MUST STAY BLACK) ── */}
      <div className="p-4 rounded-2xl bg-[#121417] border border-white/10 flex items-center justify-between flex-wrap gap-3 text-xs text-zinc-400 shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-lime-400" />
          <span className="font-semibold text-zinc-200">
            Air-Gapped Compliance Ledger Status
          </span>
          <span>·</span>
          <span>SHA-256 Digest Chain Verified</span>
        </div>
        <div className="font-mono text-[11px] text-zinc-500">
          ZERO OUTBOUND TELEMETRY · LOCAL ARCHIVE LEDGER
        </div>
      </div>
    </main>
  );
}
