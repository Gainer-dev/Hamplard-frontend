'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'theme-preference';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  // Initialize theme from storage or system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
        return;
      }
    } catch { /* noop */ }

    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === null) return;

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* noop */ }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  if (theme === null) {
    // Avoid hydration mismatch by not rendering until theme is set
    return null;
  }

  return (
    <button
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-current transition-colors hover:bg-hamplard-lilac dark:hover:bg-ink-700"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" />
      )}
    </button>
  );
}

export default ThemeToggle;
