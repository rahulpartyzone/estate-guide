import type { Property } from '@/types/property';

const currencyFormatter = (value: number, currency: string) => {
  if (!value && value !== 0) return '';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
};

export function formatINRShort(value?: number): string {
  if (value == null) return '';
  const abs = Math.abs(value);
  const fmt = (n: number) => {
    const s = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
    return s.replace(/\.0$/, '');
  };
  // 1 Cr = 10,000,000
  if (abs >= 1e7) {
    return `₹${fmt(value / 1e7)} Cr`;
  }
  // 1 Lakh = 100,000
  if (abs >= 1e5) {
    return `₹${fmt(value / 1e5)} L`;
  }
  // Fallback to INR locale currency for smaller numbers
  return currencyFormatter(value, 'INR');
}

function summarizeCounts(values: Array<number | undefined>): string | undefined {
  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v)).sort((a, b) => a - b);
  if (!nums.length) return undefined;
  const unique = Array.from(new Set(nums));
  if (unique.length === 1) return String(unique[0]);
  const first = unique[0];
  const last = unique[unique.length - 1];
  return `${first}-${last}`;
}

export function formatPriceRange(min?: number, max?: number, currency = 'INR') {
  if (min == null && max == null) return 'Price on request';
  // Prefer INR short form when in INR
  const isINR = (currency || 'INR').toUpperCase() === 'INR';
  const fmt = (v: number) => (isINR ? formatINRShort(v) : currencyFormatter(v, currency));
  if (min != null && max != null) {
    if (min === max) return fmt(min);
    return `${fmt(min)} - ${fmt(max)}`;
  }
  if (min != null) return `${fmt(min)} onwards`;
  if (max != null) return fmt(max);
  return 'Price on request';
}

export function formatSizeRange(min?: number, max?: number, unit = 'sqft') {
  if (min == null && max == null) return 'Size N/A';
  if (min != null && max != null) {
    if (min === max) return `${min.toLocaleString()} ${unit}`;
    return `${min.toLocaleString()} - ${max.toLocaleString()} ${unit}`;
  }
  if (min != null) return `${min.toLocaleString()} ${unit}`;
  if (max != null) return `${max.toLocaleString()} ${unit}`;
  return 'Size N/A';
}

export function normalizeAmenities(raw: any): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from(new Set(
    arr.map((a: any) => a?.amenity?.name || a?.name || a)
       .filter((x: any) => typeof x === 'string')
       .map((s: string) => s.trim())
       .filter(Boolean)
       .map((s: string) => s.replace(/\s+/g, ' '))
  ));
}

const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
let API_ORIGIN: string;
try {
  API_ORIGIN = new URL(RAW_API_BASE).origin;
} catch {
  API_ORIGIN = 'http://localhost:8080';
}

function absolutize(input: string | undefined): string {
  if (!input) return '';
  let url = input.trim();
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  // Normalize missing leading slash for API paths
  if (url.startsWith('api/')) url = '/' + url; // -> /api/...
  // If it's an API path we make it absolute to backend origin
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  // Leave other relative (e.g. /placeholder.svg or /assets/img.png) to be served by front-end dev server / static host
  return url;
}

export function mapBackendProperty(p: any): Property {
  const priceMin = p.priceMin ? Number(p.priceMin) : (p.price?.min ?? undefined);
  const priceMax = p.priceMax ? Number(p.priceMax) : (p.price?.max ?? undefined);
  const currency = p.currency || p.price?.currency || 'INR';
  const sizeMin = p.sizeMin ?? p.size?.min ?? undefined;
  const sizeMax = p.sizeMax ?? p.size?.max ?? undefined;
  const sizeUnit = p.sizeUnit || p.size?.unit || 'sqft';
  const amenities = normalizeAmenities(p.amenities);
  const rawFloorPlans = (p.floorPlans || []).map((f: any) => ({
    type: f.unitType,
    sizeValue: typeof f.size === 'number' ? f.size : (Number.isFinite(Number(f.size)) ? Number(f.size) : undefined),
    rawSize: f.size,
    unit: f.unit,
    priceValue: typeof f.price === 'number' ? Number(f.price) : (Number.isFinite(Number(f.price)) ? Number(f.price) : undefined),
    rawPrice: f.price,
    currency: f.currency,
    image: absolutize(f.imageUrl || f.image || ''),
    bedrooms: typeof f.bedrooms === 'number' ? f.bedrooms : undefined,
    bathrooms: typeof f.bathrooms === 'number' ? f.bathrooms : undefined,
  }));

  const bedroomSummary = summarizeCounts(rawFloorPlans.map((fp) => fp.bedrooms)) || (typeof p.bedrooms === 'number' ? String(p.bedrooms) : undefined);
  const bathroomSummary = summarizeCounts(rawFloorPlans.map((fp) => fp.bathrooms)) || (typeof p.bathrooms === 'number' ? String(p.bathrooms) : undefined);

  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    location: p.addressLine || p.area || p.city || '',
    city: p.city || '',
    area: p.area || '',
    builder: p.builder?.name || p.builderName || 'Unknown',
    builderLogoUrl: absolutize(p.builder?.logoUrl || p.builderLogoUrl || ''),
    propertyType: p.propertyType || 'Apartment',
    priceRange: formatPriceRange(priceMin, priceMax, currency),
    size: formatSizeRange(sizeMin, sizeMax, sizeUnit),
    priceMin,
    priceMax,
    currency,
    sizeMin,
    sizeMax,
    sizeUnit,
    bedrooms: p.bedrooms != null ? Number(p.bedrooms) : (rawFloorPlans[0]?.bedrooms ?? undefined),
    bathrooms: p.bathrooms != null ? Number(p.bathrooms) : (rawFloorPlans[0]?.bathrooms ?? undefined),
    bedroomSummary,
    bathroomSummary,
    images: (p.images || []).map((i: any) => absolutize(i.url || i)).filter(Boolean),
  mainImage: absolutize(p.mainImageUrl || p.mainImage || (p.images && p.images[0]?.url) || '/placeholder.svg'),
    isHotProject: !!p.isHotProject,
    amenities,
    completionDate: p.status === 'ReadyToMove' ? 'Ready to Move' : (p.completionDate ? new Date(p.completionDate).toISOString().substring(0,10) : undefined),
    status: p.status || 'UnderConstruction',
  brochureUrl: p.brochureUrl || undefined,
    coordinates: (p.lat && p.lng) ? { lat: p.lat, lng: p.lng } : undefined,
    floorPlans: rawFloorPlans.map((f) => ({
      type: f.type,
      size: f.sizeValue != null && f.unit ? `${f.sizeValue} ${f.unit}` : f.sizeValue != null ? String(f.sizeValue) : (f.rawSize ? String(f.rawSize) : ''),
      price: f.priceValue != null ? String(f.priceValue) : (f.rawPrice ? String(f.rawPrice) : ''),
      priceValue: f.priceValue != null ? f.priceValue : undefined,
      formattedPrice: f.priceValue != null ? formatINRShort(f.priceValue) : undefined,
      image: f.image,
      bedrooms: f.bedrooms,
      bathrooms: f.bathrooms,
    })),
  };
}
