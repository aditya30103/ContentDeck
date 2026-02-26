import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system' | 'sepia' | 'navy';

const STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.classList.toggle('sepia', resolved === 'sepia');
  document.documentElement.classList.toggle('navy', resolved === 'navy');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
  });

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    const cycle: Theme[] = ['light', 'dark', 'sepia', 'navy'];
    const current = theme === 'system' ? getSystemTheme() : theme;
    const idx = cycle.indexOf(current as Theme);
    setTheme(cycle[(idx + 1) % cycle.length]!);
  }, [theme, setTheme]);

  // Apply on mount and listen for system changes
  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark:
      theme === 'dark' || theme === 'navy' || (theme === 'system' && getSystemTheme() === 'dark'),
  };
}
