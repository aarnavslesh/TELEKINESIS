import { useState, useCallback, useEffect } from 'react';
import { FileCode } from 'lucide-react';
import UploadZone from './UploadZone';
import AuditTable from './AuditTable';
import ComplianceStatRibbon from './ComplianceStatRibbon';
import IntelligenceRail from './IntelligenceRail';
import { samplePendingReview, computeAuditStats } from '../../data/sampleAuditData';
import { uploadConfigFile } from '../../services/api';

const RESULTS_CACHE_KEY = 'netguardian-last-results';

function loadCachedResults() {
  try {
    const cached = sessionStorage.getItem(RESULTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupted or unavailable cache — start clean
  }
  return [];
}

export default function DashboardView({
  activeSnapshot,
  onNavigateActiveLearning,
  onOpenHistory,
  onResultsChange,
}) {
  const [results, setResults] = useState(() =>
    activeSnapshot?.results ? activeSnapshot.results : loadCachedResults(),
  );
  const [isAuditing, setIsAuditing] = useState(false);

  // Sync snapshot changes if loaded from history
  const currentSnapshotId = activeSnapshot?.id;
  const [lastSnapshotId, setLastSnapshotId] = useState(currentSnapshotId);
  if (currentSnapshotId !== lastSnapshotId) {
    setLastSnapshotId(currentSnapshotId);
    if (activeSnapshot) {
      setResults(activeSnapshot.results);
    }
  }

  // Bubble results up for PDF export + persist so results survive navigation
  useEffect(() => {
    onResultsChange?.(results);
    try {
      sessionStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(results));
    } catch {
      // non-fatal
    }
  }, [results, onResultsChange]);

  const handleRunAudit = useCallback(async (payload) => {
    setIsAuditing(true);
    try {
      const fileToUpload = payload?.file;
      if (!fileToUpload) {
        alert('Select a config file or paste CLI commands first.');
        return;
      }

      const response = await uploadConfigFile(fileToUpload);

      if (response?.results && Array.isArray(response.results)) {
        const formatted = response.results.map((item, idx) => ({
          id: `audit-live-${idx + 1}`,
          status: item.status?.toUpperCase() === 'PASS' ? 'PASS' : 'FAIL',
          command: item.reference || item.rule || 'Global Configuration',
          ruleId: item.reference || `CIS-${idx + 1}.0`,
          ruleTitle: item.rule || 'Security Configuration Standard',
          ruleDesc: `Evaluated against NetGuardian compliance profile for ${response.filename || 'running-config'}.`,
          remediation: item.fix_command || 'No manual remediation specified.',
          rollback: item.fix_command
            ? `no ${item.fix_command}`
            : 'configure replace nvram:startup-config force',
          category: 'System Hardening',
          severity: item.status?.toUpperCase() === 'PASS' ? 'INFO' : 'HIGH',
          confidence: 0.98,
        }));
        setResults(formatted);
        return;
      }

      alert('Backend returned no results — check the backend terminal.');
      setResults([]);
    } catch (err) {
      console.error('Live backend audit failed:', err);
      alert('Audit failed — is the backend running on localhost:8000?');
      setResults([]);
    } finally {
      setIsAuditing(false);
    }
  }, []);

  const stats = computeAuditStats(Array.isArray(results) ? results : []);

  return (
    <main className="p-4 sm:p-6 space-y-6 animate-fade-in w-full">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 flex flex-col gap-6 min-w-0">
          <ComplianceStatRibbon stats={stats} activeSnapshot={activeSnapshot} />

          <UploadZone onRunAudit={handleRunAudit} isAuditing={isAuditing} />

          {activeSnapshot && (
            <div
              id="active-snapshot-banner"
              className="insight-card-white p-4 flex items-center justify-between flex-wrap gap-3 border-l-4 border-l-[#876DFF] shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-[#876DFF]">
                  <FileCode size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                      {activeSnapshot.fileName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                      {activeSnapshot.benchmark}
                    </span>
                  </div>
                  <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {activeSnapshot.timestamp} UTC · Host: {activeSnapshot.hostname}
                  </p>
                </div>
              </div>
              <span className="pill-pass">Score: {activeSnapshot.score}%</span>
            </div>
          )}

          {isAuditing && (
            <div className="insight-card-white p-8 text-center shadow-xs">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#BAF91A]/20 text-[#BAF91A] mb-2">
                <span className="w-5 h-5 rounded-full border-2 border-[#101312] dark:border-[#BAF91A] border-t-transparent animate-spin" />
              </div>
              <p className="m-0 text-sm font-bold text-neutral-900 dark:text-white">
                Evaluating Air-Gapped CIS / STIG Benchmark Baseline…
              </p>
              <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Local SetFit sentence classification · AST parsing · Zero outbound telemetry
              </p>
            </div>
          )}

          {!isAuditing && results && results.length > 0 && (
            <AuditTable
              results={results}
              onNavigateActiveLearning={onNavigateActiveLearning}
            />
          )}
        </div>

        <aside className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-20">
          <IntelligenceRail
            onNavigateActiveLearning={onNavigateActiveLearning}
            stats={stats}
            pendingPrediction={samplePendingReview}
            activeSnapshot={activeSnapshot}
            auditResults={results}
          />
        </aside>
      </div>
    </main>
  );
}
