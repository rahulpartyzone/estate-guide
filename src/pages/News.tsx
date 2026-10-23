import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/pageTitle";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHero from "@/components/public/PageHero";
import PageState from "@/components/public/PageState";
import { CalendarDays, ExternalLink, Newspaper, UserRound } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  category?: string;
  authorName?: string;
  sourceUrl?: string;
  tags?: string[];
  publishedAt?: string;
  createdAt?: string;
}

const News = () => {
  usePageTitle("Real estate news");
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";
  const absolutize = (value?: string) => absolutizeApiUrl(value, RAW_API_BASE);

  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsHeaderImageUrl, setNewsHeaderImageUrl] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const items = await api.listNews();
        if (!cancelled) setNews(items || []);
      } catch (e: any) {
        if (!cancelled) setNews([]);
        if (!cancelled) setError(e?.message || "Failed to load news");
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
          setNewsHeaderImageUrl(absolutize(profile?.newsHeroImageUrl || profile?.landingHeroImageUrl || ""));
        }
      } catch {
        if (!cancelled) setNewsHeaderImageUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => (news.length ? news[0] : null), [news]);
  const rest = useMemo(() => (news.length > 1 ? news.slice(1) : []), [news]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero
        title="Real Estate News"
        subtitle="Fresh launches, market trends, policy shifts, and curated insights from our editorial desk."
        backgroundImageUrl={newsHeaderImageUrl}
        badgeText="Latest Updates"
        icon={<Newspaper className={`h-5 w-5 ${newsHeaderImageUrl ? 'text-white' : 'text-primary'}`} />}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {loading && (
          <div className="space-y-6">
            <Card className="overflow-hidden border-primary/20 w-full lg:w-1/2">
              <Skeleton className="h-64 md:h-80 w-full" />
              <CardContent className="p-6 md:p-8 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
              </CardContent>
            </Card>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>
        )}

        {!loading && error && (
          <PageState
            title="Couldn’t load news"
            description={error}
            action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
          />
        )}

        {!loading && !error && featured && (
          <div className="w-full lg:w-1/2">
            <Card className="overflow-hidden border-primary/20">
              {featured.imageUrl && <img src={absolutize(featured.imageUrl)} alt={featured.title} className="h-64 md:h-80 w-full object-cover" />}
              <CardContent className="p-6 md:p-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {featured.category && <Badge>{featured.category}</Badge>}
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{new Date(featured.publishedAt || featured.createdAt || Date.now()).toLocaleDateString()}</span>
                  {featured.authorName && <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4" />{featured.authorName}</span>}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">{featured.title}</h2>
                <p className="text-muted-foreground">{featured.excerpt}</p>
                <p className="leading-7 whitespace-pre-wrap">{featured.content}</p>
                {featured.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {featured.tags.map((tag) => (
                      <Badge key={tag} variant="outline">#{tag}</Badge>
                    ))}
                  </div>
                ) : null}
                {featured.sourceUrl && (
                  <a href={featured.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
                    Original Source <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && !error && rest.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rest.map((item) => {
              const expanded = activeId === item.id;
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {item.imageUrl && <img src={absolutize(item.imageUrl)} alt={item.title} className="h-48 w-full object-cover" />}
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.category && <Badge variant="secondary">{item.category}</Badge>}
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.publishedAt || item.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl font-semibold leading-snug">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.excerpt}</p>
                    {expanded && <p className="text-sm leading-7 whitespace-pre-wrap">{item.content}</p>}
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveId(expanded ? null : item.id)}>
                        {expanded ? "Show Less" : "Read More"}
                      </Button>
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                          Source <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : <span />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {!loading && !error && news.length === 0 && (
          <PageState
            title="No news published yet"
            description="Please check back soon for the latest real-estate updates."
          />
        )}
      </main>
    </div>
  );
};

export default News;
