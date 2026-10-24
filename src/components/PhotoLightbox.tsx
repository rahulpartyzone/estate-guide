import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PhotoLightboxProps {
  images: string[];
  title: string;
  open: boolean;
  startIndex?: number;
  onOpenChange: (open: boolean) => void;
}

/** Full-screen photo viewer: swipe on phones, arrow keys or buttons on desktop, thumbnails below. */
const PhotoLightbox = ({ images, title, open, startIndex = 0, onOpenChange }: PhotoLightboxProps) => {
  const [emblaRef, embla] = useEmblaCarousel({ loop: images.length > 1, startIndex });
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  // Jump to the photo that was clicked each time the viewer opens
  useEffect(() => {
    if (open && embla) embla.scrollTo(startIndex, true);
  }, [open, startIndex, embla]);

  const prev = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  if (!images.length) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col text-white outline-none"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">{title} photos</DialogPrimitive.Title>

          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-semibold">{title}</div>
              <div className="text-sm text-white/60">
                {index + 1} / {images.length}
              </div>
            </div>
            <DialogPrimitive.Close className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="h-full overflow-hidden" ref={emblaRef}>
              <div className="flex h-full">
                {images.map((src, i) => (
                  <div key={`${src}-${i}`} className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-2 md:px-16">
                    <img
                      src={src}
                      alt={`${title}, photo ${i + 1}`}
                      className="max-h-full max-w-full select-none object-contain"
                      loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 md:flex"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 md:flex"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3 md:justify-center md:px-6">
              {images.map((src, i) => (
                <button
                  key={`thumb-${src}-${i}`}
                  type="button"
                  onClick={() => embla?.scrollTo(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-md transition ${
                    i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default PhotoLightbox;
