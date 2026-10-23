import { Link } from "react-router-dom";
import { useSavedIds } from "@/lib/saved";
import { Button } from "@/components/ui/button";
import { Building2, Heart, LogOut, Menu, UserRound, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutBuyer, openBuyerLogin, useBuyerState } from "@/lib/buyer";
import { formatPhone } from "@/lib/otpWidget";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [companyName, setCompanyName] = useState("YourHomeSearch");
  const savedCount = useSavedIds().length;
  const { buyer, loaded: buyerLoaded } = useBuyerState();
  const signOut = async () => {
    await logoutBuyer();
    setIsMobileMenuOpen(false);
    toast.success("Signed out");
  };

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
    if (savedCount > 0) links.push({ name: `Saved (${savedCount})`, href: "/saved" });
    return links;
  }, [showAbout, savedCount]);

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
            {buyerLoaded && !buyer && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => openBuyerLogin()}>
                <UserRound className="h-4 w-4" /> Sign in
              </Button>
            )}
            {buyer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserRound className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">{buyer.name?.split(" ")[0] || "My account"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="font-medium">{buyer.name || "Signed in"}</div>
                    <div className="text-xs text-muted-foreground">{formatPhone(buyer.phone)}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/saved" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" /> Saved projects{savedCount ? ` (${savedCount})` : ""}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
              <div className="border-t border-border pt-2 mt-2">
                {buyerLoaded && !buyer && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-primary"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openBuyerLogin();
                    }}
                  >
                    <UserRound className="h-4 w-4" /> Sign in
                  </button>
                )}
                {buyer && (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <div className="font-medium text-foreground">{buyer.name || "Signed in"}</div>
                      <div className="text-muted-foreground">{formatPhone(buyer.phone)}</div>
                    </div>
                    <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:text-foreground" onClick={signOut}>
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
