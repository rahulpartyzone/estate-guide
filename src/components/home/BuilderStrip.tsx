import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";

interface BuilderLite {
  id: string;
  name: string;
  logoUrl?: string;
}

/** "Builders we work with": logos linking to each builder's page. */
const BuilderStrip = () => {
  const [builders, setBuilders] = useState<BuilderLite[]>([]);

  useEffect(() => {
    const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";
    api
      .listBuilders()
      .then((data) =>
        setBuilders(
          (data || [])
            .map((b: any) => ({ id: b.id, name: b.name, logoUrl: absolutizeApiUrl(b.logoUrl, rawApiBase) }))
            .filter((b: BuilderLite) => b.id && b.name)
            .slice(0, 12),
        ),
      )
      .catch(() => setBuilders([]));
  }, []);

  if (!builders.length) return null;

  return (
    <section className="py-14 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Our partners</p>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Builders we work with</h2>
          </div>
          <Link to="/builders" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex">
            All builders <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {builders.map((b) => (
            <Link
              key={b.id}
              to={`/builders/${b.id}`}
              title={b.name}
              className="group flex h-24 items-center justify-center rounded-xl border bg-card px-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              {b.logoUrl ? (
                <img
                  src={b.logoUrl}
                  alt={b.name}
                  loading="lazy"
                  className="max-h-14 max-w-full object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                />
              ) : (
                <span className="text-center font-display text-lg font-semibold text-foreground/80">{b.name}</span>
              )}
            </Link>
          ))}
        </div>
        <Link to="/builders" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary sm:hidden">
          All builders <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
};

export default BuilderStrip;
