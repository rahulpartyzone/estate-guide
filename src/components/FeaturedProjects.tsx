import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Star } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import { Link } from "react-router-dom";
import { api } from '@/lib/api';
import type { Property } from '@/types/property';
import { mapBackendProperty } from '@/lib/propertyMapper';

const FeaturedProjects = () => {
  const [hotProjects, setHotProjects] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.listHotProperties(8); // returns array
        const mapped: Property[] = (data || []).map(mapBackendProperty);
        setHotProjects(mapped.slice(0,4));
      } catch (_) {
        // silently keep fallback sample data
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <section className="py-16 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-6 w-6 text-accent" fill="currentColor" />
            <Badge variant="secondary" className="text-sm font-medium">
              Hot Projects
            </Badge>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Featured Premium Projects
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover our handpicked selection of exceptional properties with exclusive amenities and prime locations
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {loading && !hotProjects.length &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          {hotProjects.map((project) => (
            <PropertyCard key={project.id} property={project} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link to="/projects">
            <Button size="lg" variant="outline" className="group">
              View All Projects
              <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProjects;