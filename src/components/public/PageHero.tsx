import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  backgroundImageUrl?: string;
  badgeText?: string;
  icon?: ReactNode;
  className?: string;
};

const PageHero = ({ title, subtitle, backgroundImageUrl, badgeText, icon, className }: PageHeroProps) => {
  const hasImage = Boolean(backgroundImageUrl);

  return (
    <section className={cn("relative border-b overflow-hidden min-h-[300px] md:min-h-[360px] flex items-center", className)}>
      {hasImage ? (
        <>
          <div className="absolute inset-0 bg-cover bg-center md:bg-fixed scale-105" style={{ backgroundImage: `url(${backgroundImageUrl})` }} />
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-subtle" />
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {(icon || badgeText) && (
          <div className="flex items-center justify-center gap-3 mb-3">
            {icon ? (
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", hasImage ? "bg-white/20" : "bg-primary/10")}>
                {icon}
              </div>
            ) : null}
            {badgeText ? <Badge variant="secondary">{badgeText}</Badge> : null}
          </div>
        )}

        <h1 className={cn("text-4xl md:text-5xl font-bold", hasImage ? "text-white" : "text-foreground")}>{title}</h1>
        {subtitle ? (
          <p className={cn("text-xl max-w-3xl mx-auto mt-3", hasImage ? "text-white/90" : "text-muted-foreground")}>{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
};

export default PageHero;
