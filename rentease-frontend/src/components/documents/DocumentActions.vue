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
  border: 1px solid #c5d4ea; border-radius: 8px; background: #f4f8fd; color: #163e72;
  font: inherit; font-size: 12px; font-weight: 700; padding: 6px 8px; cursor: pointer;
}
.doc-actions > button:disabled, .doc-viewer-bar button:disabled { opacity: .6; cursor: wait; }
.doc-actions ion-icon { font-size: 15px; }
.doc-error { flex-basis: 100%; margin: 0; color: #9d3040; font-size: 12px; }
.doc-viewer {
  position: fixed; inset: 0; z-index: 100000; display: grid; grid-template-rows: auto minmax(0, 1fr);
  background: rgba(12, 28, 48, .72); padding: 18px;
}
.doc-viewer-bar {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 12px 12px 0 0; background: #12315c; color: white;
}
.doc-viewer-bar div { display: flex; flex-wrap: wrap; gap: 8px; }
.doc-viewer-bar button { background: white; }
.doc-viewer iframe { width: 100%; height: 100%; border: 0; border-radius: 0 0 12px 12px; background: white; }
@media (max-width: 720px) {
  .doc-viewer { padding: 8px; }
  .doc-viewer-bar { align-items: flex-start; flex-direction: column; }
}
</style>
