import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'vc-theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

// Aplicar antes del primer render para evitar flash de tema incorrecto
// (index.html tambien lo hace inline; esto cubre navegacion SPA y HMR)
if (typeof document !== 'undefined' && !document.documentElement.dataset.theme) {
  document.documentElement.dataset.theme = initialTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || initialTheme()
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* storage bloqueado */ }
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
