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
import { Plus, Edit, Trash2 } from "lucide-react";

interface Testimonial { id: string; name: string; role: string; company: string; content: string; rating: number; published: boolean }

// No local mock now; will fetch from API

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const published = await api.listTestimonials(true);
      const drafts = await api.listTestimonials(false).catch(()=>[]);
      // Merge ensuring uniqueness
      const map = new Map<string, Testimonial>();
      [...published, ...drafts].forEach((t: any) => map.set(t.id, t));
      setTestimonials(Array.from(map.values()));
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
          <DialogContent>
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

              <Button type="submit" className="w-full">
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
                <TableCell className="font-medium">{testimonial.name}</TableCell>
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