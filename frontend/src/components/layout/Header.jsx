import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Printer,
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function Header({
  onExportPDF,
  onDownloadPDF,
  activeNav = 'dashboard',
  onNavigate,
  onSearch,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Global Keyboard Shortcut for Search (⌘ + Space / Ctrl + Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault();
        const searchInput = document.getElementById('global-audit-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      if (onDownloadPDF) {
        await onDownloadPDF();
      } else if (onExportPDF) {
        await onExportPDF();
      }
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 px-6 py-3.5 bg-[var(--color-canvas)]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 transition-colors"
    >
      {/* ── Left: View Title & Breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2 m-0">
            <span>Your Analytical Board</span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E2FF99] text-[#101312] font-semibold">
              CIS v4.0
            </span>
          </h1>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 m-0 hidden md:block">
            Air-gapped Cisco IOS security compliance & STIG audit intelligence
          </p>
        </div>
      </div>

      {/* ── Center: Search Bar with ⌘ + Space pill ── */}
      <div className="flex-1 max-w-md hidden sm:block">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex items-center w-full px-3.5 py-1.5 rounded-full bg-white dark:bg-[#101312] border border-slate-200/80 dark:border-white/10 shadow-xs focus-within:border-[#BAF91A] dark:focus-within:border-[#BAF91A] transition-all">
            <Search size={14} className="text-neutral-400 dark:text-neutral-500 mr-2 shrink-0" />
            <input
              id="global-audit-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules, CIS IDs, or CLI commands..."
              className="w-full bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
            />
            <span className="pill-shortcut shrink-0 select-none ml-2">
              ⌘ + Space
            </span>
          </div>
        </form>
      </div>

      {/* ── Right: Utilities & Profile Actions ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Defense PDF Export Actions */}
        <div className="flex items-center gap-1.5">
          <button
            id="header-download-pdf-btn"
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="btn-lime text-xs px-3 py-1.5 rounded-full shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-75 transition-opacity"
            title="Download Defense Compliance PDF directly"
          >
            {isExporting ? (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <Download size={13} strokeWidth={2.4} />
            )}
            <span className="hidden sm:inline">
              {isExporting ? 'Generating Report...' : 'Download PDF'}
            </span>
          </button>

          <button
            id="header-export-pdf-btn"
            type="button"
            onClick={onExportPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-[#101312] border border-slate-200/80 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer shadow-xs"
            title="Print / Preview Defense Report"
          >
            <Printer size={12} className="text-[#876DFF]" />
            <span className="hidden md:inline">Print</span>
          </button>
        </div>

        {/* Dark / Light Mode Switch */}
        <div className="ml-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

