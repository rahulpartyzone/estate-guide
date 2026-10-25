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
import { Search, Filter, SlidersHorizontal, Building2, MapPin, BedDouble, Home, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchSuggest, { type Suggestion } from "@/components/SearchSuggest";
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
  // Links from the home page (search, city tiles, type chips) arrive as ?q=, ?city=, ?type=, ?status=, ?builder=
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [selectedCity, setSelectedCity] = useState(() => searchParams.get("city") || "all");
  const [selectedType, setSelectedType] = useState(() => searchParams.get("type") || "all");
  const [selectedBuilder, setSelectedBuilder] = useState(() => searchParams.get("builder") || "all");
  const [selectedStatus, setSelectedStatus] = useState(() => searchParams.get("status") || "all");
  const [selectedBedrooms, setSelectedBedrooms] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();

  /** Picking a suggestion sets the matching filter rather than leaving the text in the search box. */
  const applySuggestion = (s: Suggestion) => {
    if (s.kind === "project") return navigate(`/project/${s.id}`);
    if (s.kind === "city") {
      setSelectedCity(s.value);
      setSearchQuery("");
    } else if (s.kind === "builder") {
      setSelectedBuilder(s.value);
      setSearchQuery("");
      // Don't keep a city filter that would hide all of this builder's projects
      if (selectedCity !== "all" && !properties.some((p) => p.builder === s.value && p.city === selectedCity)) setSelectedCity("all");
    } else {
      setSearchQuery(s.value);
      if (s.city) setSelectedCity(s.city);
    }
  };

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
                         property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (property.builder || '').toLowerCase().includes(searchQuery.toLowerCase());
    
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
  const priceIsCustom = priceRange[1] > 0 && (priceRange[0] > 0 || priceRange[1] < maxPrice);
  const typeLabel = (t: string) => PropertyTypeLabels[t as keyof typeof PropertyTypeLabels] || t;
  const statusLabel = (s: string) => (ProjectStatusLabels as Record<string, string>)[s] || s;
  const activeChips = [
    searchQuery.trim() && { key: 'q', label: `"${searchQuery.trim()}"`, clear: () => setSearchQuery('') },
    selectedType !== 'all' && { key: 'type', label: typeLabel(selectedType), clear: () => setSelectedType('all') },
    selectedCity !== 'all' && { key: 'city', label: selectedCity, clear: () => setSelectedCity('all') },
    selectedStatus !== 'all' && { key: 'status', label: statusLabel(selectedStatus), clear: () => setSelectedStatus('all') },
    selectedBedrooms !== 'all' && { key: 'bed', label: `${selectedBedrooms} BHK`, clear: () => setSelectedBedrooms('all') },
    selectedBuilder !== 'all' && { key: 'builder', label: selectedBuilder, clear: () => setSelectedBuilder('all') },
    priceIsCustom && { key: 'price', label: `${formatPriceCap(priceRange[0])} – ${formatPriceCap(priceRange[1])}`, clear: () => setPriceRange([0, maxPrice]) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const selectClass = "h-12 bg-background/95";
  const filterSelects = (
    <>
      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className={selectClass}>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Project Type" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Project Types</SelectItem>
          {propertyTypes.map(type => (
            <SelectItem key={type} value={type}>{typeLabel(type)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCity} onValueChange={setSelectedCity}>
        <SelectTrigger className={selectClass}>
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
        <SelectTrigger className={selectClass}>
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
        <SelectTrigger className={selectClass}>
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
        <SelectTrigger className={selectClass}>
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
    </>
  );

  /** Budget slider; `onDark` is for the banner panel on larger screens. */
  const priceFilter = (onDark: boolean) => (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1">
        <div className={`flex items-center justify-between text-sm mb-3 ${onDark ? 'text-white' : 'text-foreground'}`}>
          <span className="font-medium">Budget</span>
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
      {onDark && activeFiltersCount + (searchQuery ? 1 : 0) > 0 && (
        <Button variant="outline" onClick={clearFilters} className="h-10 gap-2 bg-background/95">
          <SlidersHorizontal className="h-4 w-4" /> Reset filters
        </Button>
      )}
    </div>
  );

  const hasCustomHeroImage = Boolean(projectsHeaderImageUrl);
  const heroBackgroundUrl = projectsHeaderImageUrl || heroBuildingImage;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative border-b">
        {/* Only the photo is clipped, so the search suggestions can drop below the banner */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center md:bg-fixed scale-105" style={{ backgroundImage: `url(${heroBackgroundUrl})` }} />
          <div className={`absolute inset-0 ${hasCustomHeroImage ? 'bg-black/50' : 'bg-black/55'}`} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 md:pt-16 pb-8 md:pb-14">
          <div className="text-center mb-5 md:mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-2 md:mb-3 text-white">Browse Properties</h1>
            <p className="text-base md:text-xl max-w-2xl mx-auto text-white/90">
              Discover your perfect home from our collection of premium properties
            </p>
          </div>

          <div className="rounded-2xl p-3 md:p-6 space-y-4 border border-white/30 bg-background/25 backdrop-blur-md shadow-2xl">
            <div className="flex gap-2 md:grid md:grid-cols-2 xl:grid-cols-7 md:gap-4">
              <div className="relative z-20 flex-1 md:col-span-2">
                <SearchSuggest
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={applySuggestion}
                  properties={properties}
                  placeholder="Area, city, project or builder"
                  inputClassName="h-12 rounded-md border border-input bg-background/95 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Phones: one button opens all the filters */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-12 shrink-0 gap-2 bg-background/95 md:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && <Badge className="h-5 min-w-5 justify-center px-1.5">{activeFiltersCount}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
                  <SheetHeader className="text-left">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">{filterSelects}</div>
                  <div className="mt-5">{priceFilter(false)}</div>
                  <div className="sticky bottom-0 -mx-6 mt-6 flex gap-3 border-t bg-background px-6 pt-4 pb-2">
                    <Button variant="outline" className="flex-1" onClick={clearFilters} disabled={activeFiltersCount === 0 && !searchQuery}>
                      Clear all
                    </Button>
                    <Button className="flex-[2]" onClick={() => setFiltersOpen(false)}>
                      Show {filteredProperties.length} project{filteredProperties.length === 1 ? '' : 's'}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden md:contents">{filterSelects}</div>
            </div>

            <div className="hidden md:block">{priceFilter(true)}</div>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results count, active filters and sorting */}
          {!loading && !error && (
            <div className="mb-6 md:mb-8 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm md:text-base text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredProperties.length}</span>{' '}
                  {filteredProperties.length === 1 ? 'project' : 'projects'}
                  {filteredProperties.length !== properties.length && <> of {properties.length}</>}
                </p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeChips.length > 0 && (
                <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.clear}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-sm text-foreground hover:bg-muted"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      {chip.label}
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                  <button type="button" onClick={clearFilters} className="shrink-0 px-2 text-sm font-medium text-primary hover:underline">
                    Clear all
                  </button>
                </div>
              )}
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