import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [companyName, setCompanyName] = useState("YourHomeSearch");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await api.getSiteProfile();
        if (cancelled) return;
        const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";
        const hasCompany = Boolean(profile?.companyName || profile?.description || profile?.tagline || profile?.logoUrl || profile?.headerLogoUrl);
        const hasExecutives = Array.isArray(profile?.executives) && profile.executives.length > 0;
        setLogoUrl(absolutizeApiUrl(profile?.headerLogoUrl || profile?.logoUrl, rawApiBase));
        setCompanyName((profile?.companyName || "YourHomeSearch").trim() || "YourHomeSearch");
        setShowAbout(hasCompany || hasExecutives);
      } catch {
        if (!cancelled) {
          setShowAbout(false);
          setLogoUrl("");
          setCompanyName("YourHomeSearch");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigation = useMemo(() => {
    const links = [
      { name: "Projects", href: "/projects" },
      { name: "Builders", href: "/builders" },
      { name: "News", href: "/news" },
    ];
    if (showAbout) links.push({ name: "About", href: "/about" });
    return links;
  }, [showAbout]);

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-10 w-auto max-w-[220px] object-contain" />
            ) : (
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">{companyName}</span>
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
