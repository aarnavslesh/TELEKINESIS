import { useState, useCallback } from 'react';
import {
  Terminal,
  Zap,
  Clock,
  Cpu,
  WifiOff,
  Wifi,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { predictCommand } from '../../services/api';

const DEFAULT_COMMAND = 'logg trap informational';

export default function LiveTestSandbox() {
  const [isOpen, setIsOpen] = useState(true);
  const [command, setCommand] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleTest = useCallback(async (overrideCmd) => {
    const rawCmd = typeof overrideCmd === 'string' ? overrideCmd : command;
    const trimmed = rawCmd.trim() || DEFAULT_COMMAND;
    if (isLoading) return;

    if (!command.trim()) {
      setCommand(DEFAULT_COMMAND);
    }

    setIsLoading(true);
    setResult(null);

    const prediction = await predictCommand(trimmed);

    setResult(prediction);
    setHistory((prev) => [
      { command: trimmed, ...prediction, timestamp: Date.now() },
      ...prev.slice(0, 3), // Keep last 4
    ]);
    setIsLoading(false);
  }, [command, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTest();
    }
  };

  return (
    <div
      id="live-test-sandbox"
      className="insight-card-obsidian text-white border border-white/10 overflow-hidden shadow-lg animate-slide-up"
    >
      {/* ── Accordion Header ── */}
      <button
        type="button"
        id="sandbox-accordion-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 px-5 bg-transparent border-0 cursor-pointer text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#BAF91A]" />
          <span className="text-xs font-bold text-white tracking-tight">
            Live SetFit CLI Terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 font-mono font-medium rounded-full bg-white/10 text-neutral-300 border border-white/10 inline-flex items-center gap-1">
            {result ? (
              result.isLive ? (
                <><Wifi size={9} className="text-[#BAF91A]" /> Live</>
              ) : (
                <><WifiOff size={9} className="text-amber-400" /> Mock</>
              )
            ) : (
              <><Cpu size={9} /> Local CPU</>
            )}
          </span>
          <span className="text-neutral-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </div>
      </button>

      {/* ── Collapsible Body ── */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[500px] opacity-100 p-5 pt-0' : 'max-h-0 opacity-0 p-0'
        }`}
      >
        {/* Input Area */}
        <div className="flex flex-col gap-2.5 mb-3">
          <div className="w-full bg-black/60 border border-white/10 rounded-xl p-3 focus-within:border-[#BAF91A] transition-colors">
            <input
              id="sandbox-input"
              type="text"
              placeholder="e.g. logg trap informational"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-0 outline-none font-mono text-xs text-white placeholder:text-neutral-500"
            />
          </div>
          <button
            id="sandbox-test-btn"
            type="button"
            onClick={() => handleTest()}
            disabled={isLoading}
            className="btn-lime text-xs font-bold py-2 w-full justify-center flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Evaluating on Local CPU…</span>
              </>
            ) : (
              <>
                <Zap size={12} fill="currentColor" />
                <span>Test with SetFit</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result */}
        {result && (
          <div className="animate-fade-in p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Predicted Category
                </p>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#876DFF]" />
                  {result.category}
                </span>
              </div>

              <div className="text-right">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Confidence
                </p>
                <span className="pill-pass mt-0.5 inline-block text-[10px]">
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-white/10 font-mono">
              <span className="flex items-center gap-1 text-[#BAF91A]">
                <Clock size={10} /> ~{result.latencyMs}ms CPU
              </span>
              <span className="text-neutral-300">
                {result.isLive ? 'FastAPI Engine' : 'Air-Gapped Heuristic'}
              </span>
            </div>
          </div>
        )}

        {/* Recent Tests */}
        {history.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="m-0 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Recent Inferences
            </p>
            <div className="flex flex-col gap-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-white/5 text-xs border border-white/10"
                >
                  <code className="font-mono text-[11px] text-[#BAF91A] truncate max-w-[130px]">
                    {h.command}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-neutral-300">
                      {h.category}
                    </span>
                    <span className="text-[10px] font-semibold text-white">
                      {(h.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
