import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Calendar, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { getHotProjects } from "@/data/properties";
import { api } from '@/lib/api';
import type { Property } from '@/types/property';
import { mapBackendProperty } from '@/lib/propertyMapper';

const FeaturedProjects = () => {
  const [hotProjects, setHotProjects] = useState<Property[]>(getHotProjects().slice(0,4));
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
          {loading && !hotProjects.length && (
            <div className="col-span-full text-sm text-muted-foreground">Loading hot projects...</div>
          )}
          {hotProjects.map((project, index) => (
            <Card 
              key={project.id} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 bg-card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Project Image */}
              <div className="relative overflow-hidden aspect-[4/3]">
                <img
                  src={project.mainImage}
                  alt={project.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Hot Badge */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-accent text-accent-foreground font-semibold">
                    🔥 Hot Project
                  </Badge>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-white/90 text-foreground">
                    {project.status}
                  </Badge>
                </div>
              </div>

              {/* Project Details */}
              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center text-muted-foreground text-sm mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {project.area}, {project.city}
                  </div>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Home className="h-4 w-4 mr-1" />
                    {project.propertyType}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-primary">{project.priceRange}</p>
                    <p className="text-sm text-muted-foreground">{project.size}</p>
                  </div>

                  {project.completionDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {project.completionDate}
                    </div>
                  )}

                  <Link to={`/project/${project.id}`}>
                    <Button 
                      className="w-full group/btn bg-primary hover:bg-primary-hover"
                      size="sm"
                    >
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
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