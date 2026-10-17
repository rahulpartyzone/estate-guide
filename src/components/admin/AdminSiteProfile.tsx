import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash2, Upload } from "lucide-react";
import { absolutizeApiUrl } from "@/lib/url";

interface Executive {
  id: string;
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
  sortOrder: number;
}

interface SiteProfile {
  companyName: string;
  reraNumber?: string;
  tagline?: string;
  description?: string;
  aboutHeroImageUrl?: string;
  landingHeroImageUrl?: string;
  projectsHeroImageUrl?: string;
  buildersHeroImageUrl?: string;
  newsHeroImageUrl?: string;
  landingHeroTitlePrefix?: string;
  landingHeroTitleHighlight?: string;
  landingHeroDescription?: string;
  landingHeroStat1Value?: string;
  landingHeroStat1Label?: string;
  landingHeroStat2Value?: string;
  landingHeroStat2Label?: string;
  landingHeroStat3Value?: string;
  landingHeroStat3Label?: string;
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
  headerLogoUrl?: string;
  executives: Executive[];
}

const emptyProfile: SiteProfile = {
  companyName: "",
  reraNumber: "",
  tagline: "",
  description: "",
  aboutHeroImageUrl: "",
  landingHeroImageUrl: "",
  projectsHeroImageUrl: "",
  buildersHeroImageUrl: "",
  newsHeroImageUrl: "",
  landingHeroTitlePrefix: "",
  landingHeroTitleHighlight: "",
  landingHeroDescription: "",
  landingHeroStat1Value: "",
  landingHeroStat1Label: "",
  landingHeroStat2Value: "",
  landingHeroStat2Label: "",
  landingHeroStat3Value: "",
  landingHeroStat3Label: "",
  linkedinUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  googleUrl: "",
  whatsappNumber: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  logoUrl: "",
  headerLogoUrl: "",
  executives: [],
};

const emptyExecutive = { name: "", role: "", bio: "", imageUrl: "", sortOrder: 0 };

