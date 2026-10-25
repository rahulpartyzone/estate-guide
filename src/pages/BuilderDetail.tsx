import { useEffect, useMemo, useState } from "react";
import { Txt, useText } from "@/content/siteText";
import { usePageTitle } from "@/lib/pageTitle";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import PropertyCard from "@/components/PropertyCard";
import { mapBackendProperty } from "@/lib/propertyMapper";
import { absolutizeApiUrl } from "@/lib/url";
import type { Property } from "@/types/property";
import { Mail, Phone, Globe, BriefcaseBusiness, Star } from "lucide-react";

interface BuilderProperty {
  id: string;
  name: string;
  city?: string;
  area?: string;
  mainImageUrl?: string;
  propertyType?: string;
}

interface BuilderDetailData {
  id: string;
  name: string;
  description?: string;
  experienceYears?: number;
  rating?: number;
  website?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  properties: BuilderProperty[];
}

const BuilderDetail = () => {
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
  const absolutize = (value?: string) => absolutizeApiUrl(value, RAW_API_BASE);

  const { id } = useParams();
  const [builder, setBuilder] = useState<BuilderDetailData | null>(null);
  usePageTitle(builder?.name || null);
  const [loading, setLoading] = useState(true);
  const { t } = useText();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getBuilder(id);
        if (!cancelled) setBuilder(data || null);
      } catch {
        if (!cancelled) setBuilder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<string, Property[]>();
    for (const backendProperty of builder?.properties || []) {
      const mapped = mapBackendProperty(backendProperty as any);
      const key = mapped.propertyType || "Other";
      const current = map.get(key) || [];
      current.push(mapped);
      map.set(key, current);
    }
    return Array.from(map.entries());
  }, [builder]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {loading && <p className="text-sm text-muted-foreground">{t("builders.detail.loading")}</p>}

        {!loading && !builder && <p className="text-sm text-muted-foreground">{t("builders.detail.notFound")}</p>}

        {!loading && builder && (
          <>
            <Card>
              {builder.heroImageUrl && <img src={absolutize(builder.heroImageUrl)} alt={`${builder.name} hero`} className="h-56 w-full object-cover rounded-t-lg" />}
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {builder.logoUrl && <img src={absolutize(builder.logoUrl)} alt={builder.name} className="h-16 w-16 rounded-full object-cover border" />}
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold">{builder.name}</h1>
                    {builder.description && <p className="text-sm text-muted-foreground leading-6">{builder.description}</p>}
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-5 gap-y-2">
                      {typeof builder.experienceYears === "number" && <Txt k="builders.detail.experience" vars={{ years: builder.experienceYears }} className="inline-flex items-center gap-2" before={<BriefcaseBusiness className="h-4 w-4" />} />}
                      {typeof builder.rating === "number" && <Txt k="builders.detail.rating" vars={{ rating: builder.rating }} className="inline-flex items-center gap-2" before={<Star className="h-4 w-4" />} />}
                      {builder.phone && <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {builder.phone}</span>}
                      {builder.email && <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" /> {builder.email}</span>}
                      {builder.website && (
                        <a href={builder.website} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-2">
                          <Globe className="h-4 w-4" /> {builder.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-6">
              <Txt k="builders.detail.projectsTitle" as="h2" className="text-2xl font-semibold" />
              {grouped.map(([type, properties]) => (
                <div key={type} className="space-y-3">
                  <h3 className="text-xl font-medium">{type}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </div>
              ))}
              {!grouped.length && <p className="text-sm text-muted-foreground">{t("builders.detail.noProjects")}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default BuilderDetail;
