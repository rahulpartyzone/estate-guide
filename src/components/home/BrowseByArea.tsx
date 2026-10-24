import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building, Home, LandPlot, Trees } from "lucide-react";
import type { Property } from "@/types/property";
import { PropertyTypeLabels } from "@/constants/enums";

const TYPE_ICONS: Record<string, typeof Home> = { Apartment: Building, Villa: Home, Plot: LandPlot, TownShip: Trees };

/** One city: a wide banner. Two: side by side. Three or more: the biggest city gets a large tile. */
function tileShape(index: number, total: number) {
  if (total === 1) return "aspect-[16/9] md:aspect-[21/8]";
  if (total === 2) return "aspect-[4/3] md:aspect-[16/9]";
  return index === 0 ? "col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-[4/3]";
}

/** Tiles for each city with projects, and quick links by property type. Built from the projects already loaded. */
const BrowseByArea = ({ properties }: { properties: Property[] }) => {
  const cities = useMemo(() => {
    const map = new Map<string, { city: string; count: number; image: string; areas: Set<string> }>();
    for (const p of properties) {
      if (!p.city) continue;
      const entry = map.get(p.city) || { city: p.city, count: 0, image: p.mainImage, areas: new Set<string>() };
      entry.count += 1;
      if (!entry.image && p.mainImage) entry.image = p.mainImage;
      if (p.area) entry.areas.add(p.area);
      map.set(p.city, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [properties]);

  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of properties) counts.set(p.propertyType, (counts.get(p.propertyType) || 0) + 1);
    return [...counts.entries()].filter(([t]) => t in TYPE_ICONS).sort((a, b) => b[1] - a[1]);
  }, [properties]);

  if (!cities.length) return null;

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Explore</p>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Browse by location</h2>
            <p className="mt-2 text-muted-foreground">Find projects in the city you want to live in.</p>
          </div>
          {types.length > 1 && (
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              {types.map(([type, count]) => {
                const Icon = TYPE_ICONS[type] || Home;
                return (
                  <Link
                    key={type}
                    to={`/projects?type=${encodeURIComponent(type)}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    {PropertyTypeLabels[type as keyof typeof PropertyTypeLabels] || type}s
                    <span className="text-muted-foreground">{count}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className={`grid gap-4 md:gap-6 ${cities.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${cities.length >= 3 ? "lg:grid-cols-4" : ""}`}>
          {cities.map((c, i) => (
            <Link
              key={c.city}
              to={`/projects?city=${encodeURIComponent(c.city)}`}
              className={`group relative overflow-hidden rounded-2xl bg-muted ${tileShape(i, cities.length)}`}
            >
              {c.image && (
                <img src={c.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                <h3 className="font-display text-xl font-semibold text-white md:text-3xl">{c.city}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-white/80 md:text-sm">
                  {c.count} project{c.count === 1 ? "" : "s"}
                  {c.areas.size ? ` · ${[...c.areas].slice(0, 3).join(", ")}` : ""}
                </p>
                <span className="mt-3 hidden items-center gap-1 text-sm font-semibold text-white md:inline-flex">
                  View projects <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrowseByArea;
