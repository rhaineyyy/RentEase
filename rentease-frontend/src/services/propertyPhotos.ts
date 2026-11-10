import { ref } from 'vue';

/**
 * Curated high-resolution online photos (Unsplash architectural & interior photography)
 * for apartments/properties and individual rental units, plus persistent custom photo
 * uploads from the Property Owner portal.
 */

const CUSTOM_PHOTOS_STORAGE_KEY = 'rentease_custom_photos_v1';

interface CustomPhotoStore {
  properties: Record<string, string>;
  units: Record<string, string>;
}

function loadCustomPhotoStore(): CustomPhotoStore {
  if (typeof window === 'undefined') {
    return { properties: {}, units: {} };
  }
  try {
    const raw = window.localStorage.getItem(CUSTOM_PHOTOS_STORAGE_KEY);
    if (!raw) return { properties: {}, units: {} };
    const parsed = JSON.parse(raw);
    return {
      properties:
        parsed && typeof parsed.properties === 'object' && parsed.properties
          ? { ...parsed.properties }
          : {},
      units:
        parsed && typeof parsed.units === 'object' && parsed.units
          ? { ...parsed.units }
          : {},
    };
  } catch {
    return { properties: {}, units: {} };
  }
}

const customPhotoStore = ref<CustomPhotoStore>(loadCustomPhotoStore());

function persistCustomPhotoStore(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CUSTOM_PHOTOS_STORAGE_KEY,
      JSON.stringify(customPhotoStore.value),
    );
  } catch (err) {
    console.warn('[RentEase] Unable to persist custom photo in localStorage:', err);
  }
}

function normalizeKey(value?: string | number | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const PROPERTY_EXTERIOR_PHOTOS: readonly string[] = [
  // Modern mid-rise & high-rise residential apartment buildings
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=900&q=80',
];

const UNIT_INTERIOR_PHOTOS: readonly string[] = [
  // Modern apartment unit interiors (living rooms, studio units, lofts, bedrooms)
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
];

function stableIndex(seed: string | number | null | undefined, length: number): number {
  const raw = String(seed ?? '0').trim();
  if (!raw) return 0;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function getDefaultPropertyPhoto(
  id?: string | number | null,
  name?: string | null,
): string {
  const numericId = Number(id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return PROPERTY_EXTERIOR_PHOTOS[(numericId - 1) % PROPERTY_EXTERIOR_PHOTOS.length];
  }
  const key = `${id ?? ''}-${name ?? ''}`;
  return PROPERTY_EXTERIOR_PHOTOS[stableIndex(key, PROPERTY_EXTERIOR_PHOTOS.length)];
}

export function getDefaultUnitPhoto(
  id?: string | number | null,
  label?: string | null,
): string {
  const numericId = Number(id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return UNIT_INTERIOR_PHOTOS[(numericId - 1) % UNIT_INTERIOR_PHOTOS.length];
  }
  const key = `${id ?? ''}-${label ?? ''}`;
  return UNIT_INTERIOR_PHOTOS[stableIndex(key, UNIT_INTERIOR_PHOTOS.length)];
}

export function getCustomPropertyPhoto(
  id?: string | number | null,
  name?: string | null,
): string {
  const store = customPhotoStore.value.properties;
  const numericId = Number(id);
  if (Number.isFinite(numericId) && numericId > 0 && store[`id:${numericId}`]) {
    return store[`id:${numericId}`];
  }
  const normName = normalizeKey(name);
  if (normName && store[`name:${normName}`]) {
    return store[`name:${normName}`];
  }
  return '';
}

export function getCustomUnitPhoto(
  id?: string | number | null,
  label?: string | null,
): string {
  const store = customPhotoStore.value.units;
  const numericId = Number(id);
  if (Number.isFinite(numericId) && numericId > 0 && store[`id:${numericId}`]) {
    return store[`id:${numericId}`];
  }
  const normLabel = normalizeKey(label);
  if (normLabel && store[`label:${normLabel}`]) {
    return store[`label:${normLabel}`];
  }
  return '';
}

export function getPropertyPhoto(
  id?: string | number | null,
  name?: string | null,
): string {
  return getCustomPropertyPhoto(id, name) || getDefaultPropertyPhoto(id, name);
}

export function getUnitPhoto(
  id?: string | number | null,
  label?: string | null,
): string {
  return getCustomUnitPhoto(id, label) || getDefaultUnitPhoto(id, label);
}

export function setCustomPropertyPhoto(
  id: string | number | null | undefined,
  name: string | null | undefined,
  photoDataUrl: string | null | undefined,
): void {
  const next = { ...customPhotoStore.value.properties };
  const numericId = Number(id);
  const normName = normalizeKey(name);
  const cleanUrl = String(photoDataUrl ?? '').trim();

  if (cleanUrl) {
    if (Number.isFinite(numericId) && numericId > 0) {
      next[`id:${numericId}`] = cleanUrl;
    }
    if (normName) {
      next[`name:${normName}`] = cleanUrl;
    }
  } else {
    if (Number.isFinite(numericId) && numericId > 0) {
      delete next[`id:${numericId}`];
    }
    if (normName) {
      delete next[`name:${normName}`];
    }
  }

  customPhotoStore.value = {
    ...customPhotoStore.value,
    properties: next,
  };
  persistCustomPhotoStore();
}

export function setCustomUnitPhoto(
  id: string | number | null | undefined,
  labels: string | Array<string | null | undefined> | null | undefined,
  photoDataUrl: string | null | undefined,
): void {
  const next = { ...customPhotoStore.value.units };
  const numericId = Number(id);
  const labelList = Array.isArray(labels) ? labels : [labels];
  const cleanUrl = String(photoDataUrl ?? '').trim();

  if (cleanUrl) {
    if (Number.isFinite(numericId) && numericId > 0) {
      next[`id:${numericId}`] = cleanUrl;
    }
    for (const item of labelList) {
      const norm = normalizeKey(item);
      if (norm) next[`label:${norm}`] = cleanUrl;
    }
  } else {
    if (Number.isFinite(numericId) && numericId > 0) {
      delete next[`id:${numericId}`];
    }
    for (const item of labelList) {
      const norm = normalizeKey(item);
      if (norm) delete next[`label:${norm}`];
    }
  }

  customPhotoStore.value = {
    ...customPhotoStore.value,
    units: next,
  };
  persistCustomPhotoStore();
}

export function compressUploadedPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Please choose a JPG, PNG, or WebP image file.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Please choose an image smaller than 8 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.onload = () => {
      const rawResult = String(reader.result ?? '');
      const img = new Image();
      img.onerror = () => resolve(rawResult);
      img.onload = () => {
        try {
          const maxWidth = 960;
          const maxHeight = 640;
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawResult);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed || rawResult);
        } catch {
          resolve(rawResult);
        }
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}
