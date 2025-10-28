import { useParams } from "react-router-dom";
import { getPropertyById } from "@/data/properties";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Home, Calendar, Download, Phone, Mail, Share, Heart, Bath, Bed, Ruler } from "lucide-react";
import MapView from "@/components/MapView";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PropertyTypeLabels, ProjectStatusLabels } from '@/constants/enums';
import { toast } from "sonner";
import { mapBackendProperty, formatINRShort } from '@/lib/propertyMapper';
import type { Property } from '@/types/property';

const ProjectDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [galleryApi, setGalleryApi] = useState<CarouselApi | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [otpOpen, setOtpOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<'enter-contact'|'enter-otp'>('enter-contact');
  const [otpBusy, setOtpBusy] = useState(false);
  const [usingWidget, setUsingWidget] = useState(false);
  const hasBrochure = !!property?.brochureUrl;
  const [amenityCatalog, setAmenityCatalog] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await api.getProperty(id);
        if (cancelled) return;
        setProperty(mapBackendProperty(p));
      } catch (e: any) {
        if (cancelled) return;
        // fallback to sample if available
        const sample = getPropertyById(id);
        if (sample) setProperty(sample);
        setError(e?.message || 'Failed to load property');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listAmenities();
        const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
        let API_ORIGIN = window.location.origin;
        try { API_ORIGIN = new URL(RAW_API_BASE).origin; } catch {}
        const fixUrl = (u?: string) => {
          if (!u) return u;
          if (/^https?:\/\//i.test(u)) return u;
          if (u.startsWith('/api/')) return `${API_ORIGIN}${u}`;
          return u;
        };
        setAmenityCatalog((list||[]).map((a:any)=> ({ ...a, imageUrl: fixUrl(a.imageUrl) })));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!galleryApi) return;
    const onSelect = () => setActiveIndex(galleryApi.selectedScrollSnap());
    galleryApi.on("select", onSelect);
    // initialize selection
    onSelect();
    return () => {
      galleryApi.off("select", onSelect);
    };
  }, [galleryApi]);

  if (!property && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-8">The property you're looking for doesn't exist.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const handleDownloadBrochure = async () => {
    if (!hasBrochure) {
      toast.error('Brochure not available for this property yet');
      return;
    }
    setOtpOpen(true);
    setOtpStep('enter-contact');
    setContact('');
    setOtp('');
    // Default to widget flow for brochure download
    setUsingWidget(true);
  };

  // Widget flow is the default for brochure download

  const submitContact = async () => {
    if (!id) return;
  if (!contact.trim()) { toast.error('Enter phone number'); return; }
    if (otpBusy) return; // prevent double-click racing
    setOtpBusy(true);
    try {
      if (usingWidget) {
        const widgetId = (import.meta as any).env?.VITE_MSG91_WIDGET_ID as string | undefined;
        const tokenAuth = (import.meta as any).env?.VITE_MSG91_TOKEN_AUTH as string | undefined;
        if (!widgetId) { toast.error('Missing VITE_MSG91_WIDGET_ID'); return; }
        // @ts-ignore
        if (typeof (window as any).configureMsg91Widget !== 'function') { toast.error('MSG91 widget script not loaded'); return; }
  // Normalize identifier: strip all non-digits (remove '+', spaces, dashes, etc.)
        const rawDigits = contact.trim().replace(/[^\d]/g, '');
        let digits = rawDigits;
        // If 11 digits and starts with '0', strip the leading zero to get 10-digit local number
        if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
          digits = rawDigits.slice(1);
        }
        const identifier = digits.length === 10 ? `91${digits}` : digits;
  if (!identifier || identifier.length < 10) { toast.error('Enter a valid phone number'); return; }
        // Do NOT pass identifier during init to avoid auto-send; just init with exposeMethods
        // @ts-ignore
        await (window as any).configureMsg91Widget({ widgetId, tokenAuth });
        // @ts-ignore
        await (window as any).widgetSendOtp(identifier);
        setOtpStep('enter-otp');
        setContact(identifier);
        toast.success('OTP sent');
      } else {
        const payload = /@/.test(contact) ? { email: contact.trim() } : { phone: contact.trim() };
        await api.requestBrochureOtp(id, payload);
        setOtpStep('enter-otp');
        toast.success('OTP sent');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send OTP');
    } finally { setOtpBusy(false); }
  };

  const submitOtp = async () => {
    if (!id) return;
    if (!otp.trim()) { toast.error('Enter OTP'); return; }
    setOtpBusy(true);
    try {
      if (usingWidget) {
        // @ts-ignore
        if (typeof (window as any).widgetVerifyOtp !== 'function') { toast.error('MSG91 widget not configured'); return; }
        // @ts-ignore
        const result = await (window as any).widgetVerifyOtp(otp.trim());
        const token = (result && (result.message || result.token || result.accessToken || result?.data?.token || result?.data?.accessToken));
        if (result.type !== "success" || !token) { toast.error('No access token from widget'); return; }
  const res = await api.verifyBrochureWidget(id, token, { phone: contact, propertyName: property?.name });
        // Absolutize /api/... URLs to backend origin
        const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
        let API_ORIGIN = window.location.origin;
        try { API_ORIGIN = new URL(RAW_API_BASE).origin; } catch {}
        const finalUrl = res.downloadUrl?.startsWith('/api/') ? `${API_ORIGIN}${res.downloadUrl}` : res.downloadUrl;
        window.open(finalUrl, '_blank');
        setOtpOpen(false);
      } else {
        const res = await api.verifyBrochureOtp(id, { otp: otp.trim(), contact: contact.trim() });
        const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
        let API_ORIGIN = window.location.origin;
        try { API_ORIGIN = new URL(RAW_API_BASE).origin; } catch {}
        const url = res.downloadUrl?.startsWith('/api/') ? `${API_ORIGIN}${res.downloadUrl}` : res.downloadUrl;
        window.open(url, '_blank');
        setOtpOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Invalid OTP');
    } finally { setOtpBusy(false); }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property.name,
        text: property.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleWishlist = () => {
    toast.success("Added to wishlist!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {loading && (
        <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground">Loading property...</div>
      )}
      {error && (
        <div className="container mx-auto px-4 pt-2 text-sm text-red-500">{error}</div>
      )}

      {/* Hero Image Section */}
      {property && (
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <img
          src={property.mainImage}
          alt={property.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Floating Action Buttons */}
        <div className="absolute top-6 right-6 flex gap-3">
          <Button 
            size="icon" 
            variant="secondary" 
            className="bg-white/90 hover:bg-white"
            onClick={handleShare}
          >
            <Share className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="secondary" 
            className="bg-white/90 hover:bg-white"
            onClick={handleWishlist}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Property Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="container mx-auto">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-accent text-accent-foreground">
                  {PropertyTypeLabels[property.propertyType as keyof typeof PropertyTypeLabels] || property.propertyType}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {ProjectStatusLabels[property.status as keyof typeof ProjectStatusLabels] || property.status}
                </Badge>
                {property.isHotProject && (
                  <Badge className="bg-red-500 text-white">🔥 Hot Project</Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                {property.name}
              </h1>
              <div className="flex items-center text-white/90 text-lg mb-4">
                <MapPin className="h-5 w-5 mr-2" />
                {property.area}, {property.city}
              </div>
              <p className="text-white/80 text-lg max-w-2xl">
                {property.description}
              </p>
            </div>
          </div>
        </div>
  </section>
  )}

      {/* Main Content */}
      {property && (
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="gallery">Gallery</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Project Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {(() => {
                        const bedroomLabel = property.bedroomSummary || (property.bedrooms != null ? String(property.bedrooms) : undefined);
                        return bedroomLabel ? (
                        <div className="text-center p-3 bg-secondary rounded-lg">
                          <Bed className="h-6 w-6 text-primary mx-auto mb-2" />
                          <div className="text-sm text-muted-foreground">Bedrooms</div>
                          <div className="font-semibold">{bedroomLabel} BHK</div>
                        </div>
                        ) : null;
                      })()}
                      {(() => {
                        const bathroomLabel = property.bathroomSummary || (property.bathrooms != null ? String(property.bathrooms) : undefined);
                        return bathroomLabel ? (
                        <div className="text-center p-3 bg-secondary rounded-lg">
                          <Bath className="h-6 w-6 text-primary mx-auto mb-2" />
                          <div className="text-sm text-muted-foreground">Bathrooms</div>
                          <div className="font-semibold">{bathroomLabel}</div>
                        </div>
                        ) : null;
                      })()}
                      <div className="text-center p-3 bg-secondary rounded-lg">
                        <Home className="h-6 w-6 text-primary mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">Size</div>
                        <div className="font-semibold text-xs">{property.size}</div>
                      </div>
                      <div className="text-center p-3 bg-secondary rounded-lg">
                        <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">Completion</div>
                        <div className="font-semibold text-xs">{property.completionDate || "TBA"}</div>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description} This exceptional project by {property.builder} offers 
                      modern living with premium amenities and strategic location advantages.
                    </p>
                  </Card>
                  {property.floorPlans?.length ? (
                    <Card className="p-6 space-y-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-foreground">Floor Plans</h2>
                          <p className="text-sm text-muted-foreground">Explore the configurations available for this project.</p>
                        </div>
                        <div className="text-xs font-medium uppercase text-muted-foreground">
                          {property.floorPlans.length} option{property.floorPlans.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Carousel opts={{ align: "start" }} className="pt-2">
                        <CarouselContent>
                          {property.floorPlans.map((plan, index) => {
                            const planTitle = plan.type?.trim() || `Option ${index + 1}`;
                            const hasBedrooms = typeof plan.bedrooms === "number" && !Number.isNaN(plan.bedrooms);
                            const hasBathrooms = typeof plan.bathrooms === "number" && !Number.isNaN(plan.bathrooms);
                            const rawPlanPrice = plan.price?.trim();
                            const priceValue = typeof plan.priceValue === "number" && !Number.isNaN(plan.priceValue)
                              ? plan.priceValue
                              : (rawPlanPrice && !Number.isNaN(Number(rawPlanPrice)) ? Number(rawPlanPrice) : undefined);
                            const planPrice = plan.formattedPrice?.trim()
                              || (priceValue != null ? formatINRShort(priceValue) : rawPlanPrice);
                            const planSize = plan.size?.trim();
                            return (
                              <CarouselItem key={`${planTitle}-${index}`} className="basis-full">
                                <div className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-card shadow-sm">
                                  <div className="relative w-full overflow-hidden rounded-t-2xl bg-muted">
                                    {plan.image ? (
                                      <img
                                        src={plan.image}
                                        alt={`${property.name} ${planTitle} floor plan`}
                                        className="h-[26rem] w-full object-contain bg-white"
                                        loading={index < 2 ? "eager" : "lazy"}
                                      />
                                    ) : (
                                      <div className="flex h-[26rem] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <span className="text-sm font-medium">Floor plan preview coming soon</span>
                                        <span className="text-xs">Upload a high-resolution image to showcase this layout.</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-4 px-6 pb-6">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                                      <div>
                                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Configuration</span>
                                        <h3 className="text-xl font-semibold text-foreground">{planTitle}</h3>
                                      </div>
                                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-full bg-secondary px-3 py-1 font-medium">
                                          Plan {index + 1} of {property.floorPlans.length}
                                        </span>
                                        {planPrice && (
                                          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                                            {planPrice}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {(planSize || hasBedrooms || hasBathrooms) && (
                                      <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                                        {planSize && (
                                          <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                                            <Ruler className="h-4 w-4 text-primary" />
                                            <span>{planSize}</span>
                                          </div>
                                        )}
                                        {hasBedrooms && (
                                          <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                                            <Bed className="h-4 w-4 text-primary" />
                                            <span>{plan.bedrooms} BHK</span>
                                          </div>
                                        )}
                                        {hasBathrooms && (
                                          <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                                            <Bath className="h-4 w-4 text-primary" />
                                            <span>{plan.bathrooms} Bath{plan.bathrooms === 1 ? "" : "s"}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {planPrice && (
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Tip:</span> Provide price per square foot or payment schedule details to help buyers compare plans.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CarouselItem>
                            );
                          })}
                        </CarouselContent>
                        <CarouselPrevious className="-left-4 top-1/2 -translate-y-1/2 shadow-md" aria-label="Previous floor plan" />
                        <CarouselNext className="-right-4 top-1/2 -translate-y-1/2 shadow-md" aria-label="Next floor plan" />
                      </Carousel>
                    </Card>
                  ) : null}
                </TabsContent>

                <TabsContent value="amenities" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Amenities & Features</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border-t border-l border-border">
                      {property.amenities.map((amenity, index) => {
                        const meta = amenityCatalog.find((a:any) => a.name?.toLowerCase() === amenity.toLowerCase());
                        return (
                          <div
                            key={meta?.code || meta?.id || index}
                            className="flex flex-col items-center justify-center gap-2 p-6 border-b border-r border-border text-center"
                          >
                            {meta?.imageUrl ? (
                              <img
                                src={meta.imageUrl}
                                alt={amenity}
                                className="h-24 w-24 object-contain opacity-90"
                                loading={index < 4 ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <div className="h-24 w-24 flex items-center justify-center">
                                <div className="h-3 w-3 rounded-full bg-primary/70" />
                              </div>
                            )}
                            <span className="text-sm md:text-base text-foreground/80">{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="location" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Location & Connectivity</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Address</h3>
                        <p className="text-muted-foreground">{property.area}, {property.city}</p>
                      </div>
                      {property.coordinates ? (
                        <>
                          <MapView lat={property.coordinates.lat} lng={property.coordinates.lng} height="16rem" label={property.name} />
                          <div className="mt-2 text-right">
                            <a
                              href={`https://www.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Open in Google Maps
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="h-64 bg-secondary rounded-lg flex flex-col items-center justify-center gap-2">
                          <p className="text-muted-foreground">Interactive Map Coming Soon</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.area + ', ' + property.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Search this location in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="gallery" className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Photo Gallery</h2>
                    {property.images?.length ? (
                      <div className="relative">
                        {/* Thumbnails */}
                        <ScrollArea className="w-full mb-4">
                          <div className="flex gap-2 pr-4">
                            {property.images.map((thumb: string, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => galleryApi?.scrollTo(idx)}
                                className={`relative h-16 w-24 rounded-md overflow-hidden ring-1 transition ${
                                  activeIndex === idx ? "ring-2 ring-primary" : "ring-border hover:ring-primary/50"
                                }`}
                                aria-label={`Go to image ${idx + 1}`}
                              >
                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>

                        {/* Main slider */}
                        <Carousel className="w-full" setApi={setGalleryApi}>
                          <CarouselContent>
                            {property.images.map((image: string, index: number) => (
                              <CarouselItem key={index}>
                                <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
                                  <img
                                    src={image}
                                    alt={`${property.name} - ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading={index === 0 ? "eager" : "lazy"}
                                  />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="-left-3 md:-left-6" aria-label="Previous image" />
                          <CarouselNext className="-right-3 md:-right-6" aria-label="Next image" />
                        </Carousel>
                        <div className="mt-3 text-center text-xs text-muted-foreground">
                          Use arrows or swipe to browse images
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-secondary/50 rounded-lg flex items-center justify-center text-muted-foreground">
                        No images available
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price & CTA Card */}
              <Card className="p-6 sticky top-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {property.priceRange}
                  </div>
                  <div className="text-muted-foreground">
                    {property.size}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-primary text-lg py-6"
                    onClick={handleDownloadBrochure}
                    disabled={!hasBrochure}
                    title={!hasBrochure ? 'Brochure not available' : undefined}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Brochure
                  </Button>
                  
                  {!hasBrochure && (
                    <div className="text-xs text-muted-foreground text-center">
                      Brochure not available for this property yet.
                    </div>
                  )}
                  
                  <Button variant="outline" className="w-full py-6">
                    <Phone className="h-5 w-5 mr-2" />
                    Schedule Site Visit
                  </Button>

                  <Button variant="outline" className="w-full py-6">
                    <Mail className="h-5 w-5 mr-2" />
                    Get More Info
                  </Button>
                </div>
              </Card>

              {/* Builder Info */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Built By</h3>
                <div className="text-center">
                  {property.builderLogoUrl ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden border bg-white mx-auto mb-3 flex items-center justify-center">
                      <img
                        src={property.builderLogoUrl}
                        alt={`${property.builder} logo`}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Home className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <h4 className="font-semibold text-lg">{property.builder}</h4>
                  <p className="text-sm text-muted-foreground">Premium Developer</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Brochure OTP Dialog */}
      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Brochure</DialogTitle>
          </DialogHeader>
          {otpStep === 'enter-contact' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter your phone number to receive an OTP.</p>
              <Input
                placeholder="Phone number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                disabled={otpBusy}
                inputMode="tel"
                autoComplete="tel"
              />
              <Button className="w-full" onClick={submitContact} disabled={otpBusy}>
                {otpBusy ? 'Sending…' : 'Send OTP'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the OTP sent to {contact}.</p>
              <Input
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={otpBusy}
              />
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => setOtpStep('enter-contact')} disabled={otpBusy}>
                  Back
                </Button>
                <Button className="flex-1" onClick={submitOtp} disabled={otpBusy}>
                  {otpBusy ? 'Verifying…' : 'Verify & Download'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// OTP Dialog UI inside the component (appended at end of return)

export default ProjectDetail;