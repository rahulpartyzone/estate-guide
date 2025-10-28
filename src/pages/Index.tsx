import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import FeaturedProjects from "@/components/FeaturedProjects";
import PropertyCard from "@/components/PropertyCard";
import { sampleProperties } from "@/data/properties";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Property } from "@/types/property";
import { mapBackendProperty } from "@/lib/propertyMapper";

const Index = () => {
  const [properties, setProperties] = useState<Property[]>(sampleProperties);
  const [loadingProps, setLoadingProps] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProps(true);
      try {
        const { data } = await api.listProperties({ pageSize: 50 });
        if (cancelled) return;
        const mapped: Property[] = (data || []).map(mapBackendProperty);
        if (mapped.length) {
          setProperties(mapped);
        }
      } catch (e) {
        if (cancelled) return;
        // Silent fallback to sample data
      } finally {
        if (!cancelled) setLoadingProps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProperties = useMemo(() => {
    if (!normalizedSearch) return properties;
    return properties.filter((property) => {
      const name = property.name.toLowerCase();
      const area = property.area.toLowerCase();
      const city = property.city.toLowerCase();
      const builder = property.builder.toLowerCase();
      return (
        name.includes(normalizedSearch) ||
        area.includes(normalizedSearch) ||
        city.includes(normalizedSearch) ||
        builder.includes(normalizedSearch)
      );
    });
  }, [properties, normalizedSearch]);

  const visibleProperties = filteredProperties.slice(0, 8);
  const searchActive = normalizedSearch.length > 0;

  const handleSearchSubmit = () => {
    const anchor = document.getElementById("all-projects");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.subscribe(email, name || undefined);
      toast({ title: "Subscribed!" });
      setEmail("");
      setName("");
    } catch (e: any) {
      if (e?.status === 409) {
        toast({ title: "Already subscribed", description: "This email is already on our list." });
      } else {
        toast({ title: "Subscription failed", description: e?.message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        isSearching={loadingProps}
      />
      <FeaturedProjects />
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Stay Updated</h2>
          <p className="text-muted-foreground">
            Join our newsletter to receive new project launches, price trends, and investment insights.
          </p>
          <form onSubmit={subscribe} className="grid gap-3 md:grid-cols-3 text-left">
            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="md:col-span-1"
            />
            <Input
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              className="md:col-span-1"
            />
            <Button type="submit" disabled={submitting} className="md:col-span-1 w-full">
              {submitting ? "Subscribing..." : "Subscribe"}
            </Button>
            <div className="md:col-span-3 text-xs text-muted-foreground text-center">
              You can unsubscribe anytime via a link in our emails.
            </div>
          </form>
        </div>
      </section>

      {/* All Projects Preview Section */}
      <section id="all-projects" className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {searchActive ? "Search Results" : "Browse All Projects"}
              </h2>
              <p className="text-muted-foreground">
                {searchActive
                  ? `Showing ${filteredProperties.length} matching project${filteredProperties.length === 1 ? "" : "s"}`
                  : "Explore our complete portfolio of premium properties"}
              </p>
            </div>
            <Link to="/projects">
              <Button variant="outline" className="hidden sm:flex group">
                View All
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[120px]">
            {loadingProps && visibleProperties.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">Loading projects...</div>
            )}
            {visibleProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
            {!loadingProps && visibleProperties.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">
                {searchActive ? "No projects match your search" : "No projects available"}
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Link to="/projects">
              <Button size="lg" className="bg-gradient-primary group">
                View All Projects
                <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
