import { Link, useLocation } from "react-router-dom";
import { useText } from "@/content/siteText";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE, clearCompare, useCompareIds } from "@/lib/compare";

/** Floating bar shown while projects are picked for comparison. */
const CompareBar = () => {
  const ids = useCompareIds();
  const { pathname } = useLocation();
  const { t, show } = useText();
  if (!ids.length || pathname.startsWith("/admin") || pathname === "/compare") return null;
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md ${pathname.startsWith("/project/") ? "bottom-20 lg:bottom-4" : "bottom-4"}`}>
      <div className="flex items-center justify-between gap-3 rounded-full border bg-background/95 backdrop-blur px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>
            {t("shared.compareBar.picked", { count: ids.length, max: MAX_COMPARE })}
            {ids.length < 2 && show("shared.compareBar.pickMore") ? t("shared.compareBar.pickMore") : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/compare">
            <Button size="sm" disabled={ids.length < 2}>{t("shared.compareBar.button")}</Button>
          </Link>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearCompare} aria-label="Clear comparison">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;
