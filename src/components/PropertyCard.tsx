import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Calendar, ArrowRight, Bath, Bed } from "lucide-react";
import { Link } from "react-router-dom";
import { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
  className?: string;
}

const PropertyCard = ({ property, className }: PropertyCardProps) => {
  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 bg-card ${className}`}>
      {/* Property Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={property.mainImage}
          alt={property.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Hot Project Badge */}
        {property.isHotProject && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-accent text-accent-foreground font-semibold">
              🔥 Hot
            </Badge>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-foreground text-xs">
            {property.status}
          </Badge>
        </div>

        {/* Property Type */}
        <div className="absolute bottom-4 left-4">
          <Badge variant="outline" className="bg-white/90 text-foreground border-white/50">
            {property.propertyType}
          </Badge>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {property.name}
          </h3>
          <div className="flex items-center text-muted-foreground text-sm mb-1">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{property.area}, {property.city}</span>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {property.builderLogoUrl && (
              <img
                src={property.builderLogoUrl}
                alt={property.builder}
                className="h-5 w-5 object-cover rounded"
                loading="lazy"
              />
            )}
            <span>by {property.builder}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Price and Size */}
          <div>
            <p className="text-xl font-bold text-primary">{property.priceRange}</p>
            <p className="text-sm text-muted-foreground">{property.size}</p>
          </div>

          {/* Bedrooms and Bathrooms */}
          {(() => {
            const bedroomLabel = property.bedroomSummary || (property.bedrooms != null ? String(property.bedrooms) : undefined);
            const bathroomLabel = property.bathroomSummary || (property.bathrooms != null ? String(property.bathrooms) : undefined);
            return (bedroomLabel || bathroomLabel) ? (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {bedroomLabel && (
                <div className="flex items-center">
                  <Bed className="h-4 w-4 mr-1" />
                  {bedroomLabel} BHK
                </div>
              )}
              {bathroomLabel && (
                <div className="flex items-center">
                  <Bath className="h-4 w-4 mr-1" />
                  {bathroomLabel} Bath
                </div>
              )}
            </div>
            ) : null;
          })()}

          {/* Completion Date */}
          {property.completionDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              {property.completionDate}
            </div>
          )}

          {/* View Details Button */}
          <Link to={`/project/${property.id}`} className="block">
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
  );
};

export default PropertyCard;