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
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [floorPlans, setFloorPlans] = useState<Array<{ id: string; unitType: string; size: string; unit: string; price: string; currency: string; bedrooms: string; bathrooms: string; imageFile?: File | null; imageUrl?: string }>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [amenityOptions, setAmenityOptions] = useState<Array<{ id: string; name: string; code?: string; imageUrl?: string }>>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]); // store amenity IDs
  const { toast } = useToast();

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

  const validate = (fd: FormData) => {
    const errs: Record<string,string> = {};
    const req = (k: string, label: string) => { if (!(fd.get(k) as string)?.trim()) errs[k] = `${label} required`; };
    req('name','Name'); req('description','Description'); req('city','City'); req('area','Area'); req('builderId','Builder'); req('propertyType','Type'); req('status','Status');
    if (!editingProject && imageFiles.length === 0) errs.images = 'At least one image required';
    if (imageFiles.length + existingImages.length > 10) errs.images = 'Max 10 images';
    if (floorPlans.length > 12) errs.floorPlans = 'Max 12 floor plans';
    floorPlans.forEach((fp,i) => {
      if (!fp.unitType.trim()) errs[`fp_unitType_${i}`] = 'Required';
      if (!fp.size.trim() || isNaN(parseInt(fp.size))) errs[`fp_size_${i}`] = 'Number';
      if (!fp.price.trim() || isNaN(parseFloat(fp.price))) errs[`fp_price_${i}`] = 'Number';
      if (fp.bedrooms && isNaN(parseInt(fp.bedrooms))) errs[`fp_bedrooms_${i}`] = 'Number';
      if (fp.bathrooms && isNaN(parseInt(fp.bathrooms))) errs[`fp_bathrooms_${i}`] = 'Number';
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
      // map selected amenity IDs to names for backend compatibility
      const amenityNames = amenityOptions.filter(opt => selectedAmenities.includes(opt.id)).map(a => a.name);
      dto.amenities = amenityNames;
      // ensure placeholder if creating
      if (!editingProject) {
        dto.mainImageUrl = existingImages[0]?.url || '/placeholder.svg';
        dto.images = existingImages.map(i=>({ url: i.url }));
      } else {
        dto.mainImageUrl = editingProject.mainImageUrl || editingProject.mainImage || existingImages[0]?.url || '/placeholder.svg';
        dto.images = existingImages.map(i=>({ url: i.url }));
      }
      dto.floorPlans = floorPlans.map(fp => ({
        unitType: fp.unitType,
        size: parseInt(fp.size)||0,
        unit: fp.unit||'sqft',
        price: parseFloat(fp.price)||0,
        currency: fp.currency||'INR',
        imageUrl: fp.imageUrl || '/placeholder.svg',
        bedrooms: fp.bedrooms ? parseInt(fp.bedrooms) : undefined,
        bathrooms: fp.bathrooms ? parseInt(fp.bathrooms) : undefined,
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
      for (const file of imageFiles) {
        if (!propertyId) break;
        const contentType = file.type || 'image/jpeg';
        if (STORAGE_MODE === 'gcs') {
          const presign = await api.presignPropertyImage(propertyId, contentType);
          await api.uploadToSignedUrl(presign.uploadUrl, file, contentType);
          uploaded.push(presign.publicUrl);
        } else {
          const stored = await api.uploadFileDirect(file);
          uploaded.push(stored.url);
        }
      }

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
          size: Number.isNaN(sizeParsed) ? 0 : sizeParsed,
          unit: fp.unit || 'sqft',
          price: Number.isNaN(priceParsed) ? 0 : priceParsed,
          currency: fp.currency || 'INR',
          imageUrl,
          bedrooms: bedroomsParsed != null && !Number.isNaN(bedroomsParsed) ? bedroomsParsed : undefined,
          bathrooms: bathroomsParsed != null && !Number.isNaN(bathroomsParsed) ? bathroomsParsed : undefined,
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
        if (brochureFile.size > 8 * 1024 * 1024) { // 8MB
          throw new Error('Brochure PDF must be 8MB or smaller');
        }
        const stored = await api.uploadFileDirect(brochureFile);
        brochureUrl = stored.url;
      }
  const finalDto = { ...dto, mainImageUrl: uploaded[0] || dto.mainImageUrl, images: uploaded.map(url => ({ url })), brochureUrl, floorPlans: normalizedFloorPlans };
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
      status: fd.get('status'),
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
    if (!str) return { min: 0, max: 0, unit: 'sqft' };
    const unitMatch = str.match(/(sqft|sq\s*ft|sqm|acre|acres)/i);
    const unitRaw = unitMatch ? unitMatch[1].toLowerCase() : 'sqft';
    let unit = 'sqft';
    if (unitRaw.startsWith('sqm')) unit = 'sqm';
    else if (unitRaw.startsWith('acre')) unit = 'acre';
    const nums = (str.match(/[0-9]+/g) || []).map(n => parseInt(n,10));
    if (!nums.length) return { min: 0, max: 0, unit };
    if (nums.length === 1) return { min: nums[0], max: nums[0], unit };
    return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]), unit };
  }

  const builderSelect = useMemo(() => builderOptions.sort((a,b)=>a.name.localeCompare(b.name)), [builderOptions]);
  const resetFormState = () => {
    setEditingProject(null); setImageFiles([]); setExistingImages([]); setBrochureFile(null); setFloorPlans([]); setFieldErrors({}); setSelectedAmenities([]);
  };
  const openCreate = () => { resetFormState(); setIsDialogOpen(true); };
  const openEdit = (project: any) => {
    setEditingProject(project);
    setExistingImages((project.images || []).map((i: any) => ({ url: i.url || i })));
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
  const addImages = (files: FileList | null) => { if (!files) return; const arr = Array.from(files); setImageFiles(prev => prev.concat(arr).slice(0,10 - existingImages.length)); };
  const removeNewImage = (idx: number) => setImageFiles(list => list.filter((_,i)=>i!==idx));
  const removeExistingImage = (idx: number) => setExistingImages(list => list.filter((_,i)=>i!==idx));
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

              <div className="grid grid-cols-3 gap-4">
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
                  <Select name="propertyType" defaultValue={editingProject?.propertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Plot">Plot</SelectItem>
                      <SelectItem value="LuxuryHomes">Luxury Homes</SelectItem>
                      <SelectItem value="NewLaunch">New Launch</SelectItem>
                      <SelectItem value="Resale">Resale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingProject?.status}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UnderConstruction">Under Construction</SelectItem>
                      <SelectItem value="ReadyToMove">Ready to Move</SelectItem>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                      <SelectItem value="NewLaunch">New Launch</SelectItem>
                    </SelectContent>
                  </Select>
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    name="size"
                    defaultValue={editingProject ?
                      (editingProject.sizeMin && editingProject.sizeMax ? `${editingProject.sizeMin}-${editingProject.sizeMax} ${editingProject.sizeUnit || 'sqft'}` : (editingProject.sizeMin ? `${editingProject.sizeMin} ${editingProject.sizeUnit || 'sqft'}` : ''))
                      : undefined}
                    placeholder="e.g., 1200-2400 sqft"
                    required
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
                <Label>Images ({existingImages.length + imageFiles.length}/10)</Label>
                <div className="flex flex-wrap gap-3">
                  {existingImages.map((img, idx) => (
                    <div key={img.url+idx} className="relative w-24 h-24 rounded overflow-hidden border bg-secondary">
                      <img src={img.url} className="object-cover w-full h-full" />
                      <button type="button" onClick={()=>removeExistingImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {imageFiles.map((file, idx) => (
                    <div key={file.name+idx} className="relative w-24 h-24 rounded overflow-hidden border bg-secondary flex items-center justify-center text-[10px] p-1 text-center">
                      <span className="line-clamp-4">{file.name}</span>
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

              {/* Floor Plans */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Floor Plans ({floorPlans.length}/12)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFloorPlan} disabled={floorPlans.length>=12}>Add Floor Plan</Button>
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
                        <Input placeholder="Size" value={fp.size} onChange={e=>updateFloorPlan(fp.id,{size:e.target.value})} aria-invalid={!!fieldErrors[`fp_size_${idx}`]} />
                        <Input placeholder="Unit" value={fp.unit} onChange={e=>updateFloorPlan(fp.id,{unit:e.target.value})} />
                        <Input placeholder="Price" value={fp.price} onChange={e=>updateFloorPlan(fp.id,{price:e.target.value})} aria-invalid={!!fieldErrors[`fp_price_${idx}`]} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Currency" value={fp.currency} onChange={e=>updateFloorPlan(fp.id,{currency:e.target.value})} />
                        <Input placeholder="Bedrooms" value={fp.bedrooms} onChange={e=>updateFloorPlan(fp.id,{bedrooms:e.target.value})} aria-invalid={!!fieldErrors[`fp_bedrooms_${idx}`]} />
                        <Input placeholder="Bathrooms" value={fp.bathrooms} onChange={e=>updateFloorPlan(fp.id,{bathrooms:e.target.value})} aria-invalid={!!fieldErrors[`fp_bathrooms_${idx}`]} />
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
                        <div>{fieldErrors[`fp_bedrooms_${idx}`]}</div>
                        <div>{fieldErrors[`fp_bathrooms_${idx}`]}</div>
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