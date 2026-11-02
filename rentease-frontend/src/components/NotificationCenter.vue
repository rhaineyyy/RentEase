<template>
  <div class="notice-center">
    <button type="button" class="notice-bell" :class="tone" aria-label="Open notifications" :aria-expanded="open" @click="toggle">
      <IonIcon :icon="notificationsOutline" />
      <span v-if="unread" class="notice-count">{{ unread > 9 ? '9+' : unread }}</span>
    </button>
    <div v-if="open" class="notice-panel" role="dialog" aria-label="Notifications">
      <div class="notice-head">
        <strong>Notifications</strong>
        <button type="button" :disabled="!unread || busy" @click="markAll">Mark all read</button>
      </div>
      <p v-if="error" class="notice-error">{{ error }}</p>
      <p v-else-if="!items.length" class="notice-empty">No notifications yet.</p>
      <ul v-else>
        <li v-for="item in items" :key="item.notification_id" :class="{ unread: !item.is_read }">
          <button type="button" @click="markOne(item)">
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
            <small>{{ when(item.created_at) }}</small>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { notificationsOutline } from 'ionicons/icons';
import api from '@/services/api';

defineProps<{ tone?: 'light' | 'dark' }>();

type Notice = { notification_id: number; title: string; body: string; is_read: boolean; created_at: string };
const open = ref(false);
const busy = ref(false);
const error = ref('');
const unread = ref(0);
const items = ref<Notice[]>([]);
let timer = 0;

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
  if (open.value) await load();
}

async function markOne(item: Notice) {
  if (item.is_read || busy.value) return;
  busy.value = true;
  try {
    await api.patch(`/notifications/${item.notification_id}/read`);
    item.is_read = true;
    unread.value = Math.max(0, unread.value - 1);
  } finally {
    busy.value = false;
  }
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
});
onUnmounted(() => window.clearInterval(timer));
</script>

<style scoped>
.notice-center { position: relative; }
.notice-bell { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 12px; background: transparent; color: #355364; cursor: pointer; }
.notice-bell.light { color: white; }
.notice-bell ion-icon { font-size: 20px; }
.notice-count { position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 99px; background: #e23b4a; color: white; font-size: 10px; font-weight: 800; line-height: 16px; }
.notice-panel { position: absolute; right: 0; top: 44px; z-index: 30; width: min(360px, 80vw); max-height: 420px; overflow: auto; padding: 12px; border: 1px solid #d7e3f2; border-radius: 16px; background: white; color: #17324f; box-shadow: 0 18px 40px rgba(16, 42, 82, .16); }
.notice-head, .notice-head button, li button { font: inherit; }
.notice-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.notice-head button { border: 0; background: transparent; color: #1766bd; font-size: 12px; font-weight: 700; cursor: pointer; }
.notice-empty, .notice-error { margin: 8px 0; color: #6d7f96; font-size: 13px; }
.notice-error { color: #a33c46; }
ul { list-style: none; margin: 0; padding: 0; }
li + li { border-top: 1px solid #e7eef6; }
li button { display: grid; gap: 3px; width: 100%; padding: 10px 4px; border: 0; background: transparent; text-align: left; cursor: pointer; }
li.unread button { background: #f3f8ff; }
li strong { color: #17324f; font-size: 13px; }
li span, li small { color: #60748c; font-size: 12px; line-height: 1.4; }
</style>
