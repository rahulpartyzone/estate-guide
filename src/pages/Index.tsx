import Header from "@/components/Header";
import { usePageTitle } from "@/lib/pageTitle";
import Hero from "@/components/Hero";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import FeaturedProjects from "@/components/FeaturedProjects";
import NewsletterSignup from "@/components/public/NewsletterSignup";
import { useNavigate } from "react-router-dom";
import BrowseByArea from "@/components/home/BrowseByArea";
import type { Suggestion } from "@/components/SearchSuggest";
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

  /** A suggestion opens the matching projects (or the project itself). */
  const openSuggestion = (s: Suggestion) => {
    if (s.kind === "project") navigate(`/project/${s.id}`);
    else if (s.kind === "city") navigate(`/projects?city=${encodeURIComponent(s.value)}`);
    else if (s.kind === "builder") navigate(`/projects?builder=${encodeURIComponent(s.value)}`);
    else navigate(`/projects?q=${encodeURIComponent(s.value)}${s.city ? `&city=${encodeURIComponent(s.city)}` : ""}`);
  };

  /** The banner search opens the projects page with the search filled in. */
  const handleSearchSubmit = () => {
    const q = searchTerm.trim();
    navigate(q ? `/projects?q=${encodeURIComponent(q)}` : "/projects");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        properties={properties}
        onSuggestionSelect={openSuggestion}
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
      <NewsletterSignup />
    </div>
  );
};

export default Index;
