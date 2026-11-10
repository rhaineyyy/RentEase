import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'rentease_theme';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted WebViews.
  }
  return 'light';
}

export const themeMode = ref<ThemeMode>(readStoredTheme());

export function applyThemeToDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
  root.classList.toggle('theme-dark', mode === 'dark');
  root.classList.toggle('theme-light', mode === 'light');

  if (document.body) {
    document.body.setAttribute('data-theme', mode);
    document.body.classList.toggle('theme-dark', mode === 'dark');
    document.body.classList.toggle('theme-light', mode === 'light');
  }

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', mode === 'dark' ? 'dark' : 'light');
  }
}

export function setTheme(mode: ThemeMode): void {
  themeMode.value = mode;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors.
    }
  }
  applyThemeToDom(mode);
}

export function toggleTheme(): void {
  setTheme(themeMode.value === 'light' ? 'dark' : 'light');
}

export function initTheme(): void {
  const initial = readStoredTheme();
  themeMode.value = initial;
  applyThemeToDom(initial);
}
