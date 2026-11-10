import { ref } from 'vue';

export type ThemeMode = 'dark';

export const themeMode = ref<ThemeMode>('dark');

export function applyThemeToDom(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', 'dark');
  root.style.colorScheme = 'dark';
  root.classList.add('theme-dark');
  root.classList.remove('theme-light');

  if (document.body) {
    document.body.setAttribute('data-theme', 'dark');
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-light');
  }

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', 'dark');
  }
}

export function setTheme(): void {
  themeMode.value = 'dark';
  applyThemeToDom();
}

export function toggleTheme(): void {
  setTheme();
}

export function initTheme(): void {
  setTheme();
}
