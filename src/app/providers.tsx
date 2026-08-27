'use client';
import { useEffect } from 'react';
import { CookieConsentBanner } from '@/components/ui/CookieConsentBanner';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

const THEME_STORAGE_KEY = 'theme-preference';

export function Providers({ children }: { children: React.ReactNode }) {
  const rehydrate = useAuthStore((s) => s.rehydrate);

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  // Initialize theme on app load
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check localStorage for saved preference
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          applyTheme(stored);
          return;
        }
      } catch { /* noop */ }

      // Fallback to system preference
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    };

    const applyTheme = (theme: 'light' | 'dark') => {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };

    // Run initialization
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeTheme);
      return () => document.removeEventListener('DOMContentLoaded', initializeTheme);
    } else {
      initializeTheme();
    }
  }, []);

  return (
    <ToastProvider>
      {children}
      <CookieConsentBanner />
    </ToastProvider>
  );
}
