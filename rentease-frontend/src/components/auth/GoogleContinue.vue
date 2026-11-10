<template>
  <div class="google-continue">
    <button
      v-if="enabled && isAndroid"
      type="button"
      class="google-native-button"
      :disabled="props.disabled || signingIn"
      @click="signInNatively"
    >
      <span class="google-mark" aria-hidden="true">G</span>
      <span>{{ signingIn ? 'Connecting to Google…' : 'Continue with Google' }}</span>
    </button>
    <div v-else-if="enabled" ref="buttonHost" class="google-button-host"></div>
    <p v-else-if="checked && !localError" class="google-note">Google sign-in needs a Google client ID in the server configuration.</p>
    <p v-if="localError" class="google-note error">{{ localError }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import api from '@/services/api';
import type { AuthUser } from '@/services/auth';
import { currentUser } from '@/services/auth';
import { themeMode } from '@/services/theme';

const props = defineProps<{ intent: 'login' | 'register'; role?: 'tenant' | 'owner'; disabled?: boolean }>();
const emit = defineEmits<{ success: [user: AuthUser]; pending: [message: string]; error: [message: string] }>();

const isAndroid = Capacitor.getPlatform() === 'android';
const buttonHost = ref<HTMLElement | null>(null);
const enabled = ref(false);
const checked = ref(false);
const signingIn = ref(false);
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
  if (isAndroid || !enabled.value || !google || !host) return;
  if (props.disabled) { host.innerHTML = ''; return; }
  host.innerHTML = '';
  google.accounts.id.initialize({
    client_id: clientId,
    callback: response => { void complete(response.credential || ''); },
  });
  google.accounts.id.renderButton(host, {
    type: 'standard',
    theme: themeMode.value === 'dark' ? 'filled_black' : 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: 320,
    logo_alignment: 'left',
  });
}

async function complete(credential: string): Promise<void> {
  localError.value = '';
  if (!credential) {
    localError.value = 'Google did not return a sign-in token.';
    emit('error', localError.value);
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

async function signInNatively(): Promise<void> {
  if (signingIn.value || props.disabled) return;
  signingIn.value = true;
  localError.value = '';
  try {
    await SocialLogin.initialize({
      google: {
        webClientId: clientId,
        mode: 'online',
      },
    });
    const { result } = await SocialLogin.login({ provider: 'google', options: {} });
    await complete(result.responseType === 'online' ? result.idToken || '' : '');
  } catch (error: unknown) {
    const detail = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : '';
    if (detail.toLowerCase().includes('cancel')) {
      localError.value = 'Google sign-in was cancelled.';
    } else {
      localError.value = detail || 'Google sign-in could not be completed. Check the Android OAuth client configuration and try again.';
      emit('error', localError.value);
    }
  } finally {
    signingIn.value = false;
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/google/config');
    clientId = String(data.clientId || '');
    enabled.value = Boolean(data.enabled && clientId);
    checked.value = true;
    if (enabled.value && !isAndroid) {
      await loadScript();
      await render();
    }
  } catch {
    checked.value = true;
    localError.value = 'Google sign-in is unavailable right now.';
  }
});

watch(() => [props.disabled, props.role, themeMode.value], () => { void render(); });
</script>

<style scoped>
.google-continue { margin-top: 14px; }
.google-button-host { display: flex; justify-content: center; min-height: 44px; }
.google-note { margin: 8px 0 0; color: #8b92a5; font-size: 12px; line-height: 1.45; text-align: center; }
.google-note.error { color: #f472b6; }
</style>
