import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  RotateCcw,
  Brain,
} from 'lucide-react';

function StatusPill({ status }) {
  const isPass = status === 'PASS';
  const isFail = status === 'FAIL';

  if (isPass) {
    return (
      <span className="pill-pass">
        <ShieldCheck size={11} strokeWidth={2.5} />
        <span>PASS</span>
      </span>
    );
  }

  if (isFail) {
    return (
      <span className="pill-fail">
        <ShieldAlert size={11} strokeWidth={2.5} />
        <span>FAIL</span>
      </span>
    );
  }

  return (
    <span className="pill-warn">
      <AlertTriangle size={11} strokeWidth={2.5} />
      <span>WARN</span>
    </span>
  );
}

function MinimalToggle({ checked, onChange, label }) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked
            ? 'bg-[#BAF91A]'
            : 'bg-slate-200 dark:bg-neutral-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out mt-[1px] ${
            checked ? 'translate-x-3.5 bg-[#101312]' : 'translate-x-0.5 bg-white dark:bg-neutral-400'
          }`}
        />
      </button>
      {label && (
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
          {label}
        </span>
      )}
    </label>
  );
}

function ExpandedDrawer({ rule }) {
  const [copiedFix, setCopiedFix] = useState(false);
  const [copiedRollback, setCopiedRollback] = useState(false);

  const copyToClipboard = useCallback(async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  return (
    <div className="p-5 bg-neutral-50/60 dark:bg-[#161619] border-t border-neutral-100 dark:border-neutral-800/80 animate-fade-in">
      {/* Violation Detail */}
      {rule.violationDetail && (
        <div className="mb-4">
          <h4 className="m-0 mb-1 text-[11px] font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Violation Detail
          </h4>
          <p className="m-0 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {rule.violationDetail}
          </p>
        </div>
      )}

      {/* CLI Code Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fix CLI */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="flex items-center gap-1.5 m-0 text-[11px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Terminal size={11} /> Remediation Command
            </h4>
            <button
              type="button"
              onClick={() => copyToClipboard(rule.fixCli, setCopiedFix)}
              className="text-[11px] px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedFix ? <Check size={10} /> : <Copy size={10} />}
              <span>{copiedFix ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="m-0 p-3 rounded-lg font-mono text-xs bg-white dark:bg-[#1A1A1E] border border-neutral-200/80 dark:border-neutral-800 text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap break-words leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {rule.fixCli}
          </pre>
        </div>

        {/* Rollback CLI */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="flex items-center gap-1.5 m-0 text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <RotateCcw size={11} /> Rollback Command
            </h4>
            <button
              type="button"
              onClick={() => copyToClipboard(rule.rollbackCli, setCopiedRollback)}
              className="text-[11px] px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedRollback ? <Check size={10} /> : <Copy size={10} />}
              <span>{copiedRollback ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="m-0 p-3 rounded-lg font-mono text-xs bg-white dark:bg-[#1A1A1E] border border-neutral-200/80 dark:border-neutral-800 text-amber-700 dark:text-amber-400 whitespace-pre-wrap break-words leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {rule.rollbackCli}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AuditTable({ results, onNavigateActiveLearning }) {
  const [expandedId, setExpandedId] = useState(null);
  const [autoRemediate, setAutoRemediate] = useState({});

  const toggleRow = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleAuto = (id, val) => {
    setAutoRemediate((prev) => ({ ...prev, [id]: val }));
  };

  if (!results || results.length === 0) return null;

  return (
    <div
      id="audit-results-table"
      className="insight-card-white overflow-hidden shadow-xs animate-slide-up"
    >
      {/* Table Header */}
      <div className="grid grid-cols-[76px_minmax(160px,1.3fr)_minmax(140px,1fr)_minmax(160px,1.4fr)_76px_28px] items-center gap-3 px-5 py-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
        {['Status', 'Cisco CLI Code', 'Benchmark Rule', 'Remediation', 'Auto-Fix', ''].map(
          (col, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider"
            >
              {col}
            </span>
          ),
        )}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {results.map((rule) => {
          const isOpen = expandedId === rule.id;
          const isAiFallbackRule =
            rule.isAiFallback ||
            rule.cliCode?.includes('logg trap') ||
            (rule.confidence && rule.confidence < 0.85);

          return (
            <div key={rule.id} id={`audit-row-${rule.id}`}>
              <div
                onClick={() => toggleRow(rule.id)}
                className={`grid grid-cols-[76px_minmax(160px,1.3fr)_minmax(140px,1fr)_minmax(160px,1.4fr)_76px_28px] items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                  isOpen
                    ? 'bg-slate-100/70 dark:bg-white/[0.05]'
                    : 'hover:bg-slate-50/70 dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Status */}
                <div>
                  <StatusPill status={rule.status} />
                </div>

                {/* CLI Code */}
                <div>
                  <code className="cli-code-badge">
                    {rule.command}
                  </code>

                  {isAiFallbackRule && (
                    <button
                      id={`ai-fallback-badge-${rule.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateActiveLearning?.(rule.activeLearningTargetId || 'review-001');
                      }}
                      className="mt-1.5 flex items-center gap-1 text-[10px] px-2 py-0.5 font-semibold rounded-full bg-[#EDE8FF] dark:bg-[#876DFF]/20 text-[#876DFF] dark:text-[#A38FFF] border border-[#876DFF]/30 hover:border-[#876DFF] transition-colors cursor-pointer"
                      title="Inspect in Active Learning Queue"
                    >
                      <Brain size={10} strokeWidth={2} />
                      <span>SetFit: {(rule.confidence ? rule.confidence * 100 : 82.4).toFixed(0)}%</span>
                      <span className="ml-0.5">Queue →</span>
                    </button>
                  )}
                </div>

                {/* Rule */}
                <div>
                  <span className="text-[10px] font-mono font-semibold text-neutral-500 dark:text-neutral-400 block uppercase tracking-wider">
                    {rule.ruleId}
                  </span>
                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug mt-0.5">
                    {rule.ruleTitle}
                  </span>
                </div>

                {/* Remediation */}
                <div>
                  <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-2">
                    {rule.remediation}
                  </p>
                </div>

                {/* Auto-Fix Toggle */}
                <div onClick={(e) => e.stopPropagation()}>
                  <MinimalToggle
                    checked={!!autoRemediate[rule.id]}
                    onChange={(val) => toggleAuto(rule.id, val)}
                    label=""
                  />
                </div>

                {/* Expand Chevron */}
                <div className="flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                  {isOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </div>
              </div>

              {/* Expanded Drawer */}
              {isOpen && <ExpandedDrawer rule={rule} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
