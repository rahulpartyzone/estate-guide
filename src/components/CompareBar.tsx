import { Link, useLocation } from "react-router-dom";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE, clearCompare, useCompareIds } from "@/lib/compare";

/** Floating bar shown while projects are picked for comparison. */
const CompareBar = () => {
  const ids = useCompareIds();
  const { pathname } = useLocation();
  if (!ids.length || pathname.startsWith("/admin") || pathname === "/compare") return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center justify-between gap-3 rounded-full border bg-background/95 backdrop-blur px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>
            {ids.length} of {MAX_COMPARE} picked{ids.length < 2 ? ": pick one more to compare" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/compare">
            <Button size="sm" disabled={ids.length < 2}>Compare</Button>
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
