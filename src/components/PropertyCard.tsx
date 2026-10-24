import { Card } from "@/components/ui/card";
import { MapPin, ArrowRight, BedDouble, Ruler, CalendarClock, Heart, Scale, BadgeCheck, Flame } from "lucide-react";
import { toast } from "sonner";
import { toggleCompare, useCompareIds } from "@/lib/compare";
import { toggleSaved, useSavedIds } from "@/lib/saved";
import { openBuyerLogin, useBuyer } from "@/lib/buyer";
import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { ProjectStatusLabels, PropertyTypeLabels } from "@/constants/enums";

interface PropertyCardProps {
  property: Property;
  className?: string;
}

/** Project card used on the home page, projects list, builder pages and saved projects. */
const PropertyCard = ({ property, className = "" }: PropertyCardProps) => {
  const isPlot = property.propertyType === "Plot";
  const comparing = useCompareIds().includes(property.id);
  const saved = useSavedIds().includes(property.id);
  const buyer = useBuyer();
  const href = `/project/${property.id}`;

  const bedrooms = property.bedroomSummary || (property.bedrooms != null ? String(property.bedrooms) : "");
  const size = isPlot ? property.size || property.developmentSize : property.size || property.unitSizeRange;
  const possession = property.possessionTime || property.completionDate;
  const facts = [
    !isPlot && bedrooms ? { Icon: BedDouble, text: `${bedrooms} BHK` } : null,
    size ? { Icon: Ruler, text: size } : null,
    possession ? { Icon: CalendarClock, text: possession } : null,
  ].filter(Boolean) as { Icon: typeof Ruler; text: string }[];

  const status = ProjectStatusLabels[property.status as keyof typeof ProjectStatusLabels] || property.status;
  const type = PropertyTypeLabels[property.propertyType as keyof typeof PropertyTypeLabels] || property.propertyType;

  const onSave = async () => {
    try {
      const nowSaved = await toggleSaved(property.id);
      if (nowSaved && !buyer) {
        toast.success("Saved on this device", {
          description: "Sign in to see it on your other devices too.",
          action: { label: "Sign in", onClick: () => openBuyerLogin() },
        });
      } else {
        toast.success(nowSaved ? "Saved to your list" : "Removed from saved projects");
      }
    } catch {
      toast.error("Couldn't update saved projects. Please try again.");
    }
  };

  return (
    <Card
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      {/* Photo with price on it */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Link to={href} className="block h-full" aria-label={property.name}>
          <img
            src={property.mainImage}
            alt={property.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {property.isHotProject && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-sm">
              <Flame className="h-3.5 w-3.5" /> Hot
            </span>
          )}
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">{type}</span>
        </div>

        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? "Remove from saved projects" : "Save this project"}
          aria-pressed={saved}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : "text-foreground"}`} />
        </button>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          {property.priceRange ? (
            <p className="text-xl font-bold leading-tight text-white drop-shadow-md">{property.priceRange}</p>
          ) : (
            <span />
          )}
          <span className="shrink-0 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">{status}</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-5">
        <Link to={href} className="block">
          <h3 className="font-display text-xl font-semibold leading-snug text-foreground transition-colors line-clamp-1 group-hover:text-primary">
            {property.name}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-1 h-4 w-4 shrink-0" />
          <span className="line-clamp-1">
            {property.area}, {property.city}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {property.builderLogoUrl && (
            <img src={property.builderLogoUrl} alt="" className="h-5 w-5 rounded object-cover" loading="lazy" />
          )}
          <span className="line-clamp-1">by {property.builder}</span>
          {property.reraId && (
            <span
              className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
              title={`RERA No. ${property.reraId}`}
            >
              <BadgeCheck className="h-3.5 w-3.5" /> RERA
            </span>
          )}
        </div>

        {facts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {facts.map(({ Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {text}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-5">
          <Link
            to={href}
            className="group/btn inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            View details
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
          <button
            type="button"
            onClick={() => toggleCompare(property.id)}
            aria-pressed={comparing}
            title={comparing ? "Remove from comparison" : "Add to comparison"}
            aria-label={comparing ? "Remove from comparison" : "Add to comparison"}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              comparing ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <Scale className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default PropertyCard;
