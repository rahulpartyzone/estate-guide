import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Loader2, Plus, Edit, Trash2, Upload, X } from 'lucide-react';

type Amenity = { id: string; name: string; code?: string; imageUrl?: string };

export default function AdminAmenities() {
  const [items, setItems] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listAmenitiesAdmin();
      const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
      let API_ORIGIN = window.location.origin;
      try { API_ORIGIN = new URL(RAW_API_BASE).origin; } catch {}
      const fixUrl = (u?: string) => {
        if (!u) return u;
        if (/^https?:\/\//i.test(u)) return u;
        if (u.startsWith('/api/')) return `${API_ORIGIN}${u}`;
        return u;
      };
      setItems((list || []).map((a: any) => ({ ...a, imageUrl: fixUrl(a.imageUrl) })));
    } catch (e: any) {
      toast({ title: 'Failed to load amenities', description: e?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setImageFile(null);
    setImageUrl(undefined);
    setIsOpen(true);
  };
  const openEdit = (a: Amenity) => {
    setEditing(a);
    setName(a.name || '');
    setCode(a.code || '');
    setImageFile(null);
    setImageUrl(a.imageUrl);
    setIsOpen(true);
  };
  const onClose = () => { if (!saving) setIsOpen(false); };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      let uploadUrl = imageUrl;
      if (imageFile) {
        const stored = await api.uploadFileDirect(imageFile);
        uploadUrl = stored.url;
      }
      if (editing) {
        const updated = await api.updateAmenity(editing.id, { name: name.trim(), code: code.trim() || undefined, imageUrl: uploadUrl });
        setItems(list => list.map(i => i.id === editing.id ? updated : i));
        toast({ title: 'Amenity updated' });
      } else {
        const created = await api.createAmenity({ name: name.trim(), code: code.trim() || undefined, imageUrl: uploadUrl });
        setItems(list => [created, ...list]);
        toast({ title: 'Amenity created' });
      }
      setIsOpen(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this amenity?')) return;
    const prev = items;
    setItems(list => list.filter(i => i.id !== id));
    try {
      await api.deleteAmenity(id);
      toast({ title: 'Amenity deleted' });
    } catch (e: any) {
      setItems(prev);
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">Amenities {loading && <Loader2 className="h-4 w-4 animate-spin" />}</CardTitle>
        <Dialog open={isOpen} onOpenChange={(v)=> v ? openCreate() : onClose()}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Amenity</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Amenity' : 'Add Amenity'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="am-name">Name</Label>
                <Input id="am-name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Swimming Pool" />
              </div>
              <div>
                <Label htmlFor="am-code">Code (optional)</Label>
                <Input id="am-code" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. pool" />
              </div>
              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <Upload className="h-4 w-4" /> {imageFile ? 'Replace Image' : (imageUrl ? 'Replace Image' : 'Upload Image')}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>setImageFile(e.target.files?.[0]||null)} />
                  </label>
                  {imageFile && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{imageFile.name}</span>}
                  {!imageFile && imageUrl && (
                    <img
                      src={(imageUrl?.startsWith('/api/') ? (()=>{ try { const o=new URL((import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1').origin; return `${o}${imageUrl}`; } catch { return imageUrl; } })() : imageUrl)}
                      alt="amenity"
                      className="h-8 w-8 object-contain"
                    />
                  )}
                  {(imageFile || imageUrl) && (
                    <button type="button" className="text-xs text-red-500" onClick={()=>{ setImageFile(null); setImageUrl(undefined); }}>Remove</button>
                  )}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? 'Update' : 'Create')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(a => (
              <TableRow key={a.id}>
                <TableCell className="w-[64px]">{a.imageUrl ? <img src={a.imageUrl} alt={a.name} className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 bg-secondary rounded" />}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.code || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={()=>openEdit(a)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={()=>handleDelete(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(!items.length && !loading) && <div className="text-center py-8 text-muted-foreground">No amenities found</div>}
      </CardContent>
    </Card>
  );
}
