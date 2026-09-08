import { useState, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardView from './components/dashboard/DashboardView';
import ActiveLearningView from './components/active-learning/ActiveLearningView';
import AuditHistoryView from './components/history/AuditHistoryView';
import { sampleHistorySnapshots } from './data/sampleHistory';
import { sampleReviewQueue } from './data/sampleReviewQueue';
import {
  computeAuditStats,
} from './data/sampleAuditData';
import { exportDefensePdfReport, downloadDefensePdfReport } from './utils/pdfExport';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'active-learning' | 'history'
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const [highlightedReviewId, setHighlightedReviewId] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);

  // Hold audit results reference for PDF export from header
  const [auditResultsRef, setAuditResultsRef] = useState(null);

  const handleLoadSnapshot = useCallback((snapshot) => {
    setActiveSnapshot(snapshot);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateActiveLearning = useCallback((targetId) => {
    setHighlightedReviewId(targetId || 'review-001');
    setCurrentView('active-learning');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getActiveAuditData = useCallback(() => {
    const data = activeSnapshot || auditResultsRef || [];
    const stats = computeAuditStats(Array.isArray(data) ? data : data.results || []);
    return activeSnapshot || {
      fileName: 'active-audit.cfg',
      benchmark: 'CIS Cisco IOS v4.0',
      profile: 'Level 1 - High Security',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      score: stats.score,
      passed: stats.passed,
      failed: stats.failed,
      warnings: stats.warnings,
      totalRules: stats.total,
      hostname: 'CORE-SW-01.HQ.DEFENSE.LOCAL',
      firmware: 'Cisco IOS 15.2(4)M',
      sha256: '9f83b1657ff1850b28b32c65ac447b15d3b147b6ec5d00e5a65d16c34b6e761e',
      engine: 'TELEKINESIS v1.2 / SetFit-bge-small',
      results: Array.isArray(data) ? data : data.results || [],
    };
  }, [activeSnapshot, auditResultsRef]);

  const handleExportPDF = useCallback(() => {
    const data = getActiveAuditData();
    if (!data.results || data.results.length === 0) {
      alert('Run an audit first — there is nothing to export yet.');
      return;
    }
    exportDefensePdfReport(data);
  }, [getActiveAuditData]);

  const handleDownloadPDF = useCallback(async () => {
    const data = getActiveAuditData();
    if (!data.results || data.results.length === 0) {
      alert('Run an audit first — there is nothing to export yet.');
      return;
    }
    await downloadDefensePdfReport(data);
  }, [getActiveAuditData]);

  const activeNav = currentView;

  const handleNav = useCallback(
    (navId) => {
      if (navId === 'dashboard') {
        setCurrentView('dashboard');
        setHighlightedReviewId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (navId === 'active-learning') {
        handleNavigateActiveLearning('review-001');
      } else if (navId === 'history') {
        setCurrentView('history');
        setHighlightedReviewId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (navId === 'audit-matrix' || navId === 'policies') {
        setCurrentView('dashboard');
        setHighlightedReviewId(null);
        setTimeout(() => {
          const el = document.getElementById('audit-results-table');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
      }
    },
    [handleNavigateActiveLearning],
  );

  return (
    <div
      id="app-shell"
      className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] flex flex-col md:flex-row transition-colors duration-200"
    >
      {/* ── Column 1: Left Navigation Sidebar ── */}
      <Sidebar
        activeNav={activeNav}
        onNavigate={handleNav}
        reviewQueueItems={reviewQueue}
      />

      {/* ── Main Cockpit Area (TopBar + Center Workspace + Right Intelligence Rail) ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          activeNav={activeNav}
          onNavigate={handleNav}
          onExportPDF={handleExportPDF}
          onDownloadPDF={handleDownloadPDF}
        />

        {currentView === 'active-learning' && (
          <ActiveLearningView
            onBack={() => {
              setCurrentView('dashboard');
              setHighlightedReviewId(null);
            }}
            onNavigateDashboard={() => {
              setCurrentView('dashboard');
              setHighlightedReviewId(null);
            }}
            highlightedReviewId={highlightedReviewId}
            queue={reviewQueue}
            onQueueChange={setReviewQueue}
          />
        )}

        {currentView === 'history' && (
          <AuditHistoryView
            snapshots={sampleHistorySnapshots}
            currentSnapshotId={activeSnapshot?.id}
            onLoadSnapshot={handleLoadSnapshot}
            onBack={() => {
              setCurrentView('dashboard');
            }}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            onNavigateActiveLearning={handleNavigateActiveLearning}
            activeSnapshot={activeSnapshot}
            onResetSnapshot={() => setActiveSnapshot(null)}
            onOpenHistory={() => handleNav('history')}
            onResultsChange={setAuditResultsRef}
          />
        )}
      </div>
    </div>
  );
}
