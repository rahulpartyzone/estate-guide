import { PropertyTypeEnum, ProjectStatusEnum } from '@/constants/enums';

export interface Property {
  id: string;
  name: string;
  description: string;
  location: string; // derived display location (addressLine or area, city)
  city: string;
  area: string;
  builder: string;
  builderLogoUrl?: string;
  propertyType: PropertyTypeEnum;
  // Display strings
  priceRange: string;
  size: string;
  // Raw numeric data (optional from API)
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  sizeMin?: number;
  sizeMax?: number;
  sizeUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  bedroomSummary?: string;
  bathroomSummary?: string;
  images: string[];
  mainImage: string;
  isHotProject: boolean;
  amenities: string[];
  completionDate?: string;
  status: ProjectStatusEnum;
  brochureUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  floorPlans?: {
    type: string;
    size: string;
    price: string;
    priceValue?: number;
    formattedPrice?: string;
    image: string;
    bedrooms?: number;
    bathrooms?: number;
  }[];
}

export interface PropertyFilters {
  location?: string;
  city?: string;
  area?: string;
  builder?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  sortBy?: 'price' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
}