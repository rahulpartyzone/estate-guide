import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { sampleProperties } from "@/data/properties";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Property } from "@/types/property";
import { mapBackendProperty } from '@/lib/propertyMapper';
import { PropertyTypeLabels, ProjectStatusLabels } from '@/constants/enums';

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBuilder, setSelectedBuilder] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>(sampleProperties);
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

  const cities = useMemo(() => [...new Set(properties.map(p => p.city))], [properties]);
  const propertyTypes = useMemo(() => [...new Set(properties.map(p => p.propertyType))], [properties]);
  const builders = useMemo(() => builderNames.length ? builderNames : [...new Set(properties.map(p => p.builder))], [builderNames, properties]);

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = selectedCity === "all" || property.city === selectedCity;
    const matchesType = selectedType === "all" || property.propertyType === selectedType;
    const matchesBuilder = selectedBuilder === "all" || property.builder === selectedBuilder;

    return matchesSearch && matchesCity && matchesType && matchesBuilder;
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
    setSortBy("newest");
  };

  const activeFiltersCount = [selectedCity, selectedType, selectedBuilder].filter(f => f !== "all").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Page Header */}
      <section className="bg-gradient-subtle py-12 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Browse Properties
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover your perfect home from our collection of premium properties
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 bg-background border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by property name, location, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-3 text-lg"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{PropertyTypeLabels[type as keyof typeof PropertyTypeLabels] || type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBuilder} onValueChange={setSelectedBuilder}>
                <SelectTrigger>
                  <SelectValue placeholder="Builder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  {builders.map(builder => (
                    <SelectItem key={builder} value={builder}>{builder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
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
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Clear Filters
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
          <div className="mb-8 flex flex-col gap-2">
            {loading && <p className="text-sm text-muted-foreground">Loading properties...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-muted-foreground">
              Showing {filteredProperties.length} of {properties.length} properties
              {properties === sampleProperties && ' (sample data)'}
            </p>
          </div>

          {/* Properties Grid */}
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mb-6">
                <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  No Properties Found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search query to find more properties.
                </p>
              </div>
              <Button onClick={clearFilters} variant="outline">
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Projects;