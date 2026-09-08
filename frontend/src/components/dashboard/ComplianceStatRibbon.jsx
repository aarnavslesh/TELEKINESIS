import {
  ShieldCheck,
  FileCheck,
  Layers,
} from 'lucide-react';

export default function ComplianceStatRibbon({ stats, activeSnapshot }) {
  const { total, passed, failed, warnings, score } = stats;

  const fileName = activeSnapshot?.fileName || stats?.fileName || 'Uploaded config';
  const benchmark = activeSnapshot?.benchmark || 'CIS Cisco IOS Benchmark';

  return (
    <div
      id="compliance-stat-ribbon"
      className="insight-card-hero p-6 rounded-3xl text-white relative animate-slide-up"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#BAF91A] shadow-[0_0_8px_#BAF91A]" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white m-0">
              Air-Gapped Compliance Distribution
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 m-0">
            AI-enhanced real-time multi-vendor audit against CIS Benchmark & DISA STIG profiles.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/10 border border-white/10 text-neutral-300 flex items-center gap-1.5">
            <Layers size={12} className="text-[#BAF91A]" />
            <span>{benchmark}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-5">
        <div className="insight-stat-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Total Scanned
            </span>
            <FileCheck size={14} className="text-neutral-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-white font-mono">
              {total}
            </span>
            <span className="text-xs text-neutral-400">rules</span>
          </div>
          <p className="text-[11px] font-mono text-neutral-400 truncate mt-1.5 m-0">
            {fileName}
          </p>
        </div>

        <div className="insight-stat-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Compliance Score
            </span>
            {failed === 0 && total > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#BAF91A] text-[#101312]">
                PASS
              </span>
            ) : null}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-[#BAF91A] font-mono">
              {score}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
            {passed} Passed · {failed} Failed
          </p>
        </div>

        <div className="insight-stat-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Active Violations
            </span>
            {failed > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF4D6D] text-white">
                ALERT
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold tracking-tight font-mono ${failed > 0 ? 'text-[#FF4D6D]' : 'text-neutral-300'}`}>
              {failed}
            </span>
            <span className="text-xs text-neutral-400">failed</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
            {warnings} Warnings to review
          </p>
        </div>

        <div className="insight-stat-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Framework Coverage
            </span>
            <ShieldCheck size={14} className="text-[#876DFF]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-[#876DFF] font-mono">
              4
            </span>
            <span className="text-xs text-neutral-400">frameworks</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 m-0">
            CIS · NIST · ISO 27001 · NCIIPC
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-[#BAF91A]/60 to-transparent blur-[1px]" />
    </div>
  );
}
