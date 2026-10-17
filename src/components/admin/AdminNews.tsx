import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  category?: string;
  authorName?: string;
  sourceUrl?: string;
  tags: string[];
  published: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
}

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  imageUrl: "",
  category: "",
  authorName: "",
  sourceUrl: "",
  tags: "",
  published: true,
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
};

const AdminNews = () => {
  const { toast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const items = await api.listNewsAdmin();
      setNews(items || []);
    } catch (e: any) {
      toast({ title: "Failed to load news", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setImageFile(null);
    setForm({ ...emptyForm, published: true });
    setDialogOpen(true);
  };

  const openEdit = (item: NewsItem) => {
    setEditing(item);
    setImageFile(null);
    setForm({
      title: item.title || "",
      excerpt: item.excerpt || "",
      content: item.content || "",
      imageUrl: item.imageUrl || "",
      category: item.category || "",
      authorName: item.authorName || "",
      sourceUrl: item.sourceUrl || "",
      tags: (item.tags || []).join(", "),
      published: !!item.published,
      publishedAt: item.publishedAt ? String(item.publishedAt).slice(0, 16) : "",
      seoTitle: item.seoTitle || "",
      seoDescription: item.seoDescription || "",
    });
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      toast({ title: "Title, excerpt and content are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = form.imageUrl.trim() || undefined;
      if (imageFile) {
        await api.ensureAdmin();
        const stored = await api.uploadFileDirect(imageFile);
        finalImageUrl = stored.url;
      }

      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        imageUrl: finalImageUrl,
        category: form.category.trim() || undefined,
        authorName: form.authorName.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
      };

      const saved = editing ? await api.updateNews(editing.id, payload) : await api.createNews(payload);

      if (editing) {
        setNews((list) => list.map((item) => (item.id === editing.id ? saved : item)));
      } else {
        setNews((list) => [saved, ...list]);
      }

      toast({ title: editing ? "News updated" : "News created" });
      setDialogOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      setImageFile(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this news post?")) return;
    try {
      await api.deleteNews(id);
      setNews((list) => list.filter((item) => item.id !== id));
      toast({ title: "News deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  const togglePublish = async (id: string, published: boolean) => {
    const previous = news;
    setNews((list) => list.map((item) => (item.id === id ? { ...item, published } : item)));
    try {
      const saved = await api.publishNews(id, published);
      setNews((list) => list.map((item) => (item.id === id ? saved : item)));
    } catch (e: any) {
      setNews(previous);
      toast({ title: "Publish update failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage News ({news.length})</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Add News
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit News" : "Create News"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Market, Launch, Policy..." />
                </div>
              </div>

              <div>
                <Label htmlFor="excerpt">Short Description</Label>
                <Textarea id="excerpt" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} rows={3} required />
              </div>

              <div>
                <Label htmlFor="content">Full Content</Label>
                <Textarea id="content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={7} required />
              </div>

              <div>
                <Label htmlFor="imageUrl">Cover Image (Recommended: 1600×900 px)</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                      <Upload className="h-4 w-4" /> {imageFile ? "Replace Image" : form.imageUrl ? "Replace Image" : "Upload Image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
                    </label>
                    {imageFile && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{imageFile.name}</span>}
                    {!imageFile && form.imageUrl && <span className="text-xs text-green-600">Existing</span>}
                  </div>
                  <Input
                    id="imageUrl"
                    type="text"
                    value={form.imageUrl}
                    onChange={(event) => setForm((f) => ({ ...f, imageUrl: event.target.value }))}
                    placeholder="Or paste image URL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="authorName">Author</Label>
                  <Input id="authorName" value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} placeholder="Editorial Team" />
                </div>
                <div>
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input id="sourceUrl" type="url" value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input id="tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="real estate, investment, launch" />
                </div>
                <div>
                  <Label htmlFor="publishedAt">Published At</Label>
                  <Input id="publishedAt" type="datetime-local" value={form.publishedAt} onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seoTitle">SEO Title</Label>
                  <Input id="seoTitle" value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="seoDescription">SEO Description</Label>
                  <Input id="seoDescription" value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="published" checked={form.published} onCheckedChange={(checked) => setForm((f) => ({ ...f, published: checked }))} />
                <Label htmlFor="published">Published</Label>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Update News" : "Create News"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading news...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[280px] truncate">{item.title}</TableCell>
                  <TableCell>{item.category || "-"}</TableCell>
                  <TableCell>
                    <Switch checked={item.published} onCheckedChange={(checked) => togglePublish(item.id, checked)} />
                  </TableCell>
                  <TableCell>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNews;
