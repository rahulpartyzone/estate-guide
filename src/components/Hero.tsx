import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import SearchSuggest, { type Suggestion } from "@/components/SearchSuggest";
import type { Property } from "@/types/property";
import heroBuilding from "@/assets/hero-building.jpg";
import { FormEvent } from "react";

type HeroProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchSubmit: () => void;
  /** Listed projects, for suggestions as the visitor types */
  properties?: Property[];
  onSuggestionSelect?: (s: Suggestion) => void;
  isSearching?: boolean;
  heroImageUrl?: string;
  titlePrefix?: string;
  titleHighlight?: string;
  description?: string;
  stats?: Array<{ value: string; label: string }>;
};

const Hero = ({
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  properties = [],
  onSuggestionSelect,
  isSearching,
  heroImageUrl,
  titlePrefix,
  titleHighlight,
  description,
  stats,
}: HeroProps) => {
  const heroTitlePrefix = titlePrefix?.trim() || "Find Your";
  const heroTitleHighlight = titleHighlight?.trim() || "Dream Home";
  const heroDescription = description?.trim() || "Discover premium properties with modern amenities and prime locations. Your perfect home awaits in our curated collection of luxury real estate.";
  const heroStats = (stats && stats.length > 0 ? stats : [
    { value: "50+", label: "Premium Projects" },
    { value: "1000+", label: "Happy Families" },
    { value: "25+", label: "Prime Locations" },
  ]).filter((item) => item.value?.trim() && item.label?.trim());

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center py-12 md:py-0">
      {/* Background Image */}
      <div 
        className="absolute inset-0 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImageUrl || heroBuilding})` }}
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      </div>

      {/* Content */}
      {/* No fade-in here: the heading is the first thing visitors (and Google's speed score) wait for */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center md:pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-5 md:mb-6 leading-tight">
            {heroTitlePrefix}
            <span className="text-accent block mt-2">{heroTitleHighlight}</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            {heroDescription}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <SearchSuggest
                    icon="pin"
                    value={searchTerm}
                    onChange={onSearchTermChange}
                    onSubmit={onSearchSubmit}
                    onSelect={(s) => onSuggestionSelect?.(s)}
                    properties={properties}
                    placeholder="Area, city, project or builder"
                    inputClassName="h-12 rounded-xl border-0 bg-white/95 pr-4 text-base text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button 
                  type="submit"
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 rounded-xl"
                  disabled={isSearching}
                >
                  <Search className="h-5 w-5 mr-2" />
                  {isSearching ? "Searching..." : "Search Properties"}
                </Button>
              </div>
            </form>
          </div>

          {/* Stats */}
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 text-white md:flex md:max-w-none md:justify-center md:gap-12">
            {heroStats.map((item) => (
              <div key={`${item.value}-${item.label}`} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-accent">{item.value}</div>
                <div className="text-xs leading-tight text-white/80 sm:text-sm md:text-base">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 transform animate-bounce md:block" aria-hidden="true">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default Hero;