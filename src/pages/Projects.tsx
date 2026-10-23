import Header from "@/components/Header";
import { usePageTitle } from "@/lib/pageTitle";
import PropertyCard from "@/components/PropertyCard";
import LeadPreferenceForm from "@/components/LeadPreferenceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, SlidersHorizontal, Building2, MapPin, BedDouble, Home } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Property } from "@/types/property";
import { mapBackendProperty } from '@/lib/propertyMapper';
import { PropertyTypeLabels, ProjectStatusLabels } from '@/constants/enums';
import { absolutizeApiUrl } from "@/lib/url";
import PageState from "@/components/public/PageState";
import heroBuildingImage from "@/assets/hero-building.jpg";

const Projects = () => {
  usePageTitle("Residential projects");
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
  const absolutize = (value?: string) => absolutizeApiUrl(value, RAW_API_BASE);

  const [projectsHeaderImageUrl, setProjectsHeaderImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBuilder, setSelectedBuilder] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedBedrooms, setSelectedBedrooms] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [builderNames, setBuilderNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data }, buildersApi] = await Promise.all([
          api.listProperties({ pageSize: 100 }).catch(() => ({ data: [] })),
          api.listBuilders().catch(() => []),
        ]);
        if (cancelled) return;
        // Map backend property shape -> frontend Property interface (basic mapping). Adjust if schema differs.
        const mapped: Property[] = (data || []).map(mapBackendProperty);
        if (mapped.length) setProperties(mapped);
        const builderList = (buildersApi || []).map((b: any) => b.name).filter(Boolean).sort();
        if (builderList.length) setBuilderNames(builderList);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load properties');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await api.getSiteProfile();
        if (!cancelled) {
          setProjectsHeaderImageUrl(absolutize(profile?.projectsHeroImageUrl || profile?.landingHeroImageUrl || ""));
        }
      } catch {
        if (!cancelled) setProjectsHeaderImageUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => [...new Set(properties.map(p => p.city))], [properties]);
  const propertyTypes = useMemo(
    () => [...new Set(properties.map(p => p.propertyType))].filter((type) => type !== 'NewLaunch' && type !== 'Resale'),
    [properties]
  );
  const builders = useMemo(() => builderNames.length ? builderNames : [...new Set(properties.map(p => p.builder))], [builderNames, properties]);
  const maxPrice = useMemo(() => {
    const values = properties
      .flatMap((property) => [property.priceMin, property.priceMax])
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value) && value > 0);
    return values.length ? Math.max(...values) : 1000000000;
  }, [properties]);

  useEffect(() => {
    if (maxPrice <= 0) return;
    if (priceRange[1] === 0) setPriceRange([0, maxPrice]);
  }, [maxPrice, priceRange]);

  const formatPriceCap = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(0)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(0)} L`;
    return `${Math.round(value).toLocaleString()}`;
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = selectedCity === "all" || property.city === selectedCity;
    const matchesType = selectedType === "all" || property.propertyType === selectedType;
    const matchesBuilder = selectedBuilder === "all" || property.builder === selectedBuilder;
    const matchesStatus = selectedStatus === "all" || property.status === selectedStatus;
    const matchesBedrooms = (() => {
      if (selectedBedrooms === "all") return true;
      const value = property.bedrooms ?? 0;
      if (selectedBedrooms === "4+") return value >= 4;
      return value === Number(selectedBedrooms);
    })();
    const matchesPrice = (() => {
      const hasCustomPrice = priceRange[1] > 0 && (priceRange[0] > 0 || priceRange[1] < maxPrice);
      const pMin = property.priceMin ?? property.priceMax;
      const pMax = property.priceMax ?? property.priceMin;
      if (pMin == null && pMax == null) return !hasCustomPrice;
      const low = pMin ?? pMax ?? 0;
      const high = pMax ?? pMin ?? low;
      return high >= priceRange[0] && low <= priceRange[1];
    })();

    return matchesSearch && matchesCity && matchesType && matchesBuilder && matchesStatus && matchesBedrooms && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === "newest") {
      return b.id.localeCompare(a.id); // Simple sorting by ID for demo
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCity("all");
    setSelectedType("all");
    setSelectedBuilder("all");
    setSelectedStatus("all");
    setSelectedBedrooms("all");
    setPriceRange([0, maxPrice]);
    setSortBy("newest");
  };

  const activeFiltersCount = [selectedCity, selectedType, selectedBuilder, selectedStatus, selectedBedrooms].filter(f => f !== "all").length + ((priceRange[0] > 0 || priceRange[1] < maxPrice) ? 1 : 0);
  const hasCustomHeroImage = Boolean(projectsHeaderImageUrl);
  const heroBackgroundUrl = projectsHeaderImageUrl || heroBuildingImage;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative border-b overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center md:bg-fixed scale-105" style={{ backgroundImage: `url(${heroBackgroundUrl})` }} />
        <div className={`absolute inset-0 ${hasCustomHeroImage ? 'bg-black/50' : 'bg-black/55'}`} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-12 md:pt-16 pb-12 md:pb-14">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">Browse Properties</h1>
            <p className="text-xl max-w-2xl mx-auto text-white/90">
              Discover your perfect home from our collection of premium properties
            </p>
          </div>

          <div className="rounded-2xl p-4 md:p-6 space-y-4 border border-white/30 bg-background/25 backdrop-blur-md shadow-2xl">
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
              <div className="xl:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by project name, keywords, etc."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-background/95"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-12 bg-background/95">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Project Type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Project Types</SelectItem>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{PropertyTypeLabels[type as keyof typeof PropertyTypeLabels] || type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-12 bg-background/95">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Location" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-12 bg-background/95">
                  <SelectValue placeholder="Construction Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(ProjectStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBedrooms} onValueChange={setSelectedBedrooms}>
                <SelectTrigger className="h-12 bg-background/95">
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Bedrooms" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bedrooms</SelectItem>
                  <SelectItem value="1">1 BHK</SelectItem>
                  <SelectItem value="2">2 BHK</SelectItem>
                  <SelectItem value="3">3 BHK</SelectItem>
                  <SelectItem value="4+">4+ BHK</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBuilder} onValueChange={setSelectedBuilder}>
                <SelectTrigger className="h-12 bg-background/95">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Builder" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  {builders.map(builder => (
                    <SelectItem key={builder} value={builder}>{builder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between text-sm mb-2 text-white">
                  <span>Price Range</span>
                  <span>{formatPriceCap(priceRange[0])} — {formatPriceCap(priceRange[1])}</span>
                </div>
                <Slider
                  value={priceRange}
                  min={0}
                  max={maxPrice}
                  step={Math.max(100000, Math.floor(maxPrice / 100))}
                  onValueChange={(value) => {
                    const [start, end] = value as number[];
                    setPriceRange([start, end]);
                  }}
                />
              </div>
              <Button variant="outline" className="h-12 text-base font-semibold">
                {filteredProperties.length} PROJECTS FOUND
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12 bg-background/95">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="h-12 flex items-center gap-2 bg-background/95"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Reset Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Count */}
          {!loading && !error && (
            <div className="mb-8 flex flex-col gap-2">
              <p className="text-muted-foreground">
                Showing {filteredProperties.length} of {properties.length} properties
              </p>
            </div>
          )}

          {/* Properties Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-xl border bg-card p-4 space-y-4">
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <PageState
              icon={<Filter className="h-14 w-14" />}
              title="Couldn’t load properties"
              description={error}
              action={<Button onClick={() => window.location.reload()} variant="outline">Retry</Button>}
            />
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <PageState
              icon={<Filter className="h-16 w-16" />}
              title="No Properties Found"
              description="Try adjusting your filters or search query to find more properties."
              action={<Button onClick={clearFilters} variant="outline">Clear All Filters</Button>}
            />
          )}
        </div>
      </section>

      <LeadPreferenceForm sourcePage="projects" className="pt-2 pb-12" />
    </div>
  );
};

export default Projects;