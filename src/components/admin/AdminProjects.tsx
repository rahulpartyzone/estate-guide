import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Property } from "@/types/property";
import { Plus, Edit, Trash2, Star, Loader2, RefreshCw, Image as ImageIcon, FileText, X, Upload, ChevronUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

const STORAGE_MODE = (import.meta as any).env?.VITE_STORAGE_MODE || 'db';
import { Select as UiSelect } from "@/components/ui/select"; // alias already imported but keep clarity

const AdminProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [builderOptions, setBuilderOptions] = useState<{ id: string; name: string }[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string }[]>([]);
  const [heroImageSelection, setHeroImageSelection] = useState<{ kind: 'existing' | 'new'; index: number } | null>(null);
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [floorPlans, setFloorPlans] = useState<Array<{ id: string; unitType: string; size: string; unit: string; price: string; currency: string; bedrooms: string; bathrooms: string; imageFile?: File | null; imageUrl?: string }>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [amenityOptions, setAmenityOptions] = useState<Array<{ id: string; name: string; code?: string; imageUrl?: string }>>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]); // store amenity IDs
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('Apartment');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const { toast } = useToast();

  const normalizePropertyType = (value?: string | null) => (value || '').trim().toLowerCase();
  const isPlotType = normalizePropertyType(selectedPropertyType) === 'plot';

  const load = async () => {
    setLoading(true);
    try {
      const [{ data }, builders, amenities] = await Promise.all([
        api.listProperties({ pageSize: 100 }),
        api.listBuilders().catch(() => []),
        api.listAmenities().catch(() => []),
      ]);
      setProjects(data);
      setBuilderOptions((builders || []).map((b: any) => ({ id: b.id, name: b.name })));
      setAmenityOptions((amenities || []).map((a: any) => ({ id: a.id, name: a.name, code: a.code, imageUrl: a.imageUrl })));
    } catch (e: any) {
      toast({ title: 'Failed to load projects', description: e?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!isPlotType) return;
    setFloorPlans((list) => list.map((fp) => ({ ...fp, bedrooms: '', bathrooms: '' })));
  }, [isPlotType]);

  const validate = (fd: FormData) => {
    const errs: Record<string,string> = {};
    const req = (k: string, label: string) => { if (!(fd.get(k) as string)?.trim()) errs[k] = `${label} required`; };
    req('name','Name'); req('description','Description'); req('city','City'); req('area','Area'); req('builderId','Builder'); req('propertyType','Type'); req('reraId', 'RERA No.');
    if (!editingProject && imageFiles.length === 0) errs.images = 'At least one image required';
    if (imageFiles.length + existingImages.length > 10) errs.images = 'Max 10 images';
    if (floorPlans.length > 12) errs.floorPlans = 'Max 12 plans';
    const propertyType = normalizePropertyType(((fd.get('propertyType') as string) || selectedPropertyType));
    const isPlot = propertyType === 'plot';
    floorPlans.forEach((fp,i) => {
      if (!fp.unitType.trim()) errs[`fp_unitType_${i}`] = 'Required';
      if (!fp.imageFile && !fp.imageUrl) errs[`fp_image_${i}`] = 'Image required';
      if (fp.size && isNaN(parseInt(fp.size))) errs[`fp_size_${i}`] = 'Number';
      if (fp.price && isNaN(parseFloat(fp.price))) errs[`fp_price_${i}`] = 'Number';
      if (!isPlot && fp.bedrooms && isNaN(parseInt(fp.bedrooms))) errs[`fp_bedrooms_${i}`] = 'Number';
      if (!isPlot && fp.bathrooms && isNaN(parseInt(fp.bathrooms))) errs[`fp_bathrooms_${i}`] = 'Number';
    });
    // Coordinates validation: if one provided, both must be valid numbers
    const latStr = (fd.get('lat') as string || '').trim();
    const lngStr = (fd.get('lng') as string || '').trim();
    if (latStr || lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (latStr === '' || isNaN(lat) || lat < -90 || lat > 90) errs.lat = 'Latitude -90 to 90';
      if (lngStr === '' || isNaN(lng) || lng < -180 || lng > 180) errs.lng = 'Longitude -180 to 180';
    }
    setFieldErrors(errs); return Object.keys(errs).length === 0;
  };

  const handleSaveProject = async (formData: FormData) => {
    if (!validate(formData)) return;
    setSaving(true);
    try {
      let dto = formToDto(formData);
      const currentType = normalizePropertyType(String(dto.propertyType || selectedPropertyType));
      const isPlot = currentType === 'plot';
      // map selected amenity IDs to names for backend compatibility
      const amenityNames = amenityOptions.filter(opt => selectedAmenities.includes(opt.id)).map(a => a.name);
      dto.amenities = amenityNames;
      // ensure placeholder if creating
      if (!editingProject) {
        dto.mainImageUrl = '/placeholder.svg';
        dto.images = existingImages.map(i=>({ url: i.url }));
      } else {
        dto.mainImageUrl = editingProject.mainImageUrl || editingProject.mainImage || '/placeholder.svg';
        dto.images = existingImages.map(i=>({ url: i.url }));
      }
      dto.floorPlans = floorPlans.map(fp => ({
        unitType: fp.unitType,
        size: fp.size.trim() ? (parseInt(fp.size) || 0) : 0,
        unit: fp.unit||'sqft',
        price: fp.price.trim() ? (parseFloat(fp.price) || 0) : 0,
        currency: fp.currency||'INR',
        imageUrl: fp.imageUrl || '/placeholder.svg',
        bedrooms: !isPlot && fp.bedrooms ? parseInt(fp.bedrooms) : undefined,
        bathrooms: !isPlot && fp.bathrooms ? parseInt(fp.bathrooms) : undefined,
      }));
      const planBedrooms = dto.floorPlans.map((fp: any) => fp.bedrooms).filter((n: any) => typeof n === 'number' && !Number.isNaN(n));
      const planBathrooms = dto.floorPlans.map((fp: any) => fp.bathrooms).filter((n: any) => typeof n === 'number' && !Number.isNaN(n));
      dto.bedrooms = planBedrooms.length ? Math.max(...planBedrooms) : undefined;
      dto.bathrooms = planBathrooms.length ? Math.max(...planBathrooms) : undefined;

      let propertyId = editingProject?.id;
      if (editingProject) {
        await api.updateProperty(propertyId, dto);
      } else {
        const created = await api.createProperty(dto);
        propertyId = created.id;
        setProjects(list => [created, ...list]);
      }

      // Upload images
      const uploaded: string[] = [...existingImages.map(i=>i.url)];
      const newUploadedUrls: string[] = [];
      for (const [newIndex, file] of imageFiles.entries()) {
        if (!propertyId) break;
        const contentType = file.type || 'image/jpeg';
        if (STORAGE_MODE === 'gcs') {
          const presign = await api.presignPropertyImage(propertyId, contentType);
          await api.uploadToSignedUrl(presign.uploadUrl, file, contentType);
          uploaded.push(presign.publicUrl);
          newUploadedUrls[newIndex] = presign.publicUrl;
        } else {
          const stored = await api.uploadFileDirect(file);
          uploaded.push(stored.url);
          newUploadedUrls[newIndex] = stored.url;
        }
      }

      const selectedHeroUrl = (() => {
        if (!heroImageSelection) return undefined;
        if (heroImageSelection.kind === 'existing') {
          return existingImages[heroImageSelection.index]?.url;
        }
        return newUploadedUrls[heroImageSelection.index];
      })();

      const normalizedFloorPlans = [] as Array<{ unitType: string; size: number; unit: string; price: number; currency: string; imageUrl: string; bedrooms?: number; bathrooms?: number }>;
      for (const fp of floorPlans) {
        const sizeParsed = parseInt(fp.size, 10);
        const priceParsed = parseFloat(fp.price);
        const bedroomsParsed = fp.bedrooms ? parseInt(fp.bedrooms, 10) : undefined;
        const bathroomsParsed = fp.bathrooms ? parseInt(fp.bathrooms, 10) : undefined;
        let imageUrl = fp.imageUrl || '';
        const file = fp.imageFile;
        if (file && propertyId) {
          const contentType = file.type || 'image/jpeg';
          if (STORAGE_MODE === 'gcs') {
            const presign = await api.presignPropertyImage(propertyId, contentType);
            await api.uploadToSignedUrl(presign.uploadUrl, file, contentType);
            imageUrl = presign.publicUrl;
          } else {
            const stored = await api.uploadFileDirect(file);
            imageUrl = stored.url;
          }
        }
        if (!imageUrl) imageUrl = '/placeholder.svg';
        normalizedFloorPlans.push({
          unitType: fp.unitType,
          size: !fp.size.trim() || Number.isNaN(sizeParsed) ? 0 : sizeParsed,
          unit: fp.unit || 'sqft',
          price: !fp.price.trim() || Number.isNaN(priceParsed) ? 0 : priceParsed,
          currency: fp.currency || 'INR',
          imageUrl,
          bedrooms: !isPlot && bedroomsParsed != null && !Number.isNaN(bedroomsParsed) ? bedroomsParsed : undefined,
          bathrooms: !isPlot && bathroomsParsed != null && !Number.isNaN(bathroomsParsed) ? bathroomsParsed : undefined,
        });
      }

      // Replace dto floor plans with the normalized values so subsequent updates include uploads
      dto.floorPlans = normalizedFloorPlans.map(fp => ({ ...fp }));
      // Brochure (always store in DB via /files for reliability across environments)
      let brochureUrl: string | undefined = editingProject?.brochureUrl;
      if (brochureFile && propertyId) {
        // Client-side sanity checks to match backend constraints
        if (brochureFile.type !== 'application/pdf') {
          throw new Error('Brochure must be a PDF file');
        }
        if (brochureFile.size > 25 * 1024 * 1024) { // uploads go straight to storage, so large PDFs are fine
          throw new Error('Brochure PDF must be 25MB or smaller');
        }
        const stored = await api.uploadFileDirect(brochureFile);
        brochureUrl = stored.url;
      }
  const finalDto = {
        ...dto,
        mainImageUrl: selectedHeroUrl || uploaded[0] || dto.mainImageUrl || '/placeholder.svg',
        images: uploaded.map(url => ({ url })),
        brochureUrl,
        floorPlans: normalizedFloorPlans,
      };
      if (propertyId) {
        const updated = await api.updateProperty(propertyId, finalDto);
        setProjects(list => list.map(p => p.id === propertyId ? updated : p));
      }
      toast({ title: editingProject ? 'Project updated' : 'Project created' });
      resetFormState();
      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleHotProject = async (projectId: string) => {
    const current = projects.find(p => p.id === projectId);
    if (!current) return;
    const optimistic = !current.isHotProject;
    setProjects(list => list.map(p => p.id === projectId ? { ...p, isHotProject: optimistic } : p));
    try {
      await api.setPropertyHot(projectId, optimistic);
      toast({ title: optimistic ? 'Marked as Hot Project' : 'Removed from Hot Projects' });
    } catch (e: any) {
      setProjects(list => list.map(p => p.id === projectId ? { ...p, isHotProject: current.isHotProject } : p));
      toast({ title: 'Toggle failed', description: e?.message, variant: 'destructive' });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return;
    const prev = projects;
    setProjects(list => list.filter(p => p.id !== projectId));
    try {
      await api.deleteProperty(projectId);
      toast({ title: 'Project deleted' });
    } catch (e: any) {
      setProjects(prev);
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  const formToDto = (fd: FormData) => {
    const amenities: string[] = []; // filled from selectedAmenities in handleSaveProject
    const builderId = fd.get('builderId') as string;
    const latStr = (fd.get('lat') as string || '').trim();
    const lngStr = (fd.get('lng') as string || '').trim();
    const latVal = latStr ? parseFloat(latStr) : undefined;
    const lngVal = lngStr ? parseFloat(lngStr) : undefined;
    return {
      name: fd.get('name'),
      description: fd.get('description'),
      city: fd.get('city'),
      area: fd.get('area'),
      addressLine: fd.get('location') || undefined,
      builderId,
      propertyType: fd.get('propertyType'),
      status: (() => {
        const val = (fd.get('status') as string | null) || '';
        return val.trim() ? val : undefined;
      })(),
      reraId: (fd.get('reraId') as string)?.trim(),
      // Empty string removes the link
      videoUrl: ((fd.get('videoUrl') as string) || '').trim(),
      virtualTourUrl: ((fd.get('virtualTourUrl') as string) || '').trim(),
      unitSizeRange: (() => {
        const raw = ((fd.get('unitSizeRange') as string) || '').trim();
        return raw || undefined;
      })(),
      towersBlocks: (() => {
        const raw = ((fd.get('towersBlocks') as string) || '').trim();
        return raw || undefined;
      })(),
      unitVariants: (() => {
        const raw = ((fd.get('unitVariants') as string) || '').trim();
        return raw || undefined;
      })(),
      possessionTime: (() => {
        const raw = ((fd.get('possessionTime') as string) || '').trim();
        return raw || undefined;
      })(),
      totalUnits: (() => {
        const raw = ((fd.get('totalUnits') as string) || '').trim();
        if (!raw) return undefined;
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      })(),
      isHotProject: fd.get('isHotProject') === 'on',
      price: parsePriceRange(fd.get('priceRange') as string),
      size: parseSize(fd.get('size') as string),
      coordinates: (typeof latVal === 'number' && !isNaN(latVal) && typeof lngVal === 'number' && !isNaN(lngVal)) ? { lat: latVal, lng: lngVal } : undefined,
      amenities,
      mainImageUrl: '/placeholder.svg',
      images: [],
      floorPlans: [],
      published: true,
    } as any;
  };

  function parsePriceRange(str: string) {
    if (!str) return { min: undefined, max: undefined, currency: 'INR' } as any;
    // Support formats like:
    //  - both: "45L - 80L", "1Cr-1.5Cr", "45L to 80L"
    //  - min-only: "75L -", "from 75L"
    //  - max-only: "- 90L", "upto 90L"
    //  - single value: "75L" (treat as min-only / onwards)
    const s = str.trim().replace(/\bupto\b/gi, '-').replace(/\bto\b/gi, '-').replace(/\bfrom\b/gi, (m) => m);
    const hasDash = s.includes('-');
    const partsRaw = s.split('-');
    const left = (partsRaw[0] ?? '').trim();
    const right = (partsRaw[1] ?? '').trim();
    const parseVal = (p: string) => {
      if (!p) return undefined as any;
      const m = p.match(/([0-9]+(?:\.[0-9]+)?)(\s*(Cr|L|M))?/i);
      if (!m) return undefined as any;
      let num = parseFloat(m[1]);
      const suffix = (m[3] || '').toLowerCase();
      if (suffix === 'l') num *= 100000; // lakh
      else if (suffix === 'cr') num *= 10000000; // crore
      else if (suffix === 'm') num *= 1000000; // million (optional)
      return Math.round(num);
    };
    if (!hasDash) {
      // Single value => treat as min-only (onwards)
      const v = parseVal(left);
      return { min: v, max: undefined, currency: 'INR' } as any;
    }
    if (left && right) {
      const v1 = parseVal(left) as any as number;
      const v2 = parseVal(right) as any as number;
      if (v1 == null && v2 == null) return { min: undefined, max: undefined, currency: 'INR' } as any;
      if (v1 != null && v2 != null) return { min: Math.min(v1, v2), max: Math.max(v1, v2), currency: 'INR' } as any;
      if (v1 != null) return { min: v1, max: undefined, currency: 'INR' } as any;
      if (v2 != null) return { min: undefined, max: v2, currency: 'INR' } as any;
    } else if (left && !right) {
      // Trailing dash => min-only
      const v = parseVal(left);
      return { min: v, max: undefined, currency: 'INR' } as any;
    } else if (!left && right) {
      // Leading dash => max-only
      const v = parseVal(right);
      return { min: undefined, max: v, currency: 'INR' } as any;
    }
    return { min: undefined, max: undefined, currency: 'INR' } as any;
  }
  function parseSize(str: string) {
    if (!str) return undefined;
    const unitMatch = str.match(/(sqft|sq\s*ft|sqm|acre|acres|cent|cents)/i);
    const unitRaw = unitMatch ? unitMatch[1].toLowerCase() : 'sqft';
    let unit = 'sqft';
    if (unitRaw.startsWith('sqm')) unit = 'sqm';
    else if (unitRaw.startsWith('acre')) unit = 'acre';
    else if (unitRaw.startsWith('cent')) unit = 'cent';
    const nums = (str.match(/[0-9]+/g) || []).map(n => parseInt(n,10));
    if (!nums.length) return undefined;
    if (nums.length === 1) return { min: nums[0], max: nums[0], unit };
    return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]), unit };
  }

  const builderSelect = useMemo(() => builderOptions.sort((a,b)=>a.name.localeCompare(b.name)), [builderOptions]);
  const resetFormState = () => {
    setEditingProject(null); setImageFiles([]); setExistingImages([]); setHeroImageSelection(null); setBrochureFile(null); setFloorPlans([]); setFieldErrors({}); setSelectedAmenities([]); setSelectedPropertyType('Apartment'); setSelectedStatus('');
  };
  const openCreate = () => { resetFormState(); setIsDialogOpen(true); };
  const openEdit = (project: any) => {
    setEditingProject(project);
    setSelectedPropertyType(project.propertyType || 'Apartment');
    setSelectedStatus(project.status || '');
    const mappedExistingImages = (project.images || []).map((i: any) => ({ url: i.url || i }));
    setExistingImages(mappedExistingImages);
    const mainImageCandidate = project.mainImageUrl || project.mainImage;
    const mainIndex = mappedExistingImages.findIndex((img) => img.url === mainImageCandidate);
    setHeroImageSelection(mainIndex >= 0 ? { kind: 'existing', index: mainIndex } : null);
    setFloorPlans((project.floorPlans || []).map((f: any, idx: number) => ({
      id: `fp_${idx}`,
      unitType: f.unitType || f.type || '',
      size: String(f.size || f.sizeMin || ''),
      unit: f.unit || 'sqft',
      price: String(f.price || 0),
      currency: f.currency || 'INR',
      bedrooms: f.bedrooms != null ? String(f.bedrooms) : '',
      bathrooms: f.bathrooms != null ? String(f.bathrooms) : '',
      imageUrl: f.imageUrl || f.image || undefined,
    })));
    const ids = (project.amenities || []).map((a:any)=> a?.amenity?.id || a?.id).filter(Boolean);
    setSelectedAmenities(ids);
    setIsDialogOpen(true);
  };
  const addImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setImageFiles(prev => {
      const next = prev.concat(arr).slice(0,10 - existingImages.length);
      if (!heroImageSelection && existingImages.length === 0 && next.length > 0) {
        setHeroImageSelection({ kind: 'new', index: 0 });
      }
      return next;
    });
  };
  const removeNewImage = (idx: number) => {
    setImageFiles(list => list.filter((_,i)=>i!==idx));
    setHeroImageSelection((sel) => {
      if (!sel || sel.kind !== 'new') return sel;
      if (sel.index === idx) return null;
      if (sel.index > idx) return { ...sel, index: sel.index - 1 };
      return sel;
    });
  };
  const removeExistingImage = (idx: number) => {
    setExistingImages(list => list.filter((_,i)=>i!==idx));
    setHeroImageSelection((sel) => {
      if (!sel || sel.kind !== 'existing') return sel;
      if (sel.index === idx) return null;
      if (sel.index > idx) return { ...sel, index: sel.index - 1 };
      return sel;
    });
  };
  const addFloorPlan = () => setFloorPlans(list => list.length>=12?list:[...list,{ id: crypto.randomUUID(), unitType:'', size:'', unit:'sqft', price:'', currency:'INR', bedrooms:'', bathrooms:'' }]);
  const updateFloorPlan = (id:string, patch:Partial<any>) => setFloorPlans(list => list.map(fp => fp.id===id?{...fp,...patch}:fp));
  const removeFloorPlan = (id:string) => setFloorPlans(list => list.filter(fp=>fp.id!==id));
  const moveFloorPlan = (id:string, dir:-1|1) => setFloorPlans(list => { const idx=list.findIndex(f=>f.id===id); if(idx<0)return list; const to=idx+dir; if(to<0||to>=list.length)return list; const copy=[...list]; const [it]=copy.splice(idx,1); copy.splice(to,0,it); return copy; });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">Manage Projects ({projects.length}) {loading && <Loader2 className="h-4 w-4 animate-spin" />}</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Edit Project" : "Add New Project"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveProject(new FormData(e.currentTarget)); }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProject?.name}
                    required
                    aria-invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="builderId">Builder</Label>
                  <select id="builderId" name="builderId" defaultValue={editingProject?.builderId} required className="w-full border rounded h-10 px-2 text-sm bg-background" aria-invalid={!!fieldErrors.builderId}>
                    <option value="">Select builder</option>
                    {builderSelect.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {fieldErrors.builderId && <p className="text-xs text-red-500 mt-1">{fieldErrors.builderId}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingProject?.description}
                  required
                  aria-invalid={!!fieldErrors.description}
                />
                {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={editingProject?.city}
                    required
                    aria-invalid={!!fieldErrors.city}
                  />
                  {fieldErrors.city && <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>}
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    name="area"
                    defaultValue={editingProject?.area}
                    required
                    aria-invalid={!!fieldErrors.area}
                  />
                  {fieldErrors.area && <p className="text-xs text-red-500 mt-1">{fieldErrors.area}</p>}
                </div>
                <div>
                  <Label htmlFor="reraId">RERA No.</Label>
                  <Input
                    id="reraId"
                    name="reraId"
                    defaultValue={editingProject?.reraId || ''}
                    required
                    aria-invalid={!!fieldErrors.reraId}
                  />
                  {fieldErrors.reraId && <p className="text-xs text-red-500 mt-1">{fieldErrors.reraId}</p>}
                </div>
                <div>
                  <Label htmlFor="videoUrl">Walkthrough video (YouTube link)</Label>
                  <Input
                    id="videoUrl"
                    name="videoUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    defaultValue={(editingProject as any)?.videoUrl || ''}
                    pattern="https://.*"
                    title="Paste a link starting with https://"
                  />
                </div>
                <div>
                  <Label htmlFor="virtualTourUrl">3D / 360° virtual tour link</Label>
                  <Input
                    id="virtualTourUrl"
                    name="virtualTourUrl"
                    type="url"
                    placeholder="https://my.matterport.com/show/?m=..."
                    defaultValue={(editingProject as any)?.virtualTourUrl || ''}
                    pattern="https://.*"
                    title="Paste a link starting with https://"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={editingProject?.addressLine || ''}
                    required
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <Label>Coordinates (optional)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Input
                      id="lat"
                      name="lat"
                      type="number"
                      step="any"
                      placeholder="Latitude e.g., 12.9716"
                      defaultValue={editingProject?.lat ?? ''}
                      aria-invalid={!!fieldErrors.lat}
                    />
                    {fieldErrors.lat && <p className="text-xs text-red-500 mt-1">{fieldErrors.lat}</p>}
                  </div>
                  <div>
                    <Input
                      id="lng"
                      name="lng"
                      type="number"
                      step="any"
                      placeholder="Longitude e.g., 77.5946"
                      defaultValue={editingProject?.lng ?? ''}
                      aria-invalid={!!fieldErrors.lng}
                    />
                    {fieldErrors.lng && <p className="text-xs text-red-500 mt-1">{fieldErrors.lng}</p>}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Provide both latitude and longitude to enable the interactive map.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Plot">Plot</SelectItem>
                      <SelectItem value="LuxuryHomes">Luxury Homes</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="propertyType" value={selectedPropertyType} />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus || '__none'} onValueChange={(value) => setSelectedStatus(value === '__none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not specified</SelectItem>
                      <SelectItem value="UnderConstruction">Under Construction</SelectItem>
                      <SelectItem value="ReadyToMove">Ready to Move</SelectItem>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                      <SelectItem value="NewLaunch">New Launch</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="status" value={selectedStatus} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priceRange">Price Range</Label>
                  <Input
                    id="priceRange"
                    name="priceRange"
                    defaultValue={editingProject ? (
                      (editingProject.priceMin != null && editingProject.priceMax != null)
                        ? `${editingProject.priceMin}-${editingProject.priceMax}`
                        : (editingProject.priceMin != null)
                          ? `${editingProject.priceMin}-`
                          : (editingProject.priceMax != null)
                            ? `-${editingProject.priceMax}`
                            : ''
                    ) : undefined}
                    placeholder="e.g., 45L - 85L, 1Cr - 1.5Cr, 75L -, - 90L"
                  />
                </div>
                <div>
                  <Label htmlFor="size">Development Size</Label>
                  <Input
                    id="size"
                    name="size"
                    defaultValue={editingProject ?
                      (editingProject.sizeMin && editingProject.sizeMax ? `${editingProject.sizeMin}-${editingProject.sizeMax} ${editingProject.sizeUnit || 'sqft'}` : (editingProject.sizeMin ? `${editingProject.sizeMin} ${editingProject.sizeUnit || 'sqft'}` : ''))
                      : undefined}
                    placeholder="e.g., 1200-2400 sqft, 2-4 acres, 50-80 cents"
                  />
                </div>
                <div>
                  <Label htmlFor="unitSizeRange">Size (Unit Range)</Label>
                  <Input
                    id="unitSizeRange"
                    name="unitSizeRange"
                    defaultValue={editingProject?.unitSizeRange || ''}
                    placeholder="e.g., 1200-1800 sqft, 30-60 cents"
                  />
                </div>
                <div>
                  <Label htmlFor="towersBlocks">Towers and Blocks</Label>
                  <Input
                    id="towersBlocks"
                    name="towersBlocks"
                    defaultValue={editingProject?.towersBlocks || ''}
                    placeholder="e.g., 5 Towers, 12 Blocks"
                  />
                </div>
                <div>
                  <Label htmlFor="unitVariants">Unit Variants</Label>
                  <Input
                    id="unitVariants"
                    name="unitVariants"
                    defaultValue={editingProject?.unitVariants || ''}
                    placeholder="e.g., 1, 2, 3 BHK"
                  />
                </div>
                <div>
                  <Label htmlFor="possessionTime">Possession Time</Label>
                  <Input
                    id="possessionTime"
                    name="possessionTime"
                    defaultValue={editingProject?.possessionTime || ''}
                    placeholder="e.g., Dec 2028"
                  />
                </div>
                <div>
                  <Label htmlFor="totalUnits">Total Units</Label>
                  <Input
                    id="totalUnits"
                    name="totalUnits"
                    type="number"
                    min={1}
                    defaultValue={editingProject?.totalUnits ?? editingProject?.parkingSpaces ?? ''}
                    placeholder="e.g., 320"
                  />
                </div>
              </div>

              <div>
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {amenityOptions.map(opt => {
                    const checked = selectedAmenities.includes(opt.id);
                    return (
                      <label key={opt.id} className={`px-3 py-1 rounded border text-sm cursor-pointer ${checked ? 'bg-primary text-white border-primary' : 'bg-background'}`}>
                        <input type="checkbox" className="hidden" checked={checked} onChange={(e)=>{
                          setSelectedAmenities(prev => e.target.checked ? [...prev, opt.id] : prev.filter(id=>id!==opt.id));
                        }} />
                        {opt.name}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Select multiple amenities for this property.</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isHotProject"
                  name="isHotProject"
                  defaultChecked={editingProject?.isHotProject}
                />
                <Label htmlFor="isHotProject">Mark as Hot Project</Label>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label>Images ({existingImages.length + imageFiles.length}/10) (Recommended: 1920×1080 px)</Label>
                <p className="text-[11px] text-muted-foreground">Select one image as Hero Image (cover image shown on listing/detail pages).</p>
                <div className="flex flex-wrap gap-3">
                  {existingImages.map((img, idx) => (
                    <div key={img.url+idx} className="relative w-24 h-24 rounded overflow-hidden border bg-secondary">
                      <img src={img.url} className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={()=>setHeroImageSelection({ kind: 'existing', index: idx })}
                        className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[10px] ${heroImageSelection?.kind === 'existing' && heroImageSelection?.index === idx ? 'bg-primary text-white' : 'bg-black/60 text-white'}`}
                      >
                        Hero
                      </button>
                      <button type="button" onClick={()=>removeExistingImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {imageFiles.map((file, idx) => (
                    <div key={file.name+idx} className="relative w-24 h-24 rounded overflow-hidden border bg-secondary flex items-center justify-center text-[10px] p-1 text-center">
                      <span className="line-clamp-4">{file.name}</span>
                      <button
                        type="button"
                        onClick={()=>setHeroImageSelection({ kind: 'new', index: idx })}
                        className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[10px] ${heroImageSelection?.kind === 'new' && heroImageSelection?.index === idx ? 'bg-primary text-white' : 'bg-black/60 text-white'}`}
                      >
                        Hero
                      </button>
                      <button type="button" onClick={()=>removeNewImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {(existingImages.length + imageFiles.length) < 10 && (
                    <label className="w-24 h-24 border-dashed border rounded flex flex-col items-center justify-center cursor-pointer text-xs text-muted-foreground hover:bg-secondary/60">
                      <ImageIcon className="h-5 w-5 mb-1" />Add
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e=>addImages(e.target.files)} />
                    </label>
                  )}
                </div>
                {fieldErrors.images && <p className="text-xs text-red-500">{fieldErrors.images}</p>}
              </div>

              {/* Brochure */}
              <div className="space-y-2">
                <Label>Brochure (PDF)</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border rounded px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-secondary/60">
                    <FileText className="h-4 w-4" /> {brochureFile ? 'Replace Brochure' : (editingProject?.brochureUrl ? 'Replace Brochure' : 'Upload Brochure')}
                    <input type="file" accept="application/pdf" className="hidden" onChange={e=>setBrochureFile(e.target.files?.[0]||null)} />
                  </label>
                  {brochureFile && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{brochureFile.name}</span>}
                  {!brochureFile && editingProject?.brochureUrl && <span className="text-xs text-green-600">Existing brochure</span>}
                  {brochureFile && <button type="button" onClick={()=>setBrochureFile(null)} className="text-xs text-red-500">Remove</button>}
                </div>
              </div>

              {/* Plans */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Plans ({floorPlans.length}/12) — Plan Image (Recommended: 1600×900 px)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFloorPlan} disabled={floorPlans.length>=12}>Add Plan</Button>
                </div>
                <div className="space-y-4">
                  {floorPlans.map((fp, idx) => (
                    <div key={fp.id} className="border rounded p-3 bg-secondary/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Plan {idx+1}</span>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" disabled={idx===0} onClick={()=>moveFloorPlan(fp.id,-1)}><ChevronUp className="h-3 w-3" /></Button>
                          <Button type="button" variant="ghost" size="icon" disabled={idx===floorPlans.length-1} onClick={()=>moveFloorPlan(fp.id,1)}><ChevronDown className="h-3 w-3" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={()=>removeFloorPlan(fp.id)}><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input placeholder="Unit Type" value={fp.unitType} onChange={e=>updateFloorPlan(fp.id,{unitType:e.target.value})} aria-invalid={!!fieldErrors[`fp_unitType_${idx}`]} />
                        <Input placeholder="Unit Size" value={fp.size} onChange={e=>updateFloorPlan(fp.id,{size:e.target.value})} aria-invalid={!!fieldErrors[`fp_size_${idx}`]} />
                        <Input placeholder="Unit" value={fp.unit} onChange={e=>updateFloorPlan(fp.id,{unit:e.target.value})} />
                        <Input placeholder="Price" value={fp.price} onChange={e=>updateFloorPlan(fp.id,{price:e.target.value})} aria-invalid={!!fieldErrors[`fp_price_${idx}`]} />
                      </div>
                      <div className={isPlotType ? "grid grid-cols-1 gap-2" : "grid grid-cols-3 gap-2"}>
                        <Input placeholder="Currency" value={fp.currency} onChange={e=>updateFloorPlan(fp.id,{currency:e.target.value})} />
                        {!isPlotType && (
                          <>
                            <Input placeholder="Bedrooms" value={fp.bedrooms} onChange={e=>updateFloorPlan(fp.id,{bedrooms:e.target.value})} aria-invalid={!!fieldErrors[`fp_bedrooms_${idx}`]} />
                            <Input placeholder="Bathrooms" value={fp.bathrooms} onChange={e=>updateFloorPlan(fp.id,{bathrooms:e.target.value})} aria-invalid={!!fieldErrors[`fp_bathrooms_${idx}`]} />
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-xs cursor-pointer border rounded px-2 py-1 hover:bg-secondary/60">
                          <Upload className="h-3 w-3" /> {fp.imageFile ? 'Change Image' : (fp.imageUrl ? 'Replace Image' : 'Add Image')}
                          <input type="file" accept="image/*" className="hidden" onChange={e=>updateFloorPlan(fp.id,{imageFile:e.target.files?.[0]||null})} />
                        </label>
                        {fp.imageFile && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{fp.imageFile.name}</span>}
                        {!fp.imageFile && fp.imageUrl && <span className="text-xs text-green-600">Existing</span>}
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs text-red-500">
                        <div>{fieldErrors[`fp_unitType_${idx}`]}</div>
                        <div>{fieldErrors[`fp_size_${idx}`]}</div>
                        <div>{fieldErrors[`fp_price_${idx}`]}</div>
                        <div>{!isPlotType ? fieldErrors[`fp_bedrooms_${idx}`] : fieldErrors[`fp_image_${idx}`]}</div>
                        <div>{!isPlotType ? fieldErrors[`fp_bathrooms_${idx}`] : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {fieldErrors.floorPlans && <p className="text-xs text-red-500">{fieldErrors.floorPlans}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingProject ? "Update Project" : "Create Project")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Hero</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hot Project</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {(project.mainImageUrl || project.mainImage) ? (
                      <img
                        src={project.mainImageUrl || project.mainImage}
                        alt={`${project.name} hero`}
                        className="h-10 w-16 rounded object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-16 rounded border bg-secondary" />
                    )}
                    <span className="text-xs text-muted-foreground">Current Hero</span>
                  </div>
                </TableCell>
                <TableCell>{project.city}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{project.propertyType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{project.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHotProject(project.id)}
                    className={project.isHotProject ? "text-yellow-600" : "text-gray-400"}
                  >
                    <Star className={`h-4 w-4 ${project.isHotProject ? "fill-current" : ""}`} />
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
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
        {(!projects.length && !loading) && <div className="text-center py-8 text-muted-foreground">No projects found</div>}
      </CardContent>
    </Card>
  );
};

export default AdminProjects;