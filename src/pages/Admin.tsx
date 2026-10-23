import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AdminProjects from "@/components/admin/AdminProjects";
import AdminTestimonials from "@/components/admin/AdminTestimonials";
import AdminBuilders from "@/components/admin/AdminBuilders";
import AdminSubscribers from "@/components/admin/AdminSubscribers";
import AdminLeads from "@/components/admin/AdminLeads";
import AdminAmenities from "@/components/admin/AdminAmenities";
import AdminCompany from "@/components/admin/AdminCompany";
import AdminNews from "@/components/admin/AdminNews";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminRoles from "@/components/admin/AdminRoles";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminChangePassword from "@/components/admin/AdminChangePassword";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminAnalyticsSettings from "@/components/admin/AdminAnalyticsSettings";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false); // ensures access token present before rendering admin content
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [allowedMenuKeys, setAllowedMenuKeys] = useState<Set<string> | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [loginLogoUrl, setLoginLogoUrl] = useState("");
  const { toast } = useToast();

  const userIdentity = currentUserEmail || email;
  const userInitials = userIdentity
    .split("@")[0]
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("") || "U";
  const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";

  const loadCurrentAdminUser = async () => {
    try {
      const me = await api.getAdminMe();
      setCurrentUserEmail(me?.email || "");
      setCurrentUserRoles(Array.isArray(me?.roles) ? me.roles : []);
    } catch {
      setCurrentUserEmail("");
      setCurrentUserRoles([]);
    }
  };

  const menuGroups = [
    {
      title: "Overview",
      items: [{ key: "dashboard", label: "Dashboard" }],
    },
    {
      title: "Operations",
      items: [
        { key: "projects", label: "Projects" },
        { key: "builders", label: "Builders" },
      ],
    },
    {
      title: "Content",
      items: [
        { key: "news", label: "News" },
        { key: "company", label: "Company" },
        { key: "testimonials", label: "Testimonials" },
      ],
    },
    {
      title: "Engagement",
      items: [
        { key: "leads", label: "Leads" },
        { key: "subscribers", label: "Subscribers" },
      ],
    },
    {
      title: "Access Control",
      items: [
        { key: "users", label: "Users" },
        { key: "roles", label: "Roles" },
        { key: "change-password", label: "Change Password" },
      ],
    },
    {
      title: "System",
      items: [
        { key: "settings", label: "Settings" },
        { key: "amenities", label: "Amenities" },
      ],
    },
  ];

  const filteredMenuGroups = allowedMenuKeys
    ? menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => allowedMenuKeys.has(item.key)),
        }))
        .filter((group) => group.items.length > 0)
    : [];

  const firstAllowedMenu = filteredMenuGroups[0]?.items[0]?.key;

  useEffect(() => {
    if (!allowedMenuKeys || !firstAllowedMenu) return;
    if (!allowedMenuKeys.has(activeMenu)) {
      setActiveMenu(firstAllowedMenu);
    }
  }, [allowedMenuKeys, activeMenu, firstAllowedMenu]);

  const renderActiveModule = () => {
    switch (activeMenu) {
      case "dashboard":
        return <AdminDashboard />;
      case "projects":
        return <AdminProjects />;
      case "builders":
        return <AdminBuilders />;
      case "news":
        return <AdminNews />;
      case "company":
        return <AdminCompany />;
      case "testimonials":
        return <AdminTestimonials />;
      case "leads":
        return <AdminLeads />;
      case "subscribers":
        return <AdminSubscribers />;
      case "users":
        return <AdminUsers />;
      case "roles":
        return <AdminRoles />;
      case "change-password":
        return <AdminChangePassword />;
      case "amenities":
        return <AdminAmenities />;
      case "settings":
        return (
          <>
            <AdminSettings />
            <AdminAnalyticsSettings />
          </>
        );
      default:
        return <AdminProjects />;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const profile = await api.getSiteProfile();
        setLoginLogoUrl(absolutizeApiUrl(profile?.headerLogoUrl || profile?.logoUrl || "", rawApiBase));
      } catch {
        setLoginLogoUrl("");
      }
    })();
  }, []);

  useEffect(() => {
    // Session restore: check auth and ensure access token is hydrated if only cookies exist
    (async () => {
      try {
        const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1');
        const res = await fetch(base + '/auth/me', { credentials: 'include' });
        if (res.ok) {
          setIsAuthenticated(true);
          // If no access token yet (direct page load), force ensureAdmin to fetch one via refresh
          if (!sessionStorage.getItem('accessToken')) {
            try { await api.ensureAdmin?.(); } catch {}
          }
          await loadCurrentAdminUser();
        }
      } catch {}
      setAuthReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !authReady) return;

    let cancelled = false;
    (async () => {
      setMenuLoading(true);
      try {
        const menu = await api.getAdminMenu();
        const keys = new Set((menu || []).map((item: any) => item.key).filter(Boolean));
        if (cancelled) return;
        setAllowedMenuKeys(keys);
        setActiveMenu((current) => (keys.has(current) ? current : Array.from(keys)[0] || current));
      } catch (error: any) {
        if (cancelled) return;
        toast({
          title: "Failed to load menu access",
          description: error?.message || "Some admin sections may be unavailable.",
          variant: "destructive",
        });
        setAllowedMenuKeys(new Set());
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authReady]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { accessToken } = await api.login(email, password);
      if (accessToken) {
        // api.login already persisted it, but we explicitly mark auth state here
        await loadCurrentAdminUser();
        setIsAuthenticated(true);
        setAuthReady(true);
        toast({ title: 'Login Successful', description: 'Welcome to the admin dashboard!' });
      } else {
        // Fallback: try me endpoint to confirm
        try {
          await api.me();
          await loadCurrentAdminUser();
          setIsAuthenticated(true);
          setAuthReady(true);
          toast({ title: 'Login Successful', description: 'Welcome to the admin dashboard!' });
        } catch {
          toast({ title: 'Login Failed', description: 'Invalid credentials.', variant: 'destructive' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Login Error', description: err.message || 'Network error', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    fetch((import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1') + '/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(() => {
        setIsAuthenticated(false);
        setEmail('admin@local.com');
        setPassword('');
        setCurrentUserEmail('');
        setCurrentUserRoles([]);
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      });
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(hsl(var(--primary)/0.2)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <Card className="relative w-full max-w-md border-primary/20 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="mx-auto h-16 flex items-center justify-center text-primary text-sm font-semibold">
              {loginLogoUrl ? (
                <img src={loginLogoUrl} alt="Brand logo" className="h-14 w-auto max-w-[220px] object-contain" />
              ) : (
                "EG"
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Admin Login</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in to access the admin dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@local.com"
                  required
                  className="bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="bg-background/80"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Preparing dashboard...</div>
    );
  }

  if (menuLoading || allowedMenuKeys === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading menu access...</div>
    );
  }

  if (allowedMenuKeys.size === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">No admin menu access assigned to this user.</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center border">
              {userInitials}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{userIdentity}</p>
              {currentUserRoles.length > 0 ? (
                <p className="text-xs text-muted-foreground">{currentUserRoles.join(", ")}</p>
              ) : null}
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredMenuGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{group.title}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = activeMenu === item.key;
                      return (
                        <Button
                          key={item.key}
                          type="button"
                          variant={isActive ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => setActiveMenu(item.key)}
                        >
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="min-w-0">
            {renderActiveModule()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;