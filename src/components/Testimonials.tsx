import { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  rating?: number;
};

/** Published testimonials from the admin. Renders nothing until at least one is published. */
const Testimonials = ({ className = "" }: { className?: string }) => {
  const [items, setItems] = useState<Testimonial[]>([]);

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
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">What Our Clients Say</h2>
          <p className="text-muted-foreground">Families and investors who found their home with us</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => {
            const rating = Math.max(0, Math.min(5, Math.round(t.rating || 0)));
            const subtitle = [t.role, t.company].filter(Boolean).join(", ");
            return (
              <Card key={t.id} className="h-full">
                <CardContent className="p-6 flex flex-col h-full gap-4">
                  <Quote className="h-6 w-6 text-primary/60" aria-hidden="true" />
                  <p className="text-foreground/90 leading-relaxed flex-1">{t.content}</p>
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
                  <div>
                    <div className="font-semibold text-foreground">{t.name}</div>
                    {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
