<template>
  <div class="notice-center">
    <button ref="bell" type="button" class="notice-bell" :class="tone" aria-label="Open notifications" :aria-expanded="open" @click.stop="toggle">
      <IonIcon :icon="notificationsOutline" />
      <span v-if="unread" class="notice-count">{{ unread > 9 ? '9+' : unread }}</span>
    </button>
    <Teleport to="body">
    <div v-if="open" class="notice-panel" :style="panelStyle" role="dialog" aria-label="Notifications" @click.stop>
      <div class="notice-head">
        <strong>Notifications</strong>
        <button type="button" :disabled="!unread || busy" @click="markAll">Mark all read</button>
      </div>
      <p v-if="error" class="notice-error">{{ error }}</p>
      <p v-else-if="!items.length" class="notice-empty">No notifications yet.</p>
      <ul v-else>
        <li v-for="item in items" :key="item.notification_id" :class="{ unread: !item.is_read }">
          <button type="button" @click="openItem(item)">
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
            <small>{{ when(item.created_at) }}</small>
          </button>
        </li>
      </ul>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { notificationsOutline } from 'ionicons/icons';
import api from '@/services/api';

defineProps<{ tone?: 'light' | 'dark' }>();

const emit = defineEmits<{ open: [eventKey: string] }>();

type Notice = { notification_id: number; event_key?: string; title: string; body: string; is_read: boolean; created_at: string };
const open = ref(false);
const busy = ref(false);
const error = ref('');
const unread = ref(0);
const items = ref<Notice[]>([]);
const bell = ref<HTMLButtonElement | null>(null);
const panelStyle = ref<Record<string, string>>({});
let timer = 0;

function place() {
  const node = bell.value;
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 16);
  panelStyle.value = {
    position: 'fixed',
    top: `${Math.round(rect.bottom + 8)}px`,
    right: `${Math.max(8, Math.round(window.innerWidth - rect.right))}px`,
    width: `${width}px`,
    zIndex: '4000',
  };
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return;
  const target = event.target;
  if (target instanceof Node && bell.value?.contains(target)) return;
  if (target instanceof Element && target.closest('.notice-panel')) return;
  open.value = false;
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}

async function load() {
  try {
    const { data } = await api.get('/notifications');
    items.value = data.notifications || [];
    unread.value = Number(data.unread || 0);
    error.value = '';
  } catch {
    error.value = 'Notifications could not be loaded.';
  }
}

async function toggle() {
  open.value = !open.value;
  if (!open.value) return;
  await nextTick();
  place();
  await load();
}

async function openItem(item: Notice) {
  if (!item.is_read && !busy.value) {
    busy.value = true;
    try {
      await api.patch(`/notifications/${item.notification_id}/read`);
      item.is_read = true;
      unread.value = Math.max(0, unread.value - 1);
    } finally {
      busy.value = false;
    }
  }
  open.value = false;
  emit('open', item.event_key || '');
}

async function markAll() {
  if (!unread.value || busy.value) return;
  busy.value = true;
  try {
    await api.patch('/notifications/read-all');
    items.value.forEach(item => { item.is_read = true; });
    unread.value = 0;
  } finally {
    busy.value = false;
  }
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

onMounted(() => {
  void load();
  timer = window.setInterval(() => { void load(); }, 30000);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', place);
});
onUnmounted(() => {
  window.clearInterval(timer);
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', place);
});
</script>

<style scoped>
.notice-center { position: relative; }
.notice-bell { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 50%; background: #161821; color: #e2e8f0; cursor: pointer; transition: background 0.18s, border-color 0.18s; }
.notice-bell:hover { background: #1f2230; border-color: rgba(34, 211, 238, 0.38); color: #ffffff; }
.notice-bell.light { color: #e2e8f0; }
.notice-bell ion-icon { font-size: 20px; }
.notice-count { position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 99px; background: #f43f5e; color: white; font-size: 10px; font-weight: 800; line-height: 16px; }
.notice-panel { max-height: min(420px, 70vh); overflow: auto; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 18px; background: #131620; color: #f3f4f6; box-shadow: 0 22px 48px rgba(0, 0, 0, 0.65); }
.notice-head, .notice-head button, li button { font: inherit; }
.notice-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.notice-head strong { color: #ffffff; font-size: 14px; }
.notice-head button { border: 0; background: transparent; color: #22d3ee; font-size: 12px; font-weight: 700; cursor: pointer; }
.notice-head button:disabled { opacity: 0.45; cursor: not-allowed; }
.notice-empty, .notice-error { margin: 8px 0; color: #8b92a5; font-size: 13px; }
.notice-error { color: #f472b6; }
ul { list-style: none; margin: 0; padding: 0; }
li + li { border-top: 1px solid rgba(255, 255, 255, 0.06); }
li button { display: grid; gap: 3px; width: 100%; padding: 10px 8px; border: 0; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; transition: background 0.15s; }
li button:hover { background: rgba(255, 255, 255, 0.04); }
li.unread button { background: rgba(34, 211, 238, 0.09); }
li strong { color: #ffffff; font-size: 13px; }
li span, li small { color: #9ca3af; font-size: 12px; line-height: 1.4; }
</style>
