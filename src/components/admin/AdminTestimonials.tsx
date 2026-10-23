import { useState, useEffect } from "react";
import { api } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, FileText, ImageIcon, BadgeCheck, X } from "lucide-react";
import { absolutizeApiUrl } from "@/lib/url";

interface Testimonial {
  id: string; name: string; role: string; company: string; content: string; rating: number; published: boolean;
  photoUrl?: string | null; attachmentUrl?: string | null; attachmentMimeType?: string | null;
}

const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";
const fileUrl = (u?: string | null) => (u ? absolutizeApiUrl(u, RAW_API_BASE) : "");
const MAX_PHOTO_MB = 10;
const MAX_ATTACHMENT_MB = 25;

// No local mock now; will fetch from API

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ url: string; mimeType: string } | null>(null);
  const [uploading, setUploading] = useState<"photo" | "attachment" | null>(null);
  const { toast } = useToast();

  // Load the photo and attachment of the testimonial being edited (or clear them for a new one)
  useEffect(() => {
    if (!isDialogOpen) return;
    setPhotoUrl(editingTestimonial?.photoUrl || null);
    setAttachment(
      editingTestimonial?.attachmentUrl
        ? { url: editingTestimonial.attachmentUrl, mimeType: editingTestimonial.attachmentMimeType || "" }
        : null,
    );
  }, [isDialogOpen, editingTestimonial]);

  const upload = async (kind: "photo" | "attachment", file: File | undefined) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (kind === "photo" && !isImage) {
      toast({ title: "Choose an image for the client photo", variant: "destructive" });
      return;
    }
    if (kind === "attachment" && !isImage && !isPdf) {
      toast({ title: "Attach an image or a PDF", variant: "destructive" });
      return;
    }
    const limit = kind === "photo" ? MAX_PHOTO_MB : MAX_ATTACHMENT_MB;
    if (file.size > limit * 1024 * 1024) {
      toast({ title: `File is larger than ${limit} MB`, variant: "destructive" });
      return;
    }
    setUploading(kind);
    try {
      const stored = await api.uploadFileDirect(file);
      if (kind === "photo") setPhotoUrl(stored.url);
      else setAttachment({ url: stored.url, mimeType: stored.mimeType || file.type });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const load = async () => {
    try {
      setTestimonials(await api.listTestimonialsAdmin());
    } catch (e: any) {
      toast({ title: 'Failed to load testimonials', description: e.message, variant: 'destructive' });
    }
  };
  useEffect(() => { load(); }, []);

  const saveLocal = (updated: Testimonial[]) => setTestimonials(updated);

  const handleSave = async (formData: FormData) => {
    const testimonialData: Partial<Testimonial> = {
      name: formData.get("name") as string,
      role: formData.get("role") as string,
      company: formData.get("company") as string,
      content: formData.get("content") as string,
      rating: parseInt(formData.get("rating") as string),
      photoUrl: photoUrl || null,
      attachmentUrl: attachment?.url || null,
      attachmentMimeType: attachment?.mimeType || null,
    };

    try {
      if (editingTestimonial) {
        const updated = await api.updateTestimonial(editingTestimonial.id, { ...(testimonialData as any) });
        saveLocal(testimonials.map(t => t.id === editingTestimonial.id ? updated : t));
        toast({ title: 'Testimonial updated successfully!' });
      } else {
        const created = await api.createTestimonial({ ...(testimonialData as any), published: false });
        saveLocal([created, ...testimonials]);
        toast({ title: 'Testimonial created successfully!' });
      }
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }

    setIsDialogOpen(false);
    setEditingTestimonial(null);
  };

  const deleteTestimonial = async (id: string) => {
    const prev = testimonials;
    saveLocal(prev.filter(t => t.id !== id));
    try {
      await api.deleteTestimonial(id);
      toast({ title: 'Testimonial deleted successfully!' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
      saveLocal(prev); // rollback
    }
  };

  const togglePublish = async (t: Testimonial) => {
    const prev = testimonials;
    const optimistic = prev.map(x => x.id === t.id ? { ...x, published: !x.published } : x);
    saveLocal(optimistic);
    try {
      const updated = await api.publishTestimonial(t.id, !t.published);
      saveLocal(prev.map(x => x.id === t.id ? updated : x));
    } catch (e: any) {
      toast({ title: 'Publish toggle failed', description: e.message, variant: 'destructive' });
      saveLocal(prev);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Testimonials ({testimonials.length})</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTestimonial(null)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingTestimonial?.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    name="role"
                    defaultValue={editingTestimonial?.role}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    defaultValue={editingTestimonial?.company}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Input
                    id="rating"
                    name="rating"
                    type="number"
                    min="1"
                    max="5"
                    defaultValue={editingTestimonial?.rating}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="content">Testimonial Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  defaultValue={editingTestimonial?.content}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="photo">Client photo (optional)</Label>
                  {photoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={fileUrl(photoUrl)} alt="Client" className="h-14 w-14 rounded-full object-cover border" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoUrl(null)} className="gap-1">
                        <X className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <Input id="photo" type="file" accept="image/*" disabled={uploading !== null}
                      onChange={(e) => { upload("photo", e.target.files?.[0]); e.target.value = ""; }} />
                  )}
                  {uploading === "photo" && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</div>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attachment">Letter or handwritten note (optional)</Label>
                  {attachment ? (
                    <div className="flex items-center gap-3">
                      <a href={fileUrl(attachment.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                        {attachment.mimeType === "application/pdf" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                        View
                      </a>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAttachment(null)} className="gap-1">
                        <X className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <Input id="attachment" type="file" accept="image/*,application/pdf" disabled={uploading !== null}
                      onChange={(e) => { upload("attachment", e.target.files?.[0]); e.target.value = ""; }} />
                  )}
                  {uploading === "attachment" && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</div>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Publish a client's photo or letter only with their permission. Cover phone numbers, addresses and
                signatures you don't want public before uploading. Testimonials with an attachment show a
                "Verified client" badge on the website.
              </p>

              <Button type="submit" className="w-full" disabled={uploading !== null}>
                {editingTestimonial ? "Update Testimonial" : "Create Testimonial"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials.map((testimonial) => (
              <TableRow key={testimonial.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {testimonial.photoUrl && <img src={fileUrl(testimonial.photoUrl)} alt="" className="h-8 w-8 rounded-full object-cover" />}
                    <span>{testimonial.name}</span>
                    {testimonial.attachmentUrl && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Has an attachment" />}
                  </div>
                </TableCell>
                <TableCell>{testimonial.role}</TableCell>
                <TableCell>{testimonial.company}</TableCell>
                <TableCell>⭐ {testimonial.rating}/5</TableCell>
                <TableCell><div className="max-w-xs truncate">{testimonial.content}</div></TableCell>
                <TableCell>
                  <Button size="sm" variant={testimonial.published ? 'secondary' : 'outline'} onClick={() => togglePublish(testimonial)}>
                    {testimonial.published ? 'Published' : 'Draft'}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTestimonial(testimonial);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTestimonial(testimonial.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminTestimonials;