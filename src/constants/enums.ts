// Shared enum/constant mappings to keep frontend aligned with backend enums
// Backend enums (server/src/properties/enums.ts)
export const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Plot',
  'LuxuryHomes',
  'NewLaunch',
  'Resale',
] as const;
export type PropertyTypeEnum = typeof PROPERTY_TYPES[number];

export const PROJECT_STATUS = [
  'UnderConstruction',
  'ReadyToMove',
  'Upcoming',
  'NewLaunch',
] as const;
export type ProjectStatusEnum = typeof PROJECT_STATUS[number];

// UI label mapping where we want spaces for display
export const PropertyTypeLabels: Record<PropertyTypeEnum,string> = {
  Apartment: 'Apartment',
  Villa: 'Villa',
  Plot: 'Plot',
  LuxuryHomes: 'Luxury Homes',
  NewLaunch: 'New Launch',
  Resale: 'Resale',
};

export const ProjectStatusLabels: Record<ProjectStatusEnum,string> = {
  UnderConstruction: 'Under Construction',
  ReadyToMove: 'Ready to Move',
  Upcoming: 'Upcoming',
  NewLaunch: 'New Launch',
};
