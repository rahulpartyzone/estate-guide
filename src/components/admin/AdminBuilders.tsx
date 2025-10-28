import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, Upload, X } from "lucide-react";
import { api } from "@/lib/api";

interface BuilderRecord {
  id: string;
  name: string;
  description: string;
  experienceYears?: number;
  rating?: number;
  website?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

type FormState = Omit<BuilderRecord, 'id'>;

const emptyForm: FormState = { name: '', description: '', experienceYears: undefined, rating: undefined, website: '', phone: '', email: '', logoUrl: '' };

const AdminBuilders = () => {
  const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
  let API_ORIGIN = 'http://localhost:8080';
  try { API_ORIGIN = new URL(RAW_API_BASE).origin; } catch {}
  const absolutize = (u?: string) => {
    if (!u) return '';
    const url = u.trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
    return url;
  };
  const { toast } = useToast();
  const [items, setItems] = useState<BuilderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const list = await api.listBuilders();
      // listBuilders returns an array of builders with _count maybe
      const mapped: BuilderRecord[] = list.map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description || '',
        experienceYears: b.experienceYears ?? b.experience ?? undefined,
        rating: b.rating != null ? Number(b.rating) : undefined,
        website: b.website || '',
        phone: b.phone || '',
        email: b.email || '',
        logoUrl: absolutize(b.logoUrl || ''),
      }));
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load builders');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setLogoFile(null);
    setIsDialogOpen(true);
  };
  const openEdit = (id: string) => {
    const current = items.find(i => i.id === id);
    if (!current) return;
    setEditingId(id);
    setForm({
      name: current.name,
      description: current.description,
      experienceYears: current.experienceYears,
      rating: current.rating,
      website: current.website,
      phone: current.phone,
      email: current.email,
      logoUrl: current.logoUrl,
    });
    setLogoFile(null);
    setIsDialogOpen(true);
  };

  const handleChange = (field: keyof FormState, value: any) => {
    setForm(f => ({ ...f, [field]: value === '' ? undefined : value }));
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const validate = () => {
    const errs: Record<string,string> = {};
    if (!form.name?.trim()) errs.name = 'Required';
    if (!form.description?.trim()) errs.description = 'Required';
    if (form.rating != null) {
      const r = Number(form.rating); if (isNaN(r) || r < 0 || r > 5) errs.rating = '0-5';
    }
    if (form.website && !/^https?:\/\//i.test(form.website)) errs.website = 'Must start with http(s)://';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Invalid email';
    setFieldErrors(errs); return Object.keys(errs).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // If a logo file is selected, upload it first
      let finalLogoUrl = form.logoUrl || undefined;
      if (logoFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(logoFile);
        finalLogoUrl = stored.url;
      }
      const payload: any = {
        name: form.name?.trim(),
        description: form.description?.trim(),
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        rating: form.rating != null ? Number(form.rating) : undefined,
        website: form.website || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        logoUrl: finalLogoUrl,
      };
      if (editingId) {
        await api.updateBuilder(editingId, payload);
        setItems(list => list.map(i => i.id === editingId ? { ...i, ...payload, logoUrl: absolutize(payload.logoUrl) } : i));
        toast({ title: 'Builder updated' });
      } else {
        const created = await api.createBuilder(payload);
        const mapped: BuilderRecord = {
          id: created.id,
          name: created.name,
          description: created.description || '',
          experienceYears: created.experienceYears,
            rating: created.rating != null ? Number(created.rating) : undefined,
          website: created.website || '',
          phone: created.phone || '',
          email: created.email || '',
          logoUrl: absolutize(created.logoUrl || ''),
        };
        setItems(list => [mapped, ...list]);
        toast({ title: 'Builder created' });
      }
      setIsDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setLogoFile(null);
      setFieldErrors({});
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this builder?')) return;
    const prev = items;
    setItems(list => list.filter(i => i.id !== id));
    try {
      await api.deleteBuilder(id);
      toast({ title: 'Builder deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
      setItems(prev);
    }
  };

  const total = items.length;
  const avgRating = useMemo(() => {
    const nums = items.map(i => i.rating).filter((n): n is number => typeof n === 'number');
    if (!nums.length) return null;
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
  }, [items]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex flex-col gap-1">
          <span>Builders ({total})</span>
          {avgRating && <span className="text-xs font-normal text-muted-foreground">Avg Rating: {avgRating}</span>}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reload'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Builder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Builder' : 'Add New Builder'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={e => handleChange('name', e.target.value)} required aria-invalid={!!fieldErrors.name} />
                  {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={e => handleChange('description', e.target.value)} required aria-invalid={!!fieldErrors.description} />
                  {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experienceYears">Experience (years)</Label>
                    <Input id="experienceYears" type="number" min={0} value={form.experienceYears ?? ''} onChange={e => handleChange('experienceYears', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <Input id="rating" type="number" step="0.01" min={0} max={5} value={form.rating ?? ''} onChange={e => handleChange('rating', e.target.value)} aria-invalid={!!fieldErrors.rating} />
                    {fieldErrors.rating && <p className="text-xs text-red-500 mt-1">{fieldErrors.rating}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone ?? ''} onChange={e => handleChange('phone', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email ?? ''} onChange={e => handleChange('email', e.target.value)} aria-invalid={!!fieldErrors.email} />
                    {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" value={form.website ?? ''} onChange={e => handleChange('website', e.target.value)} aria-invalid={!!fieldErrors.website} />
                  {fieldErrors.website && <p className="text-xs text-red-500 mt-1">{fieldErrors.website}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                      <Upload className="h-4 w-4" /> {logoFile ? 'Replace Logo' : (form.logoUrl ? 'Replace Logo' : 'Upload Logo')}
                      <input type="file" accept="image/*" className="hidden" onChange={e=>setLogoFile(e.target.files?.[0]||null)} />
                    </label>
                    {logoFile && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{logoFile.name}</span>}
                    {!logoFile && form.logoUrl && <span className="text-xs text-green-600">Existing</span>}
                    {logoFile && <button type="button" onClick={()=>setLogoFile(null)} className="text-xs text-red-500">Remove</button>}
                  </div>
                  <Input id="logoUrl" type="url" value={form.logoUrl ?? ''} onChange={e => handleChange('logoUrl', e.target.value)} placeholder="Or paste logo URL (optional)" />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingId ? 'Update Builder' : 'Create Builder')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(b => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="font-medium flex items-center gap-2">
                      {b.logoUrl && <img src={absolutize(b.logoUrl)} alt={b.name} className="h-6 w-6 object-cover rounded" />}
                      <span>{b.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground max-w-xs line-clamp-2">{b.description}</div>
                  </div>
                </TableCell>
                <TableCell>{b.experienceYears != null ? `${b.experienceYears} yr${b.experienceYears === 1 ? '' : 's'}` : '-'}</TableCell>
                <TableCell>{b.rating != null ? b.rating : '-'}</TableCell>
                <TableCell className="text-xs">
                  {b.phone && <div>{b.phone}</div>}
                  {b.email && <div>{b.email}</div>}
                </TableCell>
                <TableCell>
                  {b.website && (
                    <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">Site</a>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!items.length && !loading) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No builders found.</TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading...</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminBuilders;