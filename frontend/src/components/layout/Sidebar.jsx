import {
  LayoutDashboard,
  BrainCircuit,
  History,
  ShieldCheck,
  Cpu,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import logoImg from '../../assets/logo.png';

export default function Sidebar({
  activeNav = 'dashboard',
  onNavigate,
  reviewQueueItems,
  pendingReviewCount = 3,
  className = '',
}) {
  const { theme, toggleTheme, isDark } = useTheme();

  // Dynamically compute pending items count from review queue
  const pendingCount = reviewQueueItems
    ? reviewQueueItems.filter((item) => item.status === 'pending' || !item.reviewed).length
    : (pendingReviewCount ?? 0);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => onNavigate?.('dashboard'),
    },
    {
      id: 'active-learning',
      label: 'Active Learning Queue',
      icon: BrainCircuit,
      badge: pendingCount > 0 ? pendingCount : null,
      action: () => onNavigate?.('active-learning'),
    },
    {
      id: 'history',
      label: 'Audit History',
      icon: History,
      action: () => onNavigate?.('history'),
    },
    {
      id: 'policies',
      label: 'Policies & Matrix',
      icon: ShieldCheck,
      action: () => {
        onNavigate?.('dashboard');
        setTimeout(() => {
          const el = document.getElementById('audit-results-table');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      },
    },
  ];

  return (
    <aside
      id="insight-sidebar"
      className={`w-64 xl:w-72 flex-shrink-0 bg-white dark:bg-[#101312] border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-between p-5 md:sticky md:top-0 md:h-screen md:overflow-y-auto transition-colors duration-200 ${className}`}
    >
      {/* ── Top: Brand Header ── */}
      <div className="space-y-6">
        <div
          className="flex items-center justify-between cursor-pointer select-none group"
          onClick={() => onNavigate?.('dashboard')}
        >
          <div className="flex items-center gap-3">
            {/* Brand Logo Mark */}
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-black/60 border border-white/10 shadow-sm flex-shrink-0 transition-transform group-hover:scale-105">
              <img
                src={logoImg}
                alt="Telekinesis Brand Logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                  TELEKINESIS
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#BAF91A]" />
              </div>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium tracking-wide uppercase">
                InsightOS Auditor
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation Pill List ── */}
        <nav className="space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
            Operational Cockpit
          </div>

          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                type="button"
                onClick={item.action}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#101312] text-white dark:bg-white/10 dark:text-white shadow-sm border border-black/5 dark:border-white/10'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.4 : 2}
                    className={
                      isActive
                        ? 'text-[#BAF91A]'
                        : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white'
                    }
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#BAF91A] text-[#101312]'
                        : 'bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom: System Status & Theme Switcher ── */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
        {/* Air-Gapped CPU Status Pill */}
        <div
          id="sidebar-air-gapped-status"
          className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-neutral-900 dark:text-white tracking-tight">
                Air-Gapped: Local CPU
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#BAF91A]/20 text-[#101312] dark:text-[#BAF91A] font-bold">
              OFFLINE
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1 font-mono">
              <Cpu size={11} /> SetFit bge-small
            </span>
            <span>0 Outbound</span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          id="sidebar-theme-toggle"
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {isDark ? (
              <Sun size={14} className="text-amber-400" />
            ) : (
              <Moon size={14} className="text-neutral-600" />
            )}
            <span>{isDark ? 'Light Canvas' : 'Dark Canvas'}</span>
          </span>
          <span className="text-[10px] font-mono font-semibold text-neutral-400 dark:text-neutral-500 uppercase">
            {theme}
          </span>
        </button>
      </div>
    </aside>
  );
}
