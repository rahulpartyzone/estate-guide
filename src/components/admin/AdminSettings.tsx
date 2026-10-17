import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { absolutizeApiUrl } from "@/lib/url";

interface SettingsProfile {
  companyName: string;
  headerLogoUrl?: string;
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
}

const emptyProfile: SettingsProfile = {
  companyName: "",
  headerLogoUrl: "",
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
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SettingsProfile>(emptyProfile);

  const [headerLogoFile, setHeaderLogoFile] = useState<File | null>(null);
  const [aboutHeroFile, setAboutHeroFile] = useState<File | null>(null);
  const [landingHeroFile, setLandingHeroFile] = useState<File | null>(null);
  const [projectsHeroFile, setProjectsHeroFile] = useState<File | null>(null);
  const [buildersHeroFile, setBuildersHeroFile] = useState<File | null>(null);
  const [newsHeroFile, setNewsHeroFile] = useState<File | null>(null);

  const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";

  const headerLogoPreviewUrl = useMemo(() => {
    if (headerLogoFile) return URL.createObjectURL(headerLogoFile);
    return absolutizeApiUrl(profile.headerLogoUrl || "", rawApiBase);
  }, [headerLogoFile, profile.headerLogoUrl, rawApiBase]);

  useEffect(() => {
    return () => {
      if (headerLogoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(headerLogoPreviewUrl);
    };
  }, [headerLogoPreviewUrl]);

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
        headerLogoUrl: data.headerLogoUrl || "",
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
      });
    } catch (e: any) {
      toast({ title: "Failed to load settings", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalHeaderLogoUrl = profile.headerLogoUrl || undefined;
      let finalAboutHeroImageUrl = profile.aboutHeroImageUrl || undefined;
      let finalLandingHeroImageUrl = profile.landingHeroImageUrl || undefined;
      let finalProjectsHeroImageUrl = profile.projectsHeroImageUrl || undefined;
      let finalBuildersHeroImageUrl = profile.buildersHeroImageUrl || undefined;
      let finalNewsHeroImageUrl = profile.newsHeroImageUrl || undefined;

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

      await api.upsertAdminSiteProfile({
        companyName: profile.companyName?.trim() || undefined,
        headerLogoUrl: finalHeaderLogoUrl,
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
      });

      setHeaderLogoFile(null);
      setAboutHeroFile(null);
      setLandingHeroFile(null);
      setProjectsHeroFile(null);
      setBuildersHeroFile(null);
      setNewsHeroFile(null);
      await load();
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings · Branding & Hero</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveSettings} className="space-y-5">
          <div>
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
              </div>
              <Input id="headerLogoUrl" value={profile.headerLogoUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, headerLogoUrl: event.target.value }))} placeholder="Or paste header logo URL" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aboutHeroImageUrl">About Hero Image</Label>
              <div className="space-y-2">
                <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                  <Upload className="h-4 w-4" /> {aboutHeroFile ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setAboutHeroFile(event.target.files?.[0] || null)} />
                </label>
                <Input id="aboutHeroImageUrl" value={profile.aboutHeroImageUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, aboutHeroImageUrl: event.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="landingHeroImageUrl">Landing Hero Image</Label>
              <div className="space-y-2">
                <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                  <Upload className="h-4 w-4" /> {landingHeroFile ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setLandingHeroFile(event.target.files?.[0] || null)} />
                </label>
                <Input id="landingHeroImageUrl" value={profile.landingHeroImageUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroImageUrl: event.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="projectsHeroImageUrl">Projects Hero Image</Label>
              <div className="space-y-2">
                <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                  <Upload className="h-4 w-4" /> {projectsHeroFile ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setProjectsHeroFile(event.target.files?.[0] || null)} />
                </label>
                <Input id="projectsHeroImageUrl" value={profile.projectsHeroImageUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, projectsHeroImageUrl: event.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="buildersHeroImageUrl">Builders Hero Image</Label>
              <div className="space-y-2">
                <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                  <Upload className="h-4 w-4" /> {buildersHeroFile ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setBuildersHeroFile(event.target.files?.[0] || null)} />
                </label>
                <Input id="buildersHeroImageUrl" value={profile.buildersHeroImageUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, buildersHeroImageUrl: event.target.value }))} />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="newsHeroImageUrl">News Hero Image</Label>
              <div className="space-y-2">
                <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                  <Upload className="h-4 w-4" /> {newsHeroFile ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setNewsHeroFile(event.target.files?.[0] || null)} />
                </label>
                <Input id="newsHeroImageUrl" value={profile.newsHeroImageUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, newsHeroImageUrl: event.target.value }))} />
              </div>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <div className="text-sm font-medium">Landing Hero Content</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="landingHeroTitlePrefix">Hero Title - Line 1</Label>
                <Input id="landingHeroTitlePrefix" value={profile.landingHeroTitlePrefix || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroTitlePrefix: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="landingHeroTitleHighlight">Hero Title - Highlight Line</Label>
                <Input id="landingHeroTitleHighlight" value={profile.landingHeroTitleHighlight || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroTitleHighlight: event.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="landingHeroDescription">Hero Description</Label>
              <Textarea id="landingHeroDescription" value={profile.landingHeroDescription || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroDescription: event.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="landingHeroStat1Value">Stat 1</Label>
                <Input id="landingHeroStat1Value" value={profile.landingHeroStat1Value || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat1Value: event.target.value }))} placeholder="Value" />
                <Input id="landingHeroStat1Label" value={profile.landingHeroStat1Label || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat1Label: event.target.value }))} placeholder="Label" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landingHeroStat2Value">Stat 2</Label>
                <Input id="landingHeroStat2Value" value={profile.landingHeroStat2Value || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat2Value: event.target.value }))} placeholder="Value" />
                <Input id="landingHeroStat2Label" value={profile.landingHeroStat2Label || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat2Label: event.target.value }))} placeholder="Label" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landingHeroStat3Value">Stat 3</Label>
                <Input id="landingHeroStat3Value" value={profile.landingHeroStat3Value || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat3Value: event.target.value }))} placeholder="Value" />
                <Input id="landingHeroStat3Label" value={profile.landingHeroStat3Label || ""} onChange={(event) => setProfile((prev) => ({ ...prev, landingHeroStat3Label: event.target.value }))} placeholder="Label" />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminSettings;
