import { useEffect, useState } from "react";
import SectionHeading from "@/components/public/SectionHeading";
import { shown, text, useText } from "@/content/siteText";
import { BadgeCheck, FileText, Quote, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { absolutizeApiUrl } from "@/lib/url";

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  rating?: number;
  photoUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentMimeType?: string | null;
};

const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080/api/v1";
const fileUrl = (u?: string | null) => (u ? absolutizeApiUrl(u, RAW_API_BASE) : "");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

/** Published testimonials from the admin. Renders nothing until at least one is published. */
const Testimonials = ({ className = "" }: { className?: string }) => {
  useText();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [viewing, setViewing] = useState<Testimonial | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listTestimonials()
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data.slice(0, 6) : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className={`py-16 bg-background ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title={text("shared.testimonials.title")} subtitle={text("shared.testimonials.subtitle")} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => {
            const rating = Math.max(0, Math.min(5, Math.round(t.rating || 0)));
            const subtitle = [t.role, t.company].filter(Boolean).join(", ");
            const isPdf = t.attachmentMimeType === "application/pdf";
            return (
              <Card key={t.id} className="h-full">
                <CardContent className="p-6 flex flex-col h-full gap-4">
                  <Quote className="h-6 w-6 text-primary/60" aria-hidden="true" />
                  <p className="text-foreground/90 leading-relaxed flex-1">{t.content}</p>

                  {t.attachmentUrl &&
                    (isPdf ? (
                      <a
                        href={fileUrl(t.attachmentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {text("shared.testimonials.viewLetter")}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewing(t)}
                        className="group flex items-center gap-3 text-left text-sm text-primary"
                      >
                        <img
                          src={fileUrl(t.attachmentUrl)}
                          alt={text("shared.testimonials.noteFrom", { name: t.name })}
                          loading="lazy"
                          className="h-16 w-12 rounded border object-cover shadow-sm"
                        />
                        <span className="group-hover:underline">{text("shared.testimonials.viewNote")}</span>
                      </button>
                    ))}

                  {rating > 0 && (
                    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {t.photoUrl ? (
                      <img src={fileUrl(t.photoUrl)} alt={t.name} loading="lazy" className="h-11 w-11 rounded-full object-cover border" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground" aria-hidden="true">
                        {initials(t.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="truncate">{t.name}</span>
                        {t.attachmentUrl && shown("shared.testimonials.verified") && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary whitespace-nowrap">
                            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                            {text("shared.testimonials.verified")}
                          </span>
                        )}
                      </div>
                      {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{text("shared.testimonials.noteFrom", { name: viewing?.name })}</DialogTitle>
          {viewing?.attachmentUrl && (
            <img
              src={fileUrl(viewing.attachmentUrl)}
              alt={text("shared.testimonials.noteFrom", { name: viewing.name })}
              className="w-full max-h-[75vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Testimonials;
