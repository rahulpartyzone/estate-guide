import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, MapPin, Phone, Globe, BriefcaseBusiness, Users, Linkedin, Facebook, Instagram, Chrome } from "lucide-react";

interface Executive {
  id: string;
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
}

interface SiteProfile {
  companyName?: string;
  reraNumber?: string;
  tagline?: string;
  description?: string;
  aboutHeroImageUrl?: string;
  landingHeroImageUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  googleUrl?: string;
  whatsappNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  logoUrl?: string;
  executives?: Executive[];
}

const About = () => {
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
  const absolutize = (value?: string) => absolutizeApiUrl(value, RAW_API_BASE);

  const [profile, setProfile] = useState<SiteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getSiteProfile();
        if (!cancelled) setProfile(data || null);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCompany = Boolean(profile?.companyName || profile?.description || profile?.tagline || profile?.logoUrl || profile?.aboutHeroImageUrl || profile?.reraNumber || profile?.linkedinUrl || profile?.facebookUrl || profile?.instagramUrl || profile?.googleUrl);
  const executives = (profile?.executives || []).map((executive) => ({ ...executive, imageUrl: absolutize(executive.imageUrl) }));
  const logoUrl = absolutize(profile?.logoUrl);
  const aboutHeroImageUrl = absolutize(profile?.aboutHeroImageUrl || profile?.landingHeroImageUrl);
  const socialLinks = [
    { key: "linkedin", label: "LinkedIn", url: profile?.linkedinUrl, Icon: Linkedin },
    { key: "facebook", label: "Facebook", url: profile?.facebookUrl, Icon: Facebook },
    { key: "instagram", label: "Instagram", url: profile?.instagramUrl, Icon: Instagram },
    { key: "google", label: "Google", url: profile?.googleUrl, Icon: Chrome },
  ].filter((item) => Boolean(item.url));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="relative border-b overflow-hidden min-h-[300px] md:min-h-[360px] flex items-center">
        {aboutHeroImageUrl ? (
          <>
            <div className="absolute inset-0 bg-cover bg-center md:bg-fixed scale-105" style={{ backgroundImage: `url(${aboutHeroImageUrl})` }} />
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-subtle" />
        )}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${aboutHeroImageUrl ? 'bg-white/20' : 'bg-primary/10'}`}>
              <Building2 className={`h-6 w-6 ${aboutHeroImageUrl ? 'text-white' : 'text-primary'}`} />
            </div>
            <Badge variant="secondary">Company Overview</Badge>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold ${aboutHeroImageUrl ? 'text-white' : 'text-foreground'}`}>About</h1>
          <p className={`text-xl max-w-2xl mx-auto mt-3 ${aboutHeroImageUrl ? 'text-white/90' : 'text-muted-foreground'}`}>Know more about our company and leadership.</p>
        </div>
      </section>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {loading && <p className="text-sm text-muted-foreground">Loading company details...</p>}

        {!loading && hasCompany && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {profile?.companyName}
              </CardTitle>
              {profile?.tagline && <p className="text-sm text-muted-foreground">{profile.tagline}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {logoUrl ? (
                <img src={logoUrl} alt={profile?.companyName || "Company"} className="h-20 w-20 rounded-xl object-cover border" />
              ) : (
                <div className="h-20 w-20 rounded-xl border bg-secondary flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {profile?.description && <p className="text-sm leading-6">{profile.description}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {profile?.reraNumber && <p className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="font-medium">RERA No:</span> {profile.reraNumber}</p>}
                {profile?.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><span className="font-medium">Phone:</span> {profile.phone}</p>}
                {profile?.whatsappNumber && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><span className="font-medium">WhatsApp:</span> {profile.whatsappNumber}</p>}
                {profile?.email && <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><span className="font-medium">Email:</span> {profile.email}</p>}
                {profile?.website && (
                  <p className="inline-flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-medium">Website:</span>{" "}
                    <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{profile.website}</a>
                  </p>
                )}
                {profile?.address && <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span className="font-medium">Address:</span> {profile.address}</p>}
              </div>
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {socialLinks.map(({ key, label, url, Icon }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-secondary/60"
                      aria-label={label}
                      title={label}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && executives.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold inline-flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Our Executives</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {executives.map((executive) => (
                <Card key={executive.id}>
                  <CardContent className="pt-6 space-y-3">
                    {executive.imageUrl ? (
                      <img src={executive.imageUrl} alt={executive.name} className="h-20 w-20 rounded-full object-cover border" />
                    ) : (
                      <div className="h-20 w-20 rounded-full border bg-secondary flex items-center justify-center">
                        <BriefcaseBusiness className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{executive.name}</h3>
                      <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /> {executive.role}</p>
                    </div>
                    {executive.bio && <p className="text-sm text-muted-foreground line-clamp-4">{executive.bio}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {!loading && !hasCompany && executives.length === 0 && (
          <p className="text-sm text-muted-foreground">About content is not available yet.</p>
        )}
      </main>
    </div>
  );
};

export default About;
