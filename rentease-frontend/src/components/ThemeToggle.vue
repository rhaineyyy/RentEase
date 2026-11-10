<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { sunnyOutline, moonOutline } from 'ionicons/icons';
import { themeMode, setTheme } from '@/services/theme';
</script>

<template>
  <div class="theme-switcher" role="group" aria-label="Appearance mode">
    <button
      type="button"
      class="theme-option"
      :class="{ active: themeMode === 'light' }"
      :aria-pressed="themeMode === 'light'"
      title="Switch to Light Mode"
      @click="setTheme('light')"
    >
      <IonIcon :icon="sunnyOutline" aria-hidden="true" />
      <span>Light</span>
    </button>
    <button
      type="button"
      class="theme-option"
      :class="{ active: themeMode === 'dark' }"
      :aria-pressed="themeMode === 'dark'"
      title="Switch to Dark Mode"
      @click="setTheme('dark')"
    >
      <IonIcon :icon="moonOutline" aria-hidden="true" />
      <span>Dark</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 999px;
  background: #e6f0fa;
  border: 1px solid #c5dbf4;
  box-shadow: inset 0 1px 2px rgba(13, 45, 132, 0.05);
  flex-shrink: 0;
}

.theme-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #4b5e7a;
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease;
  white-space: nowrap;
}

.theme-option ion-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.theme-option:hover {
  color: #0b132b;
}

.theme-option.active {
  background: linear-gradient(90deg, #0033ff 0%, #0a45ff 55%, #1a5cff 100%);
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(10, 69, 255, 0.28);
}

:global(html[data-theme="dark"]) .theme-switcher {
  background: #141923;
  border-color: rgba(148, 163, 184, 0.22);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
}

:global(html[data-theme="dark"]) .theme-option {
  color: #94a3b8;
}

:global(html[data-theme="dark"]) .theme-option:hover {
  color: #f8fafc;
}

:global(html[data-theme="dark"]) .theme-option.active {
  background: linear-gradient(135deg, #22d3ee, #06b6d4);
  color: #04131a;
  box-shadow: 0 3px 12px rgba(34, 211, 238, 0.32);
}

@media (max-width: 640px) {
  .theme-switcher {
    padding: 2px;
    gap: 2px;
  }

  .theme-option {
    min-height: 28px;
    padding: 4px 8px;
    font-size: 10px;
    gap: 4px;
  }

  .theme-option ion-icon {
    font-size: 13px;
  }
}

@media (max-width: 420px) {
  .theme-option span {
    display: none;
  }

  .theme-option {
    width: 28px;
    height: 28px;
    padding: 0;
  }
}
</style>
