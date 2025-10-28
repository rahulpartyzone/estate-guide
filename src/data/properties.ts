import { Property } from "@/types/property";
import villa1 from "@/assets/villa-1.jpg";
import apartment1 from "@/assets/apartment-1.jpg";

export const sampleProperties: Property[] = [
  {
    id: "1",
    name: "Skyline Residences",
    description: "Luxury apartments with panoramic city views and premium amenities in the heart of downtown.",
    location: "Downtown",
    city: "Mumbai",
    area: "Bandra West",
    builder: "Prestige Group",
    propertyType: "Apartment",
    priceRange: "₹2.5 - 4.5 Cr",
    size: "1200 - 1800 sq ft",
    bedrooms: 3,
    bathrooms: 3,
    images: [apartment1],
    mainImage: apartment1,
    isHotProject: true,
    amenities: ["Swimming Pool", "Gym", "Club House", "Garden", "Security", "Parking"],
    completionDate: "Dec 2024",
  status: "UnderConstruction",
    coordinates: { lat: 19.0760, lng: 72.8777 }
  },
  {
    id: "2",
    name: "Royal Villas",
    description: "Spacious independent villas with private gardens and modern architecture in a gated community.",
    location: "Suburb",
    city: "Bangalore",
    area: "Whitefield",
    builder: "Sobha Developers",
    propertyType: "Villa",
    priceRange: "₹3.2 - 5.8 Cr",
    size: "2500 - 3200 sq ft",
    bedrooms: 4,
    bathrooms: 4,
    images: [villa1],
    mainImage: villa1,
    isHotProject: true,
    amenities: ["Private Garden", "Swimming Pool", "Clubhouse", "Tennis Court", "Security", "Parking"],
    completionDate: "Mar 2025",
  status: "UnderConstruction",
    coordinates: { lat: 12.9716, lng: 77.7946 }
  },
  {
    id: "3",
    name: "Green Valley Apartments",
    description: "Eco-friendly apartments surrounded by lush greenery with modern sustainable features.",
    location: "Uptown",
    city: "Pune",
    area: "Koregaon Park",
    builder: "Godrej Properties",
    propertyType: "Apartment",
    priceRange: "₹1.8 - 3.2 Cr",
    size: "1000 - 1600 sq ft",
    bedrooms: 2,
    bathrooms: 2,
    images: [apartment1],
    mainImage: apartment1,
    isHotProject: false,
    amenities: ["Rooftop Garden", "Rainwater Harvesting", "Solar Panels", "Gym", "Children's Play Area"],
    completionDate: "Ready to Move",
  status: "ReadyToMove",
    coordinates: { lat: 18.5204, lng: 73.8567 }
  },
  {
    id: "4",
    name: "Ocean View Towers",
    description: "Premium high-rise apartments with breathtaking ocean views and luxury amenities.",
    location: "Beachfront",
    city: "Chennai",
    area: "Marina Beach",
    builder: "DLF Limited",
  propertyType: "LuxuryHomes",
    priceRange: "₹4.5 - 8.5 Cr",
    size: "1800 - 2800 sq ft",
    bedrooms: 4,
    bathrooms: 4,
    images: [apartment1],
    mainImage: apartment1,
    isHotProject: true,
    amenities: ["Ocean View", "Infinity Pool", "Private Beach Access", "Spa", "Concierge"],
    completionDate: "Jun 2024",
  status: "UnderConstruction",
    coordinates: { lat: 13.0827, lng: 80.2707 }
  },
  {
    id: "5",
    name: "Tech Park Residences",
    description: "Modern apartments designed for IT professionals with co-working spaces and smart home features.",
    location: "IT Corridor",
    city: "Hyderabad",
    area: "HITECH City",
    builder: "Brigade Group",
  propertyType: "NewLaunch",
    priceRange: "₹1.5 - 2.8 Cr",
    size: "900 - 1400 sq ft",
    bedrooms: 2,
    bathrooms: 2,
    images: [apartment1],
    mainImage: apartment1,
    isHotProject: true,
    amenities: ["Co-working Space", "Smart Home Features", "High-Speed Internet", "Cafe", "Gym"],
    completionDate: "Sep 2024",
  status: "NewLaunch",
    coordinates: { lat: 17.4065, lng: 78.4772 }
  }
];

export const getHotProjects = (): Property[] => {
  return sampleProperties.filter(property => property.isHotProject);
};

export const getPropertyById = (id: string): Property | undefined => {
  return sampleProperties.find(property => property.id === id);
};

export const filterProperties = (properties: Property[], filters: any): Property[] => {
  return properties.filter(property => {
    if (filters.city && property.city !== filters.city) return false;
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
    if (filters.builder && property.builder !== filters.builder) return false;
    return true;
  });
};