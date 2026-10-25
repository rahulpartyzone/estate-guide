import { useEffect, useMemo, useState } from "react";
import { Txt, useText } from "@/content/siteText";
import { usePageTitle } from "@/lib/pageTitle";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import LeadPreferenceForm from "@/components/LeadPreferenceForm";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHero from "@/components/public/PageHero";
import PageState from "@/components/public/PageState";
import { Mail, BriefcaseBusiness, Globe, Star } from "lucide-react";

interface Builder {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  rating?: number;
  experienceYears?: number;
  email?: string;
  website?: string;
  _count?: { properties?: number };
}

const Builders = () => {
  usePageTitle("Builders");
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
  const absolutize = (value?: string) => absolutizeApiUrl(value, RAW_API_BASE);

  const [builders, setBuilders] = useState<Builder[]>([]);
  const { t } = useText();
  const [buildersHeaderImageUrl, setBuildersHeaderImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const data = await api.listBuilders();
        if (!cancelled) {
          setBuilders((data || []).map((b: any) => ({
            ...b,
            logoUrl: absolutize(b.logoUrl),
            heroImageUrl: absolutize(b.heroImageUrl),
          })));
        }
      } catch (e: any) {
        if (!cancelled) setBuilders([]);
        if (!cancelled) setError(e?.message || "Failed to load builders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await api.getSiteProfile();
        if (!cancelled) {
          setBuildersHeaderImageUrl(absolutize(profile?.buildersHeroImageUrl || profile?.landingHeroImageUrl || ""));
        }
      } catch {
        if (!cancelled) setBuildersHeaderImageUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedBuilders = useMemo(() => [...builders].sort((a, b) => a.name.localeCompare(b.name)), [builders]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero
        title={t("builders.banner.title")}
        subtitle={t("builders.banner.subtitle")}
        backgroundImageUrl={buildersHeaderImageUrl}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-xl border p-5 space-y-4">
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <PageState
            title={t("builders.list.errorTitle")}
            description={error}
            action={<Button variant="outline" onClick={() => window.location.reload()}>{t("builders.list.retry")}</Button>}
          />
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedBuilders.map((builder) => (
              <Link to={`/builders/${builder.id}`} key={builder.id}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  {builder.heroImageUrl && (
                    <img src={builder.heroImageUrl} alt={`${builder.name} hero`} className="h-44 w-full object-cover rounded-t-lg" />
                  )}
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      {builder.logoUrl && <img src={builder.logoUrl} alt={builder.name} className="h-12 w-12 rounded-full object-cover border" />}
                      <div>
                        <h2 className="font-semibold line-clamp-1">{builder.name}</h2>
                        <p className="text-xs text-muted-foreground">{t("builders.list.projects", { count: builder._count?.properties || 0 })}</p>
                      </div>
                    </div>
                    {builder.description && <p className="text-sm text-muted-foreground line-clamp-3">{builder.description}</p>}
                    <div className="text-xs text-muted-foreground grid grid-cols-1 gap-1">
                      {typeof builder.experienceYears === "number" && (
                        <Txt k="builders.list.experience" vars={{ years: builder.experienceYears }} className="inline-flex items-center gap-2" before={<BriefcaseBusiness className="h-3.5 w-3.5" />} />
                      )}
                      {typeof builder.rating === "number" && (
                        <Txt k="builders.list.rating" vars={{ rating: builder.rating }} className="inline-flex items-center gap-2" before={<Star className="h-3.5 w-3.5" />} />
                      )}
                      {builder.email && (
                        <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {builder.email}</span>
                      )}
                      {builder.website && (
                        <span className="inline-flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> {builder.website.replace(/^https?:\/\//, '')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {!sortedBuilders.length && (
              <div className="sm:col-span-2 lg:col-span-3">
                <PageState title={t("builders.list.emptyTitle")} description={t("builders.list.emptyText")} />
              </div>
            )}
          </div>
        )}

        <LeadPreferenceForm sourcePage="builders" className="pt-4 pb-2" />
      </main>
    </div>
  );
};

export default Builders;
