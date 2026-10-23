import type { Property } from '@/types/property';
import { absolutizeApiUrl } from '@/lib/url';

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

function summarizeUnitSizeRange(
  plans: Array<{ sizeValue?: number; unit?: string }>
): string | undefined {
  const values = plans
    .map((plan) => plan.sizeValue)
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!values.length) return undefined;

  const units = Array.from(
    new Set(
      plans
        .map((plan) => (plan.unit || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const unit = units.length === 1 ? units[0] : '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const base = min === max ? `${min.toLocaleString()}` : `${min.toLocaleString()} - ${max.toLocaleString()}`;
  return unit ? `${base} ${unit}` : base;
}

export function formatPriceRange(min?: number, max?: number, currency = 'INR') {
  if (min == null && max == null) return '';
  // Prefer INR short form when in INR
  const isINR = (currency || 'INR').toUpperCase() === 'INR';
  const fmt = (v: number) => (isINR ? formatINRShort(v) : currencyFormatter(v, currency));
  if (min != null && max != null) {
    if (min === max) return fmt(min);
    return `${fmt(min)} - ${fmt(max)}`;
  }
  if (min != null) return `${fmt(min)} onwards`;
  if (max != null) return fmt(max);
  return '';
}

export function formatSizeRange(min?: number, max?: number, unit = 'sqft') {
  if (min == null && max == null) return '';
  if (min != null && max != null) {
    if (min <= 0 && max <= 0) return '';
    if (min === max) return `${min.toLocaleString()} ${unit}`;
    return `${min.toLocaleString()} - ${max.toLocaleString()} ${unit}`;
  }
  if (min != null && min > 0) return `${min.toLocaleString()} ${unit}`;
  if (max != null && max > 0) return `${max.toLocaleString()} ${unit}`;
  return '';
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

function absolutize(input: string | undefined): string {
  return absolutizeApiUrl(input, RAW_API_BASE);
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
    sizeValue: (() => {
      const val = typeof f.size === 'number' ? f.size : (Number.isFinite(Number(f.size)) ? Number(f.size) : undefined);
      return typeof val === 'number' && val > 0 ? val : undefined;
    })(),
    rawSize: f.size,
    unit: f.unit,
    priceValue: (() => {
      const val = typeof f.price === 'number' ? Number(f.price) : (Number.isFinite(Number(f.price)) ? Number(f.price) : undefined);
      return typeof val === 'number' && val > 0 ? val : undefined;
    })(),
    rawPrice: f.price,
    currency: f.currency,
    image: absolutize(f.imageUrl || f.image || ''),
    bedrooms: typeof f.bedrooms === 'number' ? f.bedrooms : undefined,
    bathrooms: typeof f.bathrooms === 'number' ? f.bathrooms : undefined,
  }));

  const bedroomSummary = summarizeCounts(rawFloorPlans.map((fp) => fp.bedrooms)) || (typeof p.bedrooms === 'number' ? String(p.bedrooms) : undefined);
  const bathroomSummary = summarizeCounts(rawFloorPlans.map((fp) => fp.bathrooms)) || (typeof p.bathrooms === 'number' ? String(p.bathrooms) : undefined);
  const developmentSize = formatSizeRange(sizeMin, sizeMax, sizeUnit);
  const explicitUnitSizeRange = typeof p.unitSizeRange === 'string' && p.unitSizeRange.trim() ? p.unitSizeRange.trim() : undefined;
  const unitSizeRange = summarizeUnitSizeRange(rawFloorPlans);

  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    location: p.addressLine || p.area || p.city || '',
    city: p.city || '',
    area: p.area || '',
    builder: p.builder?.name || p.builderName || 'Unknown',
    builderLogoUrl: absolutize(p.builder?.logoUrl || p.builderLogoUrl || ''),
    builderDescription: typeof p.builder?.description === 'string' && p.builder.description.trim() ? p.builder.description.trim() : undefined,
    builderWebsite: typeof p.builder?.website === 'string' && p.builder.website.trim() ? p.builder.website.trim() : undefined,
    builderPhone: typeof p.builder?.phone === 'string' && p.builder.phone.trim() ? p.builder.phone.trim() : undefined,
    builderEmail: typeof p.builder?.email === 'string' && p.builder.email.trim() ? p.builder.email.trim() : undefined,
    builderExperienceYears: typeof p.builder?.experienceYears === 'number' ? p.builder.experienceYears : undefined,
    builderRating: p.builder?.rating != null && !Number.isNaN(Number(p.builder.rating)) ? Number(p.builder.rating) : undefined,
    propertyType: p.propertyType || 'Apartment',
    reraId: p.reraId || undefined,
    priceRange: formatPriceRange(priceMin, priceMax, currency),
    developmentSize,
    unitSizeRange: explicitUnitSizeRange,
    size: explicitUnitSizeRange || unitSizeRange || developmentSize || '',
    totalUnits: (() => {
      const source = typeof p.totalUnits === 'number' ? p.totalUnits : p.parkingSpaces;
      return typeof source === 'number' && source > 0 ? source : undefined;
    })(),
    towersBlocks: typeof p.towersBlocks === 'string' && p.towersBlocks.trim() ? p.towersBlocks.trim() : undefined,
    unitVariants: typeof p.unitVariants === 'string' && p.unitVariants.trim() ? p.unitVariants.trim() : undefined,
    possessionTime: typeof p.possessionTime === 'string' && p.possessionTime.trim() ? p.possessionTime.trim() : undefined,
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
    videoUrl: p.videoUrl || undefined,
    virtualTourUrl: p.virtualTourUrl || undefined,
    coordinates: (p.lat && p.lng) ? { lat: p.lat, lng: p.lng } : undefined,
    floorPlans: rawFloorPlans.map((f) => ({
      type: f.type,
      size: f.sizeValue != null && f.unit ? `${f.sizeValue} ${f.unit}` : f.sizeValue != null ? String(f.sizeValue) : (f.rawSize ? String(f.rawSize) : ''),
      price: f.priceValue != null ? String(f.priceValue) : '',
      priceValue: f.priceValue != null ? f.priceValue : undefined,
      formattedPrice: f.priceValue != null ? formatINRShort(f.priceValue) : undefined,
      image: f.image,
      bedrooms: f.bedrooms,
      bathrooms: f.bathrooms,
    })),
  };
}
