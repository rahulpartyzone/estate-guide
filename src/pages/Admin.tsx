import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AdminProjects from "@/components/admin/AdminProjects";
import AdminTestimonials from "@/components/admin/AdminTestimonials";
import AdminBuilders from "@/components/admin/AdminBuilders";
import AdminSubscribers from "@/components/admin/AdminSubscribers";
import AdminLeads from "@/components/admin/AdminLeads";
import AdminAmenities from "@/components/admin/AdminAmenities";
import { useMemo } from "react";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false); // ensures access token present before rendering admin content
  const [email, setEmail] = useState("admin@local");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

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
        }
      } catch {}
      setAuthReady(true);
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { accessToken } = await api.login(email, password);
      if (accessToken) {
        // api.login already persisted it, but we explicitly mark auth state here
        setIsAuthenticated(true);
        setAuthReady(true);
        toast({ title: 'Login Successful', description: 'Welcome to the admin dashboard!' });
      } else {
        // Fallback: try me endpoint to confirm
        try {
          await api.me();
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
        setEmail('admin@local');
        setPassword('');
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Admin Login
            </CardTitle>
            <p className="text-muted-foreground">
              Sign in to access the admin dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@local"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary">
                Sign In
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Demo credentials: admin@local / admin123
              </p>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="builders">Builders</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <AdminProjects />
          </TabsContent>

          <TabsContent value="testimonials">
            <AdminTestimonials />
          </TabsContent>

          <TabsContent value="builders">
            <AdminBuilders />
          </TabsContent>

          <TabsContent value="subscribers">
            <AdminSubscribers />
          </TabsContent>

          <TabsContent value="leads">
            <AdminLeads />
          </TabsContent>

          <TabsContent value="amenities">
            <AdminAmenities />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;