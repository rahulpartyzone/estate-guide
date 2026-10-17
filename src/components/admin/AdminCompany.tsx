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
  description?: string;
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
  executives: Executive[];
}

const emptyProfile: SiteProfile = {
  companyName: "",
  reraNumber: "",
  description: "",
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
  executives: [],
};

const emptyExecutive = { name: "", role: "", bio: "", imageUrl: "", sortOrder: 0 };

const AdminCompany = () => {
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
  const rawApiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";

  const logoPreviewUrl = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return absolutizeApiUrl(profile.logoUrl || "", rawApiBase);
  }, [logoFile, profile.logoUrl, rawApiBase]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

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
        description: data.description || "",
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
      if (logoFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(logoFile);
        finalLogoUrl = stored.url;
      }

      await api.upsertAdminSiteProfile({
        companyName: profile.companyName.trim(),
        reraNumber: profile.reraNumber?.trim() || undefined,
        description: profile.description?.trim() || undefined,
        phone: profile.phone?.trim() || undefined,
        whatsappNumber: profile.whatsappNumber?.trim() || undefined,
        email: profile.email?.trim() || undefined,
        website: profile.website?.trim() || undefined,
        address: profile.address?.trim() || undefined,
        linkedinUrl: profile.linkedinUrl?.trim() || undefined,
        facebookUrl: profile.facebookUrl?.trim() || undefined,
        instagramUrl: profile.instagramUrl?.trim() || undefined,
        googleUrl: profile.googleUrl?.trim() || undefined,
        logoUrl: finalLogoUrl,
      });

      setLogoFile(null);
      await load();
      toast({ title: "Company details saved" });
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
      setProfile((prev) => ({ ...prev, executives: prev.executives.filter((item) => item.id !== id) }));
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
                <Input id="companyName" value={profile.companyName} onChange={(event) => setProfile((prev) => ({ ...prev, companyName: event.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="reraNumber">Company RERA Number</Label>
                <Input id="reraNumber" value={profile.reraNumber || ""} onChange={(event) => setProfile((prev) => ({ ...prev, reraNumber: event.target.value }))} />
              </div>
            </div>

            <div>
              <Label htmlFor="description">About</Label>
              <Textarea id="description" value={profile.description || ""} onChange={(event) => setProfile((prev) => ({ ...prev, description: event.target.value }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Contact Number</Label>
                <Input id="phone" value={profile.phone || ""} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input id="whatsappNumber" value={profile.whatsappNumber || ""} onChange={(event) => setProfile((prev) => ({ ...prev, whatsappNumber: event.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email || ""} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input id="website" type="url" value={profile.website || ""} onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input id="linkedinUrl" type="url" value={profile.linkedinUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, linkedinUrl: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input id="facebookUrl" type="url" value={profile.facebookUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, facebookUrl: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input id="instagramUrl" type="url" value={profile.instagramUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, instagramUrl: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="googleUrl">Google URL</Label>
                <Input id="googleUrl" type="url" value={profile.googleUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, googleUrl: event.target.value }))} />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={profile.address || ""} onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))} />
            </div>

            <div>
              <Label htmlFor="logoUrl">Company Logo (Recommended: 400×400 px)</Label>
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
                <Input id="logoUrl" type="text" value={profile.logoUrl || ""} onChange={(event) => setProfile((prev) => ({ ...prev, logoUrl: event.target.value }))} placeholder="Or paste logo URL" />
              </div>
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
                  <Input id="execName" value={executiveForm.name} onChange={(event) => setExecutiveForm((prev) => ({ ...prev, name: event.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="execRole">Role</Label>
                  <Input id="execRole" value={executiveForm.role} onChange={(event) => setExecutiveForm((prev) => ({ ...prev, role: event.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="execBio">Bio</Label>
                  <Textarea id="execBio" value={executiveForm.bio} onChange={(event) => setExecutiveForm((prev) => ({ ...prev, bio: event.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="execImage">Photo</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                        <Upload className="h-4 w-4" /> {executiveImageFile ? "Replace Photo" : executiveForm.imageUrl ? "Replace Photo" : "Upload Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => setExecutiveImageFile(event.target.files?.[0] || null)} />
                      </label>
                    </div>
                    <Input id="execImage" type="text" value={executiveForm.imageUrl} onChange={(event) => setExecutiveForm((prev) => ({ ...prev, imageUrl: event.target.value }))} placeholder="Or paste photo URL" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="execSortOrder">Sort Order</Label>
                  <Input id="execSortOrder" type="number" min={0} value={executiveForm.sortOrder} onChange={(event) => setExecutiveForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
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
                      {executive.imageUrl && <img src={absolutizeApiUrl(executive.imageUrl, rawApiBase)} alt={executive.name} className="h-8 w-8 rounded object-cover" />}
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

export default AdminCompany;
