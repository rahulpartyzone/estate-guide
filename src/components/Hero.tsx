import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import heroBuilding from "@/assets/hero-building.jpg";
import { FormEvent } from "react";

type HeroProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchSubmit: () => void;
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
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImageUrl || heroBuilding})` }}
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            {heroTitlePrefix}
            <span className="text-accent block mt-2">{heroTitleHighlight}</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            {heroDescription}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex items-center space-x-3 bg-white/90 rounded-xl px-4 py-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => onSearchTermChange(event.target.value)}
                    placeholder="Enter location, city, or area..."
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
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
          <div className="flex flex-wrap justify-center gap-8 text-white">
            {heroStats.map((item) => (
              <div key={`${item.value}-${item.label}`} className="text-center">
                <div className="text-3xl font-bold text-accent">{item.value}</div>
                <div className="text-white/80">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default Hero;