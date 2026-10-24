import Header from "@/components/Header";
import { usePageTitle } from "@/lib/pageTitle";
import Hero from "@/components/Hero";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import FeaturedProjects from "@/components/FeaturedProjects";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BrowseByArea from "@/components/home/BrowseByArea";
import WhyUs from "@/components/home/WhyUs";
import BuilderStrip from "@/components/home/BuilderStrip";
import type { Property } from "@/types/property";
import { mapBackendProperty } from "@/lib/propertyMapper";
import LeadPreferenceForm from "@/components/LeadPreferenceForm";
import Testimonials from "@/components/Testimonials";
import { absolutizeApiUrl } from "@/lib/url";

type LandingHeroContent = {
  imageUrl: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  stats: Array<{ value: string; label: string }>;
};

const Index = () => {
  usePageTitle(null);
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
  const absolutize = (value?: string) => absolutizeApiUrl(value, RAW_API_BASE);

  const [properties, setProperties] = useState<Property[]>([]);
  const [landingHeroContent, setLandingHeroContent] = useState<LandingHeroContent>({
    imageUrl: "",
    titlePrefix: "",
    titleHighlight: "",
    description: "",
    stats: [],
  });
  const [loadingProps, setLoadingProps] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProps(true);
      try {
        const { data } = await api.listProperties({ pageSize: 50 });
        if (cancelled) return;
        const mapped: Property[] = (data || []).map(mapBackendProperty);
        setProperties(mapped);
      } catch (e) {
        if (cancelled) return;
      } finally {
        if (!cancelled) setLoadingProps(false);
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
        if (cancelled) return;
        const stats = [
          { value: profile?.landingHeroStat1Value || "", label: profile?.landingHeroStat1Label || "" },
          { value: profile?.landingHeroStat2Value || "", label: profile?.landingHeroStat2Label || "" },
          { value: profile?.landingHeroStat3Value || "", label: profile?.landingHeroStat3Label || "" },
        ].filter((item) => item.value?.trim() && item.label?.trim());
        setLandingHeroContent({
          imageUrl: absolutize(profile?.landingHeroImageUrl || ""),
          titlePrefix: profile?.landingHeroTitlePrefix || "",
          titleHighlight: profile?.landingHeroTitleHighlight || "",
          description: profile?.landingHeroDescription || "",
          stats,
        });
      } catch {
        if (!cancelled) {
          setLandingHeroContent({
            imageUrl: "",
            titlePrefix: "",
            titleHighlight: "",
            description: "",
            stats: [],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** The banner search opens the projects page with the search filled in. */
  const handleSearchSubmit = () => {
    const q = searchTerm.trim();
    navigate(q ? `/projects?q=${encodeURIComponent(q)}` : "/projects");
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
        heroImageUrl={landingHeroContent.imageUrl || undefined}
        titlePrefix={landingHeroContent.titlePrefix || undefined}
        titleHighlight={landingHeroContent.titleHighlight || undefined}
        description={landingHeroContent.description || undefined}
        stats={landingHeroContent.stats.length ? landingHeroContent.stats : undefined}
      />
      <FeaturedProjects />
      <BrowseByArea properties={properties} />
      <WhyUs />
      <BuilderStrip />
      <Testimonials />
      <LeadPreferenceForm sourcePage="landing" className="py-12 md:py-16" />
      <section className="border-t bg-muted/30 py-16">
        <div className="container mx-auto max-w-3xl space-y-6 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">Stay updated</h2>
          <p className="text-muted-foreground">
            New project launches, price updates and offers, straight to your inbox. No spam.
          </p>
          <form onSubmit={subscribe} className="grid gap-3 text-left md:grid-cols-3">
            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 md:col-span-1"
            />
            <Input
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              className="h-11 md:col-span-1"
            />
            <Button type="submit" disabled={submitting} className="h-11 w-full md:col-span-1">
              {submitting ? "Subscribing..." : "Subscribe"}
            </Button>
            <div className="text-center text-xs text-muted-foreground md:col-span-3">
              You can unsubscribe anytime via a link in our emails.
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Index;
