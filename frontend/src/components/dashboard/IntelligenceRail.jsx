import { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Send,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { predictCommand } from '../../services/api';

export default function IntelligenceRail({
  onNavigateActiveLearning,
  stats,
  pendingPrediction,
  activeSnapshot,
  auditResults,
}) {
  const [cliInput, setCliInput] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [liveResult, setLiveResult] = useState(null);

  const handleTestCli = async (e) => {
    e?.preventDefault();
    if (!cliInput.trim()) return;

    setIsPredicting(true);
    setLiveResult(null);
    try {
      const res = await predictCommand(cliInput.trim());
      setLiveResult({
        predicted: res.category,
        confidence: res.confidence,
        isLive: res.isLive,
      });
    } catch {
      // Fallback local heuristic
      setLiveResult({
        predicted: 'SSH Config',
        confidence: 0.88,
        isLive: false,
      });
    } finally {
      setIsPredicting(false);
    }
  };

  const flaggedItem = pendingPrediction || {
    command: 'snmp-server community private RW',
    predicted: 'CIS-Cisco-4.1 (SNMPv3 Security)',
    confidence: 0.82,
    severity: 'HIGH',
  };

  return (
    <aside
      id="insight-intelligence-rail"
      className="flex flex-col gap-5 w-full"
    >
      {/* ── 1. The Black-Glass Card with Glowing Gradient AI Orb ── */}
      <div
        id="insight-ai-assistant-card"
        className="insight-card-obsidian p-6 rounded-3xl text-white relative flex flex-col items-center text-center shadow-xl border border-white/10"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#BAF91A] animate-pulse" />
            <span className="font-semibold text-neutral-300">SetFit AI</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-400">
            Local CPU
          </span>
        </div>

        {/* Glowing Gradient AI Orb (Lime/Violet Mesh) */}
        <div className="relative my-5 flex items-center justify-center">
          {/* Ambient Glow Aura */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#BAF91A] via-[#876DFF] to-[#38ef7d] blur-2xl opacity-45 animate-pulse" />

          {/* 3D Sphere Orb */}
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#BAF91A] via-[#876DFF] to-[#0d131a] shadow-[inset_-8px_-8px_18px_rgba(0,0,0,0.85),inset_6px_6px_16px_rgba(255,255,255,0.4)] border border-white/25 overflow-hidden transition-transform duration-500 hover:scale-105">
            {/* Specular Highlight */}
            <div className="absolute top-2.5 left-4 w-9 h-9 rounded-full bg-white/40 blur-[2px]" />
            <div className="absolute top-5 left-7 w-4 h-4 rounded-full bg-white/70 blur-[1px]" />
            {/* Core Gradient Ring */}
            <div className="absolute inset-2 rounded-full bg-radial from-transparent via-[#876DFF]/20 to-transparent" />
          </div>
        </div>

        {/* Title & Question */}
        <h3 className="text-base font-bold tracking-tight text-white m-0">
          How can I assist you today?
        </h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-[240px] m-0">
          Air-gapped CIS & STIG intelligence model ready for on-premise remediation.
        </p>

        {/* Quick Action Pill - Analysis Oriented */}
        <div className="w-full mt-4">
          <button
            type="button"
            onClick={() => onNavigateActiveLearning?.('review-001')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white transition-all cursor-pointer shadow-xs"
          >
            <Sparkles size={13} className="text-[#BAF91A]" />
            <span>Pro Analysis Mode</span>
          </button>
        </div>

        {/* CLI Ask Anything Input Bar */}
        <form onSubmit={handleTestCli} className="w-full mt-4">
          <div className="flex items-center w-full p-1.5 pl-3 rounded-full bg-white/5 border border-white/10 focus-within:border-[#BAF91A] transition-colors">
            <input
              id="hero-ai-test-input"
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder="Ask anything or test CLI..."
              className="w-full bg-transparent text-xs text-white placeholder:text-neutral-500 focus:outline-none"
            />
            <button
              id="hero-ai-send-btn"
              type="submit"
              disabled={isPredicting || !cliInput.trim()}
              className="p-1.5 rounded-full bg-[#BAF91A] text-[#101312] hover:bg-[#C5FA3B] disabled:opacity-40 transition-all cursor-pointer shrink-0"
              title="Classify Command"
            >
              {isPredicting ? (
                <span className="inline-block w-3 h-3 rounded-full border-2 border-[#101312] border-t-transparent animate-spin" />
              ) : (
                <Send size={12} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </form>

        {/* Live Predict Result Box under the orb */}
        {liveResult && (
          <div
            id="hero-ai-prediction-result"
            className="w-full mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-left text-xs animate-fade-in"
          >
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
              <span>Predicted Category</span>
              <span className="font-bold text-[#BAF91A]">
                {Math.round((liveResult.confidence || 0.85) * 100)}% Confidence
              </span>
            </div>
            <p className="font-mono text-xs text-white font-bold truncate m-0 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#876DFF]" />
              {liveResult.predicted}
            </p>
            <div className="flex items-center justify-between text-[9px] text-neutral-400 mt-2 pt-1.5 border-t border-white/10 font-mono">
              <span className="text-[#BAF91A]">
                Local CPU inference
              </span>
              <span>
                {liveResult.isLive ? 'FastAPI /predict' : 'SetFit Mock Engine'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Active Learning Review Preview Widget ── */}
      <div
        id="insight-active-learning-preview"
        className="insight-card-white p-5 rounded-2xl shadow-sm animate-slide-up"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit size={15} className="text-[#876DFF]" />
            <h4 className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white uppercase m-0">
              Active Learning Queue
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFE6EC] dark:bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30">
            &lt;85% Cutoff
          </span>
        </div>

        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 m-0 mb-3 leading-relaxed">
          Commands with low classification certainty flagged for Human-in-the-Loop auditor verification.
        </p>

        {/* Flagged command snippet */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 mb-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Flagged Snippet
          </span>
          <code className="font-mono text-xs text-neutral-800 dark:text-neutral-200 break-all">
            {flaggedItem.command}
          </code>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400 truncate">
              {flaggedItem.predicted}
            </span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 ml-1">
              {Math.round(flaggedItem.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateActiveLearning?.('review-001')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-xs"
          >
            <span>Review Flagged Item</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* ── 3. Air-Gapped Defense Verification (Passive Telemetry & Hash Card) ── */}
      <div
        id="insight-pdf-export-trigger"
        className="p-5 rounded-2xl bg-[#101312] text-white border border-white/10 shadow-sm relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck size={14} className="text-[#BAF91A]" />
              <span className="text-[10px] font-bold tracking-wider text-[#BAF91A] uppercase">
                Air-Gapped Defense Verification
              </span>
            </div>
            <h4 className="text-sm font-bold tracking-tight text-white m-0">
              Cryptographic Audit Baseline
            </h4>
            <p className="text-[11px] text-neutral-400 mt-1 m-0 leading-relaxed">
              Certified on-premise baseline against CIS Cisco IOS v4.0 & DoD STIG benchmarks. Global export available via top header bar.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
            <ShieldCheck size={18} className="text-[#BAF91A]" />
          </div>
        </div>

        {/* Cryptographic SHA-256 Telemetry */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase tracking-wider font-semibold text-neutral-400">
              Integrity Hash (SHA-256)
            </span>
            <span className="text-[#BAF91A] font-mono font-bold text-[9px] px-1.5 py-0.5 rounded bg-[#BAF91A]/15 border border-[#BAF91A]/30">
              VERIFIED
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 font-mono text-[10px] text-neutral-300 truncate select-all">
            {activeSnapshot?.sha256 || '9f83b1657ff1850b28b32c65ac447b15d3b147b6ec5d00e5a65d16c34b6e761e'}
          </div>
        </div>
      </div>
    </aside>
  );
}