const AdminSiteProfile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profile, setProfile] = useState<SiteProfile>(emptyProfile);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExecutiveId, setEditingExecutiveId] = useState<string | null>(null);
  const [executiveForm, setExecutiveForm] = useState<{ name: string; role: string; bio: string; imageUrl: string; sortOrder: number }>(emptyExecutive);
  const [executiveImageFile, setExecutiveImageFile] = useState<File | null>(null);
  const [executiveSaving, setExecutiveSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerLogoFile, setHeaderLogoFile] = useState<File | null>(null);
  const [aboutHeroFile, setAboutHeroFile] = useState<File | null>(null);
  const [landingHeroFile, setLandingHeroFile] = useState<File | null>(null);
  const [projectsHeroFile, setProjectsHeroFile] = useState<File | null>(null);
  const [buildersHeroFile, setBuildersHeroFile] = useState<File | null>(null);
  const [newsHeroFile, setNewsHeroFile] = useState<File | null>(null);
  const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";

  const logoPreviewUrl = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return absolutizeApiUrl(profile.logoUrl || "", rawApiBase);
  }, [logoFile, profile.logoUrl, rawApiBase]);

  const headerLogoPreviewUrl = useMemo(() => {
    if (headerLogoFile) return URL.createObjectURL(headerLogoFile);
    return absolutizeApiUrl(profile.headerLogoUrl || "", rawApiBase);
  }, [headerLogoFile, profile.headerLogoUrl, rawApiBase]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      if (headerLogoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(headerLogoPreviewUrl);
    };
  }, [logoPreviewUrl, headerLogoPreviewUrl]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminSiteProfile();
      if (!data) {
        setProfile(emptyProfile);
        return;
      }
      setProfile({
        companyName: data.companyName || "",
        reraNumber: data.reraNumber || "",
        tagline: data.tagline || "",
        description: data.description || "",
        aboutHeroImageUrl: data.aboutHeroImageUrl || "",
        landingHeroImageUrl: data.landingHeroImageUrl || "",
        projectsHeroImageUrl: data.projectsHeroImageUrl || "",
        buildersHeroImageUrl: data.buildersHeroImageUrl || "",
        newsHeroImageUrl: data.newsHeroImageUrl || "",
        landingHeroTitlePrefix: data.landingHeroTitlePrefix || "",
        landingHeroTitleHighlight: data.landingHeroTitleHighlight || "",
        landingHeroDescription: data.landingHeroDescription || "",
        landingHeroStat1Value: data.landingHeroStat1Value || "",
        landingHeroStat1Label: data.landingHeroStat1Label || "",
        landingHeroStat2Value: data.landingHeroStat2Value || "",
        landingHeroStat2Label: data.landingHeroStat2Label || "",
        landingHeroStat3Value: data.landingHeroStat3Value || "",
        landingHeroStat3Label: data.landingHeroStat3Label || "",
        linkedinUrl: data.linkedinUrl || "",
        facebookUrl: data.facebookUrl || "",
        instagramUrl: data.instagramUrl || "",
        googleUrl: data.googleUrl || "",
        whatsappNumber: data.whatsappNumber || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        address: data.address || "",
        logoUrl: data.logoUrl || "",
        headerLogoUrl: data.headerLogoUrl || "",
        executives: (data.executives || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          bio: e.bio || "",
          imageUrl: e.imageUrl || "",
          sortOrder: e.sortOrder ?? 0,
        })),
      });
    } catch (e: any) {
      toast({ title: "Failed to load company details", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.companyName.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      let finalLogoUrl = profile.logoUrl || undefined;
      let finalHeaderLogoUrl = profile.headerLogoUrl || undefined;
      let finalAboutHeroImageUrl = profile.aboutHeroImageUrl || undefined;
      let finalLandingHeroImageUrl = profile.landingHeroImageUrl || undefined;
      let finalProjectsHeroImageUrl = profile.projectsHeroImageUrl || undefined;
      let finalBuildersHeroImageUrl = profile.buildersHeroImageUrl || undefined;
      let finalNewsHeroImageUrl = profile.newsHeroImageUrl || undefined;
      if (logoFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(logoFile);
        finalLogoUrl = stored.url;
      }
      if (headerLogoFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(headerLogoFile);
        finalHeaderLogoUrl = stored.url;
      }
      if (aboutHeroFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(aboutHeroFile);
        finalAboutHeroImageUrl = stored.url;
      }
      if (landingHeroFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(landingHeroFile);
        finalLandingHeroImageUrl = stored.url;
      }
      if (projectsHeroFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(projectsHeroFile);
        finalProjectsHeroImageUrl = stored.url;
      }
      if (buildersHeroFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(buildersHeroFile);
        finalBuildersHeroImageUrl = stored.url;
      }
      if (newsHeroFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(newsHeroFile);
        finalNewsHeroImageUrl = stored.url;
      }
      const payload = {
        companyName: profile.companyName.trim(),
        reraNumber: profile.reraNumber?.trim() || undefined,
        tagline: profile.tagline?.trim() || undefined,
        description: profile.description?.trim() || undefined,
        aboutHeroImageUrl: finalAboutHeroImageUrl,
        landingHeroImageUrl: finalLandingHeroImageUrl,
        projectsHeroImageUrl: finalProjectsHeroImageUrl,
        buildersHeroImageUrl: finalBuildersHeroImageUrl,
        newsHeroImageUrl: finalNewsHeroImageUrl,
        landingHeroTitlePrefix: profile.landingHeroTitlePrefix?.trim() || undefined,
        landingHeroTitleHighlight: profile.landingHeroTitleHighlight?.trim() || undefined,
        landingHeroDescription: profile.landingHeroDescription?.trim() || undefined,
        landingHeroStat1Value: profile.landingHeroStat1Value?.trim() || undefined,
        landingHeroStat1Label: profile.landingHeroStat1Label?.trim() || undefined,
        landingHeroStat2Value: profile.landingHeroStat2Value?.trim() || undefined,
        landingHeroStat2Label: profile.landingHeroStat2Label?.trim() || undefined,
        landingHeroStat3Value: profile.landingHeroStat3Value?.trim() || undefined,
        landingHeroStat3Label: profile.landingHeroStat3Label?.trim() || undefined,
        linkedinUrl: profile.linkedinUrl?.trim() || undefined,
        facebookUrl: profile.facebookUrl?.trim() || undefined,
        instagramUrl: profile.instagramUrl?.trim() || undefined,
        googleUrl: profile.googleUrl?.trim() || undefined,
        whatsappNumber: profile.whatsappNumber?.trim() || undefined,
        phone: profile.phone?.trim() || undefined,
        email: profile.email?.trim() || undefined,
        website: profile.website?.trim() || undefined,
        address: profile.address?.trim() || undefined,
        logoUrl: finalLogoUrl,
        headerLogoUrl: finalHeaderLogoUrl,
      };
      const saved = await api.upsertAdminSiteProfile(payload);
      setProfile((prev) => ({
        ...prev,
        reraNumber: saved.reraNumber || "",
        logoUrl: saved.logoUrl || "",
        headerLogoUrl: saved.headerLogoUrl || "",
        aboutHeroImageUrl: saved.aboutHeroImageUrl || "",
        landingHeroImageUrl: saved.landingHeroImageUrl || "",
        projectsHeroImageUrl: saved.projectsHeroImageUrl || "",
        buildersHeroImageUrl: saved.buildersHeroImageUrl || "",
        newsHeroImageUrl: saved.newsHeroImageUrl || "",
        landingHeroTitlePrefix: saved.landingHeroTitlePrefix || "",
        landingHeroTitleHighlight: saved.landingHeroTitleHighlight || "",
        landingHeroDescription: saved.landingHeroDescription || "",
        landingHeroStat1Value: saved.landingHeroStat1Value || "",
        landingHeroStat1Label: saved.landingHeroStat1Label || "",
        landingHeroStat2Value: saved.landingHeroStat2Value || "",
        landingHeroStat2Label: saved.landingHeroStat2Label || "",
        landingHeroStat3Value: saved.landingHeroStat3Value || "",
        landingHeroStat3Label: saved.landingHeroStat3Label || "",
        linkedinUrl: saved.linkedinUrl || "",
        facebookUrl: saved.facebookUrl || "",
        instagramUrl: saved.instagramUrl || "",
        googleUrl: saved.googleUrl || "",
        whatsappNumber: saved.whatsappNumber || "",
        phone: saved.phone || "",
        email: saved.email || "",
        website: saved.website || "",
        address: saved.address || "",
        tagline: saved.tagline || "",
        description: saved.description || "",
        companyName: saved.companyName || prev.companyName,
        executives: (saved.executives || prev.executives).map((x: any) => ({
          id: x.id,
          name: x.name,
          role: x.role,
          bio: x.bio || "",
          imageUrl: x.imageUrl || "",
          sortOrder: x.sortOrder ?? 0,
        })),
      }));
      setLogoFile(null);
      setHeaderLogoFile(null);
      setAboutHeroFile(null);
      setLandingHeroFile(null);
      setProjectsHeroFile(null);
      setBuildersHeroFile(null);
      setNewsHeroFile(null);
      toast({ title: "Company profile saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const openCreateExecutive = () => {
    setEditingExecutiveId(null);
    setExecutiveForm(emptyExecutive);
    setExecutiveImageFile(null);
    setIsDialogOpen(true);
  };

  const openEditExecutive = (executive: Executive) => {
    setEditingExecutiveId(executive.id);
    setExecutiveForm({
      name: executive.name,
      role: executive.role,
      bio: executive.bio || "",
      imageUrl: executive.imageUrl || "",
      sortOrder: executive.sortOrder ?? 0,
    });
    setExecutiveImageFile(null);
    setIsDialogOpen(true);
  };

  const saveExecutive = async (e: FormEvent) => {
    e.preventDefault();
    if (!executiveForm.name.trim() || !executiveForm.role.trim()) {
      toast({ title: "Name and role are required", variant: "destructive" });
      return;
    }
    setExecutiveSaving(true);
    try {
      let finalImageUrl = executiveForm.imageUrl || undefined;
      if (executiveImageFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(executiveImageFile);
        finalImageUrl = stored.url;
      }
      const payload = {
        name: executiveForm.name.trim(),
        role: executiveForm.role.trim(),
        bio: executiveForm.bio?.trim() || undefined,
        imageUrl: finalImageUrl,
        sortOrder: Number(executiveForm.sortOrder) || 0,
      };

      if (editingExecutiveId) {
        await api.updateExecutive(editingExecutiveId, payload);
        toast({ title: "Executive updated" });
      } else {
        await api.createExecutive(payload);
        toast({ title: "Executive added" });
      }

      setIsDialogOpen(false);
      setEditingExecutiveId(null);
      setExecutiveForm(emptyExecutive);
      setExecutiveImageFile(null);
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setExecutiveSaving(false);
    }
  };

  const removeExecutive = async (id: string) => {
    if (!confirm("Delete this executive?")) return;
    try {
      await api.deleteExecutive(id);
      setProfile((prev) => ({ ...prev, executives: prev.executives.filter((e) => e.id !== id) }));
      toast({ title: "Executive removed" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={profile.companyName}
                  onChange={(event) => setProfile((prev) => ({ ...prev, companyName: event.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={profile.tagline || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, tagline: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reraNumber">Company RERA Number</Label>
              <Input
                id="reraNumber"
                value={profile.reraNumber || ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, reraNumber: event.target.value }))}
                placeholder="e.g., PRM/KA/RERA/1251/309/PR/220223/005731"
              />
            </div>

            <div>
              <Label htmlFor="description">About Description</Label>
              <Textarea
                id="description"
                value={profile.description || ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                  id="whatsappNumber"
                  value={profile.whatsappNumber || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                  placeholder="e.g., +91 9876543210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={profile.website || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  value={profile.linkedinUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
                  placeholder="https://www.linkedin.com/company/..."
                />
              </div>
              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  value={profile.facebookUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, facebookUrl: event.target.value }))}
                  placeholder="https://www.facebook.com/..."
                />
              </div>
              <div>
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input
                  id="instagramUrl"
                  type="url"
                  value={profile.instagramUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, instagramUrl: event.target.value }))}
                  placeholder="https://www.instagram.com/..."
                />
              </div>
              <div>
                <Label htmlFor="googleUrl">Google URL</Label>
                <Input
                  id="googleUrl"
                  type="url"
                  value={profile.googleUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, googleUrl: event.target.value }))}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="logoUrl">Logo (Recommended: 400×400 px)</Label>
                <div className="space-y-2">
                  {logoPreviewUrl && (
                    <div className="inline-flex items-center justify-center rounded border bg-background p-2">
                      <img src={logoPreviewUrl} alt="Company logo preview" className="h-14 w-auto max-w-[220px] object-contain" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                      <Upload className="h-4 w-4" /> {logoFile ? "Replace Logo" : profile.logoUrl ? "Replace Logo" : "Upload Logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                    </label>
                    {logoFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{logoFile.name}</span>}
                    {!logoFile && profile.logoUrl && <span className="text-xs text-green-600">Existing</span>}
                    {(logoFile || profile.logoUrl) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLogoFile(null);
                          setProfile((prev) => ({ ...prev, logoUrl: "" }));
                        }}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                  <Input
                    id="logoUrl"
                    type="text"
                    value={profile.logoUrl || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, logoUrl: event.target.value }))}
                    placeholder="Or paste logo URL"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="headerLogoUrl">Header Logo (Recommended: 320×80 px)</Label>
                <div className="space-y-2">
                  {headerLogoPreviewUrl && (
                    <div className="inline-flex items-center justify-center rounded border bg-background p-2">
                      <img src={headerLogoPreviewUrl} alt="Header logo preview" className="h-14 w-auto max-w-[260px] object-contain" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                      <Upload className="h-4 w-4" /> {headerLogoFile ? "Replace Header Logo" : profile.headerLogoUrl ? "Replace Header Logo" : "Upload Header Logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => setHeaderLogoFile(event.target.files?.[0] || null)} />
                    </label>
                    {headerLogoFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{headerLogoFile.name}</span>}
                    {!headerLogoFile && profile.headerLogoUrl && <span className="text-xs text-green-600">Existing</span>}
                    {(headerLogoFile || profile.headerLogoUrl) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHeaderLogoFile(null);
                          setProfile((prev) => ({ ...prev, headerLogoUrl: "" }));
                        }}
                      >
                        Remove Header Logo
                      </Button>
                    )}
                  </div>
                  <Input
                    id="headerLogoUrl"
                    type="text"
                    value={profile.headerLogoUrl || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, headerLogoUrl: event.target.value }))}
                    placeholder="Or paste header logo URL"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="aboutHeroImageUrl">About Page Hero Image (Recommended: 1920×900 px)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <Upload className="h-4 w-4" /> {aboutHeroFile ? "Replace About Hero" : profile.aboutHeroImageUrl ? "Replace About Hero" : "Upload About Hero"}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setAboutHeroFile(event.target.files?.[0] || null)} />
                  </label>
                  {aboutHeroFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{aboutHeroFile.name}</span>}
                  {!aboutHeroFile && profile.aboutHeroImageUrl && <span className="text-xs text-green-600">Existing</span>}
                </div>
                <Input
                  id="aboutHeroImageUrl"
                  type="text"
                  value={profile.aboutHeroImageUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, aboutHeroImageUrl: event.target.value }))}
                  placeholder="Or paste about hero image URL"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="landingHeroImageUrl">Landing Page Hero Image (Recommended: 1920×1080 px)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <Upload className="h-4 w-4" /> {landingHeroFile ? "Replace Landing Hero" : profile.landingHeroImageUrl ? "Replace Landing Hero" : "Upload Landing Hero"}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setLandingHeroFile(event.target.files?.[0] || null)} />
                  </label>
                  {landingHeroFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{landingHeroFile.name}</span>}
                  {!landingHeroFile && profile.landingHeroImageUrl && <span className="text-xs text-green-600">Existing</span>}
                </div>
                <Input
                  id="landingHeroImageUrl"
                  type="text"
                  value={profile.landingHeroImageUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroImageUrl: event.target.value }))}
                  placeholder="Or paste landing hero image URL"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="projectsHeroImageUrl">Projects Page Header Image (Recommended: 1920×900 px)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <Upload className="h-4 w-4" /> {projectsHeroFile ? "Replace Projects Header" : profile.projectsHeroImageUrl ? "Replace Projects Header" : "Upload Projects Header"}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setProjectsHeroFile(event.target.files?.[0] || null)} />
                  </label>
                  {projectsHeroFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{projectsHeroFile.name}</span>}
                  {!projectsHeroFile && profile.projectsHeroImageUrl && <span className="text-xs text-green-600">Existing</span>}
                </div>
                <Input
                  id="projectsHeroImageUrl"
                  type="text"
                  value={profile.projectsHeroImageUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, projectsHeroImageUrl: event.target.value }))}
                  placeholder="Or paste projects header image URL"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="buildersHeroImageUrl">Builders Page Header Image (Recommended: 1920×900 px)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <Upload className="h-4 w-4" /> {buildersHeroFile ? "Replace Builders Header" : profile.buildersHeroImageUrl ? "Replace Builders Header" : "Upload Builders Header"}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setBuildersHeroFile(event.target.files?.[0] || null)} />
                  </label>
                  {buildersHeroFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{buildersHeroFile.name}</span>}
                  {!buildersHeroFile && profile.buildersHeroImageUrl && <span className="text-xs text-green-600">Existing</span>}
                </div>
                <Input
                  id="buildersHeroImageUrl"
                  type="text"
                  value={profile.buildersHeroImageUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, buildersHeroImageUrl: event.target.value }))}
                  placeholder="Or paste builders header image URL"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="newsHeroImageUrl">News Page Header Image (Recommended: 1920×900 px)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <Upload className="h-4 w-4" /> {newsHeroFile ? "Replace News Header" : profile.newsHeroImageUrl ? "Replace News Header" : "Upload News Header"}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setNewsHeroFile(event.target.files?.[0] || null)} />
                  </label>
                  {newsHeroFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{newsHeroFile.name}</span>}
                  {!newsHeroFile && profile.newsHeroImageUrl && <span className="text-xs text-green-600">Existing</span>}
                </div>
                <Input
                  id="newsHeroImageUrl"
                  type="text"
                  value={profile.newsHeroImageUrl || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, newsHeroImageUrl: event.target.value }))}
                  placeholder="Or paste news header image URL"
                />
              </div>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              <div className="text-sm font-medium">Landing Hero Content</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="landingHeroTitlePrefix">Hero Title - Line 1</Label>
                  <Input
                    id="landingHeroTitlePrefix"
                    value={profile.landingHeroTitlePrefix || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroTitlePrefix: event.target.value }))}
                    placeholder="Find Your"
                  />
                </div>
                <div>
                  <Label htmlFor="landingHeroTitleHighlight">Hero Title - Highlight Line</Label>
                  <Input
                    id="landingHeroTitleHighlight"
                    value={profile.landingHeroTitleHighlight || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroTitleHighlight: event.target.value }))}
                    placeholder="Dream Home"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="landingHeroDescription">Hero Description</Label>
                <Textarea
                  id="landingHeroDescription"
                  value={profile.landingHeroDescription || ""}
                  onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroDescription: event.target.value }))}
                  placeholder="Discover premium properties with modern amenities and prime locations..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="landingHeroStat1Value">Stat 1 Value</Label>
                  <Input
                    id="landingHeroStat1Value"
                    value={profile.landingHeroStat1Value || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat1Value: event.target.value }))}
                    placeholder="50+"
                  />
                  <Input
                    id="landingHeroStat1Label"
                    value={profile.landingHeroStat1Label || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat1Label: event.target.value }))}
                    placeholder="Premium Projects"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingHeroStat2Value">Stat 2 Value</Label>
                  <Input
                    id="landingHeroStat2Value"
                    value={profile.landingHeroStat2Value || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat2Value: event.target.value }))}
                    placeholder="1000+"
                  />
                  <Input
                    id="landingHeroStat2Label"
                    value={profile.landingHeroStat2Label || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat2Label: event.target.value }))}
                    placeholder="Happy Families"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingHeroStat3Value">Stat 3 Value</Label>
                  <Input
                    id="landingHeroStat3Value"
                    value={profile.landingHeroStat3Value || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat3Value: event.target.value }))}
                    placeholder="25+"
                  />
                  <Input
                    id="landingHeroStat3Label"
                    value={profile.landingHeroStat3Label || ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat3Label: event.target.value }))}
                    placeholder="Prime Locations"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={profile.address || ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>

            <Button type="submit" disabled={savingProfile || loading}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Company Details"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Executives ({profile.executives.length})</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateExecutive} className="gap-2" disabled={!profile.companyName.trim()}>
                <Plus className="h-4 w-4" /> Add Executive
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExecutiveId ? "Edit Executive" : "Add Executive"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={saveExecutive} className="space-y-4">
                <div>
                  <Label htmlFor="execName">Name</Label>
                  <Input
                    id="execName"
                    value={executiveForm.name}
                    onChange={(event) => setExecutiveForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="execRole">Role</Label>
                  <Input
                    id="execRole"
                    value={executiveForm.role}
                    onChange={(event) => setExecutiveForm((prev) => ({ ...prev, role: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="execBio">Bio</Label>
                  <Textarea
                    id="execBio"
                    value={executiveForm.bio}
                    onChange={(event) => setExecutiveForm((prev) => ({ ...prev, bio: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="execImage">Photo (Recommended: 600×600 px)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                        <Upload className="h-4 w-4" /> {executiveImageFile ? "Replace Photo" : executiveForm.imageUrl ? "Replace Photo" : "Upload Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => setExecutiveImageFile(event.target.files?.[0] || null)} />
                      </label>
                      {executiveImageFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{executiveImageFile.name}</span>}
                      {!executiveImageFile && executiveForm.imageUrl && <span className="text-xs text-green-600">Existing</span>}
                    </div>
                    <Input
                      id="execImage"
                      type="text"
                      value={executiveForm.imageUrl}
                      onChange={(event) => setExecutiveForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="Or paste photo URL"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="execSortOrder">Sort Order</Label>
                  <Input
                    id="execSortOrder"
                    type="number"
                    min={0}
                    value={executiveForm.sortOrder}
                    onChange={(event) => setExecutiveForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={executiveSaving}>
                  {executiveSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingExecutiveId ? "Update Executive" : "Create Executive"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!profile.companyName.trim() && <p className="text-sm text-muted-foreground mb-4">Save company details first to add executives.</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.executives.map((executive) => (
                <TableRow key={executive.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {executive.imageUrl && <img src={executive.imageUrl} alt={executive.name} className="h-8 w-8 rounded object-cover" />}
                      <div>
                        <div className="font-medium">{executive.name}</div>
                        {executive.bio && <div className="text-xs text-muted-foreground line-clamp-1">{executive.bio}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{executive.role}</TableCell>
                  <TableCell>{executive.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditExecutive(executive)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeExecutive(executive.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!profile.executives.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No executives added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSiteProfile;
