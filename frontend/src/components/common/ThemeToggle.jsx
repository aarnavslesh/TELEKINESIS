import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative flex items-center cursor-pointer select-none h-7 w-12 rounded-full p-0.5 transition-colors bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80"
    >
      <span
        className={`flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200/50 dark:border-neutral-700 transition-transform duration-200 ease-out ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon size={11} strokeWidth={2} className="text-neutral-200" />
        ) : (
          <Sun size={11} strokeWidth={2} className="text-neutral-700" />
        )}
      </span>
    </button>
  );
}
