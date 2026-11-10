/**
 * Curated high-resolution online photos (Unsplash architectural & interior photography)
 * for apartments/properties and individual rental units.
 * Selection is deterministic based on ID and name so every property and unit
 * consistently displays its own realistic photo across all portals.
 */

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

export function getPropertyPhoto(
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

export function getUnitPhoto(
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
