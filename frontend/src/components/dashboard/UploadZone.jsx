import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  Play,
  X,
  Sparkles,
} from 'lucide-react';
import { demoCiscoConfig } from '../../data/sampleAuditData';

const ACCEPTED_EXTENSIONS = ['.cfg', '.txt', '.conf'];

export default function UploadZone({ onRunAudit, isAuditing, onLoadDemoScenario }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const validateFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && validateFile(dropped)) {
      setFile(dropped);
      setPasteMode(false);
      setPasteText('');
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      setFile(selected);
      setPasteMode(false);
      setPasteText('');
    }
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRun = () => {
    let auditPayload = null;

    if (file) {
      // Ensure the file sent to FastAPI ends in .txt to satisfy backend validation
      if (!file.name.endsWith('.txt')) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const renamed = new File([file], `${baseName}.txt`, { type: 'text/plain' });
        auditPayload = { file: renamed };
      } else {
        auditPayload = { file };
      }
    } else if (pasteText.trim()) {
      // Package pasted CLI text into a virtual .txt file
      const blobFile = new File([pasteText], 'running-config.txt', { type: 'text/plain' });
      auditPayload = { file: blobFile, pasteText };
    } else {
      // Demo scenario fallback
      setPasteMode(true);
      setPasteText(demoCiscoConfig);
      const blobFile = new File([demoCiscoConfig], 'demo-cisco-config.txt', { type: 'text/plain' });
      // demo runs through the real backend
      if (onRunAudit) onRunAudit({ file: blobFile, pasteText: demoCiscoConfig });
      return;
    }

    if (onRunAudit) onRunAudit(auditPayload);
  };

  return (
    <div
      id="upload-zone-panel"
      className="insight-card-white overflow-hidden shadow-xs animate-slide-up"
    >
      {/* ── Slim Ingestion Bar (always visible) ── */}
      <div className="flex items-center justify-between gap-3 p-3.5 px-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 text-neutral-900 dark:text-white shrink-0 border border-slate-200/60 dark:border-white/10">
            <Upload size={15} strokeWidth={2.2} className="text-[#876DFF]" />
          </div>

          {/* Inline file indicator or instruction */}
          {file ? (
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={15} className="text-[#BAF91A] shrink-0" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate font-mono">
                {file.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="p-1 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-none cursor-pointer shrink-0 hover:opacity-80"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
              Upload <span className="font-mono text-neutral-900 dark:text-white">.cfg</span> / <span className="font-mono text-neutral-900 dark:text-white">.ios</span> file or paste Cisco running-config
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Paste CLI toggle */}
          <button
            type="button"
            onClick={() => {
              setPasteMode(!pasteMode);
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${pasteMode
                ? 'bg-[#101312] text-white dark:bg-white dark:text-[#101312] border-transparent shadow-xs'
                : 'bg-white dark:bg-[#101312] text-neutral-700 dark:text-neutral-300 border-slate-200/80 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
          >
            <ClipboardPaste size={12} />
            <span className="hidden sm:inline">Paste CLI</span>
          </button>

          {/* Demo quick-link */}
          <button
            type="button"
            id="quick-demo-pill"
            onClick={() => {
              setPasteMode(true);
              setPasteText(demoCiscoConfig);
              setFile(null);
              setIsExpanded(true);
              // demo runs through the real backend
            }}
            className="text-[11px] px-3 py-1.5 font-semibold rounded-full bg-[#E2FF99] text-[#101312] hover:bg-[#d8fc83] transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs border-0"
            title="Load intentional vulnerable demo config"
          >
            <Sparkles size={11} />
            <span className="hidden sm:inline">Load Sample Demo</span>
          </button>

          {/* Run Audit CTA button (Electric Lime #BAF91A) */}
          <button
            id="run-audit-btn"
            type="button"
            className="btn-lime text-xs px-4 py-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            onClick={handleRun}
            disabled={isAuditing}
          >
            {isAuditing ? (
              <>
                <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span className="hidden sm:inline">Auditing…</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Run Audit</span>
              </>
            )}
          </button>

          {/* Expand/collapse chevron */}
          <button
            type="button"
            id="upload-zone-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer bg-transparent border-0"
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── Collapsible Body ── */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100 px-5 pb-5 pt-1 border-t border-neutral-100 dark:border-neutral-800/80' : 'max-h-0 opacity-0 px-5 py-0'
          }`}
      >
        {/* ── File Drop Zone ── */}
        {!pasteMode && (
          <div
            id="file-drop-zone"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border border-dashed transition-colors cursor-pointer min-h-[90px] ${dragActive
                ? 'border-neutral-900 bg-neutral-100/50 dark:border-white dark:bg-neutral-800/50'
                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#161619]/50 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".cfg,.txt,.conf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {file ? (
              <div className="flex items-center gap-3 w-full justify-between px-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className="m-0 text-xs font-semibold text-neutral-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="m-0 text-[10px] text-neutral-500 dark:text-neutral-400">
                      {(file.size / 1024).toFixed(1)} KB · Ready
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="p-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-none cursor-pointer hover:opacity-80"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="text-center py-1">
                <Upload
                  size={18}
                  className="mx-auto text-neutral-400 dark:text-neutral-500 mb-1.5"
                />
                <p className="m-0 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {dragActive ? 'Drop config file here' : 'Drag & drop Cisco config file here, or browse'}
                </p>
                <p className="m-0 text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  Supports .cfg, .conf, .txt
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Paste Mode ── */}
        {pasteMode && (
          <div>
            <textarea
              id="cli-paste-area"
              placeholder={`Paste Cisco IOS running-config commands here...\n\ne.g.\nservice password-encryption\nip ssh version 2\nno ip http server`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full min-h-[100px] p-3 rounded-xl font-mono text-xs bg-neutral-50/60 dark:bg-[#161619] border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 resize-y outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}