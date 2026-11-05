<template>
  <div class="google-continue">
    <div v-if="enabled" ref="buttonHost" class="google-button-host"></div>
    <p v-else-if="checked && !localError" class="google-note">Google sign-in needs a Google client ID in the server configuration.</p>
    <p v-if="localError" class="google-note error">{{ localError }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import api from '@/services/api';
import type { AuthUser } from '@/services/auth';
import { currentUser } from '@/services/auth';

const props = defineProps<{ intent: 'login' | 'register'; role?: 'tenant' | 'owner'; disabled?: boolean }>();
const emit = defineEmits<{ success: [user: AuthUser]; pending: [message: string]; error: [message: string] }>();

const buttonHost = ref<HTMLElement | null>(null);
const enabled = ref(false);
const checked = ref(false);
const localError = ref('');
let clientId = '';

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
};

function googleGlobal() {
  return (window as Window & { google?: GoogleAccounts }).google;
}

function loadScript() {
  const existing = googleGlobal();
  if (existing?.accounts?.id) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(script);
  });
}

async function render() {
  const google = googleGlobal();
  const host = buttonHost.value;
  if (!enabled.value || !google || !host) return;
  if (props.disabled) { host.innerHTML = ''; return; }
  host.innerHTML = '';
  google.accounts.id.initialize({
    client_id: clientId,
    callback: response => { void complete(response.credential || ''); },
  });
  google.accounts.id.renderButton(host, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: 320,
    logo_alignment: 'left',
  });
}

async function complete(credential: string) {
  localError.value = '';
  if (!credential) {
    localError.value = 'Google did not return a sign-in token.';
    return;
  }
  try {
    const { data } = await api.post('/auth/google', {
      credential,
      intent: props.intent,
      role: props.role,
    });
    if (data.user?.role) {
      currentUser.value = data.user;
      emit('success', data.user);
      return;
    }
    emit('pending', data.message || 'Your account is waiting for approval.');
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Google sign-in could not be completed.';
    localError.value = message;
    emit('error', message);
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/google/config');
    clientId = String(data.clientId || '');
    enabled.value = Boolean(data.enabled && clientId);
    checked.value = true;
    if (enabled.value) {
      await loadScript();
      await render();
    }
  } catch {
    checked.value = true;
    localError.value = 'Google sign-in is unavailable right now.';
  }
});

watch(() => [props.disabled, props.role], () => { void render(); });
</script>

<style scoped>
.google-continue { margin-top: 14px; }
.google-button-host { display: flex; justify-content: center; min-height: 44px; }
.google-note { margin: 8px 0 0; color: #6d7f96; font-size: 12px; line-height: 1.45; text-align: center; }
.google-note.error { color: #a33c46; }
</style>
