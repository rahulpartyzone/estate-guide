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
  /** Extra content under the heading, e.g. the search panel on the projects page */
  children?: ReactNode;
};

/** The photo banner at the top of the projects, builders, news and about pages. */
const PageHero = ({ title, subtitle, backgroundImageUrl, badgeText, icon, className, children }: PageHeroProps) => {
  const hasImage = Boolean(backgroundImageUrl);

  return (
    <section className={cn("relative border-b", children ? "" : "min-h-[260px] md:min-h-[360px] flex items-center", className)}>
      {/* Only the photo is clipped, so menus inside the banner (search suggestions) can drop below it */}
      <div className="absolute inset-0 overflow-hidden">
        {hasImage ? (
          <>
            <div className="absolute inset-0 scale-105 bg-cover bg-center md:bg-fixed" style={{ backgroundImage: `url(${backgroundImageUrl})` }} />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-subtle" />
        )}
      </div>

      <div className={cn("container relative z-10 mx-auto px-4 sm:px-6 lg:px-8", children ? "pt-8 pb-8 md:pt-16 md:pb-14" : "py-12 text-center")}>
        <div className={cn("text-center", children ? "mb-5 md:mb-8" : "")}>
          {(icon || badgeText) && (
            <div className="mb-3 flex items-center justify-center gap-3">
              {icon ? (
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", hasImage ? "bg-white/20" : "bg-primary/10")}>{icon}</div>
              ) : null}
              {badgeText ? <Badge variant="secondary">{badgeText}</Badge> : null}
            </div>
          )}
          <h1 className={cn("text-3xl font-bold md:text-5xl", hasImage ? "text-white" : "text-foreground")}>{title}</h1>
          {subtitle ? (
            <p className={cn("mx-auto mt-2 max-w-3xl text-base md:mt-3 md:text-xl", hasImage ? "text-white/90" : "text-muted-foreground")}>{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
};

export default PageHero;
