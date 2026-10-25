import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Centered (default) or left-aligned with `action` on the right */
  align?: "center" | "left";
  /** A link or buttons shown on the right of a left-aligned heading */
  action?: ReactNode;
  className?: string;
};

/** Small label + heading + text used at the top of home-page sections. Each part is skipped when empty. */
const SectionHeading = ({ eyebrow, title, subtitle, align = "center", action, className }: Props) => {
  if (!eyebrow && !title && !subtitle && !action) return null;
  const centered = align === "center";
  return (
    <div className={cn(centered ? "mx-auto mb-10 max-w-2xl text-center md:mb-12" : "mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
        {title && <h2 className="text-3xl font-bold text-foreground md:text-4xl">{title}</h2>}
        {subtitle && <p className={cn("mt-2 text-muted-foreground", centered ? "md:text-lg" : "")}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
};

export default SectionHeading;
