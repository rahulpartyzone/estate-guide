import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyCreateDto, PropertyListQueryDto, PropertyUpdateDto } from './dtos';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  // Temporary helper to bypass TS errors until Prisma client is generated
  private get db(): any {
    return this.prisma as any;
  }

  async list(query?: PropertyListQueryDto) {
    const q = query || ({} as PropertyListQueryDto);
    const page = Math.max(1, q.page || 1);
    const pageSize = Math.min(50, Math.max(1, q.pageSize || 12));

    // Build where clause
    const where: any = { published: true };
    if (q.city) where.city = q.city;
    if (q.area) where.area = q.area;
    if (q.builderId) where.builderId = q.builderId;
    if (q.propertyType) where.propertyType = q.propertyType as any;
    if (q.status) where.status = q.status as any;
    if (typeof q.isHot === 'boolean') where.isHotProject = q.isHot;
    if (typeof q.bedrooms === 'number') where.bedrooms = { gte: q.bedrooms };
    if (typeof q.priceMin === 'number') where.priceMax = { gte: q.priceMin.toString() };
    if (typeof q.priceMax === 'number') where.priceMin = { lte: q.priceMax.toString() };
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
        { city: { contains: q.q, mode: 'insensitive' } },
        { area: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    // Basic bounding-box radius filter if lat/lng provided
    let useDistanceSort = q.sort === 'distance' && typeof q.lat === 'number' && typeof q.lng === 'number';
    if (typeof q.lat === 'number' && typeof q.lng === 'number' && typeof q.radiusKm === 'number') {
      const radiusKm = q.radiusKm;
      const lat = q.lat;
      const lng = q.lng;
      const latDelta = radiusKm / 110.574; // ~km per degree lat
      const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180) || 1);
      where.AND = [
        { lat: { gte: lat - latDelta } },
        { lat: { lte: lat + latDelta } },
        { lng: { gte: lng - lngDelta } },
        { lng: { lte: lng + lngDelta } },
      ];
      // Ensure non-null coords
      where.lat = { not: null, gte: lat - latDelta, lte: lat + latDelta };
      where.lng = { not: null, gte: lng - lngDelta, lte: lng + lngDelta };
    }

    // Determine orderBy
    let orderBy: any = { createdAt: 'desc' };
    if (q.sort === 'newest') orderBy = { createdAt: q.order === 'asc' ? 'asc' : 'desc' };
    else if (q.sort === 'price') orderBy = { priceMin: q.order === 'desc' ? 'desc' : 'asc' };
    else if (q.sort === 'name') orderBy = { name: q.order === 'desc' ? 'desc' : 'asc' };
    else if (q.sort === 'distance') {
      // We'll sort in memory after fetching
      useDistanceSort = typeof q.lat === 'number' && typeof q.lng === 'number';
    }

    // Count total
  const total = await this.db.property.count({ where });

    // Fetch page
    if (useDistanceSort) {
      // Fetch a larger slice inside bounding box, then sort by distance and paginate
      const prefetch = Math.min(pageSize * 5, 200);
      const candidates = await this.db.property.findMany({
        where,
        include: { builder: true, images: true, amenities: { include: { amenity: true } }, floorPlans: true },
        take: prefetch,
        orderBy: { createdAt: 'desc' },
      });
      const withDistance = (candidates as any[])
        .map((p: any) => ({
          p,
          d:
            typeof q.lat === 'number' && typeof q.lng === 'number' && typeof p.lat === 'number' && typeof p.lng === 'number'
              ? haversineKm(q.lat!, q.lng!, p.lat!, p.lng!)
              : Number.MAX_SAFE_INTEGER,
        }))
        .sort((a: any, b: any) => (q.order === 'desc' ? b.d - a.d : a.d - b.d))
        .map((x: any) => x.p);
      const start = (page - 1) * pageSize;
      const data = withDistance.slice(start, start + pageSize);
      return { data, meta: buildMeta(total, page, pageSize) };
    } else {
      const data = await this.db.property.findMany({
        where,
        include: { builder: true, images: true, amenities: { include: { amenity: true } }, floorPlans: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return { data, meta: buildMeta(total, page, pageSize) };
    }
  }

  async get(id: string) {
    const item = await this.db.property.findUnique({
      where: { id },
      include: { builder: true, images: true, amenities: { include: { amenity: true } }, floorPlans: true },
    });
    if (!item) throw new NotFoundException('Property not found');
    return item;
  }

  async create(dto: PropertyCreateDto) {
    // Normalize & de-duplicate amenities (case-insensitive trim)
    const amenityNames = Array.from(
      new Set(
        (dto.amenities || [])
          .map((a) => (a || '').trim())
          .filter(Boolean)
          .map((a) => a.replace(/\s+/g, ' '))
          .map((a) => a)
      ),
    );
    const planBedrooms = (dto.floorPlans || [])
      .map((f) => (typeof f.bedrooms === 'number' ? f.bedrooms : undefined))
      .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
    const planBathrooms = (dto.floorPlans || [])
      .map((f) => (typeof f.bathrooms === 'number' ? f.bathrooms : undefined))
      .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
    const derivedBedrooms = planBedrooms.length ? Math.max(...planBedrooms) : dto.bedrooms ?? null;
    const derivedBathrooms = planBathrooms.length ? Math.max(...planBathrooms) : dto.bathrooms ?? null;

    const res = await this.db.property.create({
      data: {
        builderId: dto.builderId,
        name: dto.name,
        slug: dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
        addressLine: dto.addressLine,
        city: dto.city,
        area: dto.area,
        propertyType: dto.propertyType as any,
        status: dto.status as any,
        isHotProject: !!dto.isHotProject,
  priceMin: dto.price?.min != null ? dto.price.min.toString() : null,
  priceMax: dto.price?.max != null ? dto.price.max.toString() : null,
        currency: dto.price?.currency || 'INR',
        sizeMin: dto.size?.min,
        sizeMax: dto.size?.max,
        sizeUnit: dto.size?.unit || 'sqft',
  bedrooms: derivedBedrooms,
  bathrooms: derivedBathrooms,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
        lat: dto.coordinates?.lat,
        lng: dto.coordinates?.lng,
        mainImageUrl: dto.mainImageUrl,
  brochureUrl: dto.brochureUrl || null,
        published: dto.published ?? true,
        images: { create: dto.images?.map((i) => ({ url: i.url, altText: i.alt, sortOrder: i.sortOrder })) || [] },
        amenities: { create: amenityNames.map((name) => ({ amenity: { connectOrCreate: { where: { name }, create: { name } } } })) },
        floorPlans: {
          create:
            dto.floorPlans?.map((f) => ({
              unitType: f.unitType,
              size: f.size,
              unit: f.unit,
              price: f.price.toString(),
              currency: f.currency,
              imageUrl: f.imageUrl,
              bedrooms: typeof f.bedrooms === 'number' ? f.bedrooms : null,
              bathrooms: typeof f.bathrooms === 'number' ? f.bathrooms : null,
            })) || [],
        },
      },
      include: { builder: true, images: true, amenities: { include: { amenity: true } }, floorPlans: true },
    });
    return res;
  }

  async update(id: string, dto: PropertyUpdateDto) {
    // Normalize & de-duplicate amenities
    const amenityNames = Array.from(
      new Set(
        (dto.amenities || [])
          .map((a) => (a || '').trim())
          .filter(Boolean)
          .map((a) => a.replace(/\s+/g, ' '))
      ),
    );

    const planBedrooms = (dto.floorPlans || [])
      .map((f) => (typeof f.bedrooms === 'number' ? f.bedrooms : undefined))
      .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
    const planBathrooms = (dto.floorPlans || [])
      .map((f) => (typeof f.bathrooms === 'number' ? f.bathrooms : undefined))
      .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
    const derivedBedrooms = planBedrooms.length ? Math.max(...planBedrooms) : dto.bedrooms ?? null;
    const derivedBathrooms = planBathrooms.length ? Math.max(...planBathrooms) : dto.bathrooms ?? null;

    // Wrap in a transaction for consistency
    await this.db.$transaction(async (tx: any) => {
      // Remove existing amenity joins
      await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });

      await tx.property.update({
        where: { id },
        data: {
          builderId: dto.builderId,
          name: dto.name,
          slug: dto.slug || undefined,
          description: dto.description,
          addressLine: dto.addressLine,
          city: dto.city,
          area: dto.area,
          propertyType: dto.propertyType as any,
          status: dto.status as any,
          isHotProject: dto.isHotProject,
          // Explicitly null-out when not provided so min-only / max-only updates take effect
          priceMin: dto.price?.min != null ? dto.price.min.toString() : null,
          priceMax: dto.price?.max != null ? dto.price.max.toString() : null,
          currency: dto.price?.currency || 'INR',
          sizeMin: dto.size?.min,
          sizeMax: dto.size?.max,
          sizeUnit: dto.size?.unit || 'sqft',
          bedrooms: derivedBedrooms,
          bathrooms: derivedBathrooms,
          completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
          lat: dto.coordinates?.lat,
          lng: dto.coordinates?.lng,
          mainImageUrl: dto.mainImageUrl,
          brochureUrl: dto.brochureUrl ?? undefined,
          published: dto.published ?? undefined,
          images: { deleteMany: { propertyId: id }, create: dto.images?.map((i) => ({ url: i.url, altText: i.alt, sortOrder: i.sortOrder })) || [] },
          floorPlans: {
            deleteMany: { propertyId: id },
            create:
              dto.floorPlans?.map((f) => ({
                unitType: f.unitType,
                size: f.size,
                unit: f.unit,
                price: f.price.toString(),
                currency: f.currency,
                imageUrl: f.imageUrl,
                bedrooms: typeof f.bedrooms === 'number' ? f.bedrooms : null,
                bathrooms: typeof f.bathrooms === 'number' ? f.bathrooms : null,
              })) || [],
          },
        },
      });

      // Upsert amenities separately & attach
      for (const name of amenityNames) {
        const amenity = await tx.amenity.upsert({ where: { name }, update: {}, create: { name } });
        await tx.propertyAmenity.create({ data: { propertyId: id, amenityId: amenity.id } });
      }
    });

    return this.get(id);
  }

  async remove(id: string) {
    await this.db.property.delete({ where: { id } });
  }

  async setHot(id: string, isHotProject: boolean) {
    const res = await this.db.property.update({ where: { id }, data: { isHotProject } });
    return res;
  }

  async hot(limit = 8) {
    return this.db.property.findMany({ where: { isHotProject: true }, take: limit, orderBy: { createdAt: 'desc' } });
  }
}

function buildMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
