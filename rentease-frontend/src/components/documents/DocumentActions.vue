<template>
  <div class="doc-actions">
    <button type="button" :disabled="busy !== ''" @click="openDocument">
      <IonIcon :icon="eyeOutline" aria-hidden="true" />
      {{ busy === 'view' ? 'Preparing...' : viewLabel }}
    </button>
    <button type="button" :disabled="busy !== ''" @click="downloadDocument">
      <IonIcon :icon="downloadOutline" aria-hidden="true" />
      {{ busy === 'download' ? 'Preparing...' : downloadLabel }}
    </button>
    <button type="button" :disabled="busy !== ''" @click="printDocument">
      <IonIcon :icon="printOutline" aria-hidden="true" />
      {{ busy === 'print' ? 'Preparing...' : 'Print' }}
    </button>
    <p v-if="error" class="doc-error" role="alert">{{ error }}</p>
    <Teleport to="body">
      <div v-if="previewUrl" class="doc-viewer" role="dialog" aria-modal="true" :aria-label="viewLabel">
        <div class="doc-viewer-bar">
          <strong>{{ viewLabel }}</strong>
          <div>
            <button type="button" @click="printFrame">Print</button>
            <button type="button" @click="downloadDocument">Download PDF</button>
            <button type="button" @click="closePreview">Back</button>
          </div>
        </div>
        <iframe ref="frame" :src="previewUrl" title="RentEase document preview"></iframe>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { downloadOutline, eyeOutline, printOutline } from 'ionicons/icons';
import { loadDocument, type DocumentKind } from '@/services/documents';

const props = defineProps<{ kind: DocumentKind; id: number }>();

const labels: Record<DocumentKind, [string, string]> = {
  leases: ['View Contract', 'Download Contract'],
  bills: ['View Statement', 'Download Statement'],
  payments: ['View Receipt', 'Download Receipt'],
};
const viewLabel = labels[props.kind][0];
const downloadLabel = labels[props.kind][1];
const busy = ref<'view' | 'download' | 'print' | ''>('');
const error = ref('');
const previewUrl = ref('');
const frame = ref<HTMLIFrameElement | null>(null);

function pdfBlob(blob: Blob) {
  return blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
}

function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}

async function openDocument() {
  if (busy.value) return;
  busy.value = 'view';
  error.value = '';
  try {
    const file = await loadDocument(props.kind, props.id, false);
    closePreview();
    previewUrl.value = URL.createObjectURL(pdfBlob(file.blob));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The document could not be prepared.';
  } finally {
    busy.value = '';
  }
}

async function downloadDocument() {
  if (busy.value) return;
  busy.value = 'download';
  error.value = '';
  try {
    const file = await loadDocument(props.kind, props.id, true);
    const url = URL.createObjectURL(pdfBlob(file.blob));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The document could not be prepared.';
  } finally {
    busy.value = '';
  }
}

function printFrame() {
  const target = frame.value?.contentWindow;
  if (!target) {
    error.value = 'Open the document again before printing.';
    return;
  }
  target.focus();
  target.print();
}

async function printDocument() {
  if (busy.value) return;
  busy.value = 'print';
  error.value = '';
  try {
    const file = await loadDocument(props.kind, props.id, false);
    closePreview();
    previewUrl.value = URL.createObjectURL(pdfBlob(file.blob));
    await nextTick();
    const target = frame.value;
    if (!target) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      target.contentWindow?.focus();
      target.contentWindow?.print();
    };
    target.addEventListener('load', start, { once: true });
    window.setTimeout(start, 900);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The document could not be prepared.';
  } finally {
    busy.value = '';
  }
}

onUnmounted(closePreview);
</script>

<style scoped>
.doc-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
.doc-actions > button, .doc-viewer-bar button {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid #cbd8e8; border-radius: 999px; background: #f8fbff; color: #1e293b;
  font: inherit; font-size: 11.5px; font-weight: 700; padding: 6px 12px; cursor: pointer; transition: background 0.16s, border-color 0.16s, color 0.16s;
}
.doc-actions > button:hover:not(:disabled), .doc-viewer-bar button:hover:not(:disabled) {
  background: #ecfeff; border-color: #06b6d4; color: #0891b2;
}
.doc-actions > button:disabled, .doc-viewer-bar button:disabled { opacity: .55; cursor: wait; }
.doc-actions ion-icon { font-size: 15px; }
.doc-error { flex-basis: 100%; margin: 0; color: #e11d48; font-size: 12px; }
.doc-viewer {
  position: fixed; inset: 0; z-index: 100000; display: grid; grid-template-rows: auto minmax(0, 1fr);
  background: rgba(15, 23, 42, .62); padding: 18px; backdrop-filter: blur(4px);
}
.doc-viewer-bar {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 14px 14px 0 0; background: #ffffff; color: #0f172a; border: 1px solid #dbe5f1; border-bottom: 1px solid #e2ebf5;
}
.doc-viewer-bar div { display: flex; flex-wrap: wrap; gap: 8px; }
.doc-viewer-bar button { background: #f1f6fc; color: #0f172a; }
.doc-viewer iframe { width: 100%; height: 100%; border: 0; border-radius: 0 0 14px 14px; background: white; }

:global(html[data-theme="dark"]) .doc-actions > button,
:global(html[data-theme="dark"]) .doc-viewer-bar button {
  border-color: rgba(255, 255, 255, 0.12); background: #1c1f2b; color: #e2e8f0;
}
:global(html[data-theme="dark"]) .doc-actions > button:hover:not(:disabled),
:global(html[data-theme="dark"]) .doc-viewer-bar button:hover:not(:disabled) {
  background: rgba(34, 211, 238, 0.14); border-color: rgba(34, 211, 238, 0.42); color: #22d3ee;
}
:global(html[data-theme="dark"]) .doc-error { color: #f472b6; }
:global(html[data-theme="dark"]) .doc-viewer { background: rgba(5, 7, 11, .84); }
:global(html[data-theme="dark"]) .doc-viewer-bar { background: #14161e; color: white; border-color: rgba(255, 255, 255, 0.08); }
:global(html[data-theme="dark"]) .doc-viewer-bar button { background: #1e2230; color: #f3f4f6; }

@media (max-width: 720px) {
  .doc-viewer { padding: 8px; }
  .doc-viewer-bar { align-items: flex-start; flex-direction: column; }
}
</style>
