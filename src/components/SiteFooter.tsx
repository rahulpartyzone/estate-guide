import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";

interface Profile {
  companyName?: string;
  tagline?: string;
  description?: string;
  reraNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  googleUrl?: string;
  logoUrl?: string;
  headerLogoUrl?: string;
}

const explore = [
  { name: "All projects", href: "/projects" },
  { name: "Builders", href: "/builders" },
  { name: "News", href: "/news" },
  { name: "About us", href: "/about" },
  { name: "Saved projects", href: "/saved" },
  { name: "Compare projects", href: "/compare" },
];

/** Footer on every public page: who we are, how to reach us, and quick links. */
const SiteFooter = () => {
  const { pathname } = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    api
      .getSiteProfile()
      .then((p) => setProfile(p || {}))
      .catch(() => setProfile({}));
  }, []);

  if (pathname.startsWith("/admin")) return null;

  const name = profile?.companyName?.trim() || "YourHomeSearch";
  const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";
  const logo = absolutizeApiUrl(profile?.headerLogoUrl || profile?.logoUrl || "", rawApiBase);
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/[^\d+]/g, "")}` : "";
  const waDigits = (profile?.whatsappNumber || "").replace(/\D/g, "");
  const socials = [
    { href: profile?.facebookUrl, label: "Facebook", Icon: Facebook },
    { href: profile?.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: profile?.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
    { href: profile?.googleUrl, label: "Google reviews", Icon: Star },
  ].filter((s) => s.href && /^https?:\/\//i.test(s.href));
  // The project page has a bar fixed to the bottom on phones; leave room for it.
  const extraBottom = pathname.startsWith("/project/") ? "pb-24 lg:pb-0" : "";

  return (
    <footer className={`mt-16 border-t bg-slate-950 text-slate-300 ${extraBottom}`}>
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4 lg:col-span-2 lg:pr-12">
          <Link to="/" className="inline-flex items-center gap-2">
            {logo ? (
              <span className="inline-flex rounded-md bg-white px-2 py-1">
                <img src={logo} alt={name} className="h-9 w-auto max-w-[200px] object-contain" />
              </span>
            ) : (
              <>
                <Building2 className="h-7 w-7 text-white" />
                <span className="text-lg font-semibold text-white">{name}</span>
              </>
            )}
          </Link>
          {(profile?.tagline || profile?.description) && (
            <p className="max-w-md text-sm leading-relaxed text-slate-400">{profile?.tagline || profile?.description}</p>
          )}
          {profile?.reraNumber && (
            <p className="text-xs text-slate-400">
              RERA registration: <span className="font-medium text-slate-200">{profile.reraNumber}</span>
            </p>
          )}
          {socials.length > 0 && (
            <div className="flex gap-2 pt-1">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-colors hover:border-white hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Explore</h3>
          <ul className="space-y-2 text-sm">
            {explore.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="transition-colors hover:text-white">
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Talk to us</h3>
          <ul className="space-y-3 text-sm">
            {profile?.phone && (
              <li>
                <a href={phoneHref} className="flex items-start gap-2 transition-colors hover:text-white">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" /> {profile.phone}
                </a>
              </li>
            )}
            {waDigits && (
              <li>
                <a
                  href={`https://wa.me/${waDigits}?text=${encodeURIComponent("Hi, I'd like help finding a home.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 transition-colors hover:text-white"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" /> WhatsApp us
                </a>
              </li>
            )}
            {profile?.email && (
              <li>
                <a href={`mailto:${profile.email}`} className="flex items-start gap-2 break-all transition-colors hover:text-white">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" /> {profile.email}
                </a>
              </li>
            )}
            {profile?.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span className="whitespace-pre-line">{profile.address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </span>
          <span>Prices and availability are indicative and set by the builders. Please confirm before booking.</span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
