import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Scale, X } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { mapBackendProperty } from "@/lib/propertyMapper";
import { removeFromCompare, useCompareIds } from "@/lib/compare";
import { usePageTitle } from "@/lib/pageTitle";
import { PropertyTypeLabels, ProjectStatusLabels } from "@/constants/enums";
import type { Property } from "@/types/property";

type RowDef = { label: string; value: (p: Property) => React.ReactNode };

const ROWS: RowDef[] = [
  { label: "Price", value: (p) => p.priceRange },
  { label: "Location", value: (p) => [p.area, p.city].filter(Boolean).join(", ") },
  { label: "Builder", value: (p) => p.builder },
  { label: "Type", value: (p) => PropertyTypeLabels[p.propertyType as keyof typeof PropertyTypeLabels] || p.propertyType },
  { label: "Status", value: (p) => ProjectStatusLabels[p.status as keyof typeof ProjectStatusLabels] || p.status },
  { label: "Possession", value: (p) => p.possessionTime || p.completionDate },
  { label: "Unit sizes", value: (p) => p.unitSizeRange || p.size },
  { label: "Configurations", value: (p) => p.unitVariants || p.bedroomSummary },
  { label: "Development size", value: (p) => p.developmentSize },
  { label: "Total units", value: (p) => (p.totalUnits ? p.totalUnits.toLocaleString("en-IN") : "") },
  { label: "Towers / blocks", value: (p) => p.towersBlocks },
  { label: "Floor plans", value: (p) => (p.floorPlans?.length ? `${p.floorPlans.length}` : "") },
  { label: "Amenities", value: (p) => (p.amenities?.length ? `${p.amenities.length}: ${p.amenities.slice(0, 8).join(", ")}${p.amenities.length > 8 ? "…" : ""}` : "") },
  { label: "RERA", value: (p) => p.reraId },
  { label: "Brochure", value: (p) => (p.brochureUrl ? "Available" : "Not yet") },
  { label: "Video / virtual tour", value: (p) => [p.videoUrl && "Video", p.virtualTourUrl && "Virtual tour"].filter(Boolean).join(", ") },
];

const Compare = () => {
  usePageTitle("Compare projects");
  const ids = useCompareIds();
  const [projects, setProjects] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ids.length) {
      setProjects([]);
      return;
    }
    setLoading(true);
    Promise.allSettled(ids.map((id) => api.getProperty(id)))
      .then((results) => {
        if (cancelled) return;
        setProjects(
          results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && Boolean(r.value))
            .map((r) => mapBackendProperty(r.value)),
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Scale className="h-8 w-8 text-primary" aria-hidden="true" /> Compare projects
        </h1>
        <p className="text-muted-foreground mb-8">Pick up to 3 projects with "Add to comparison" on any project page.</p>

        {loading && !projects.length && <div className="text-sm text-muted-foreground">Loading…</div>}

        {!loading && !ids.length && (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-foreground font-medium mb-1">Nothing to compare yet</p>
            <p className="text-sm text-muted-foreground mb-6">Open a project and tap "Add to comparison".</p>
            <Link to="/projects"><Button>Browse projects</Button></Link>
          </div>
        )}

        {projects.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 align-top">
                  <th className="text-left p-4 w-40 font-medium text-muted-foreground">Project</th>
                  {projects.map((p) => (
                    <th key={p.id} className="text-left p-4 min-w-[220px] font-normal">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => removeFromCompare(p.id)}
                          className="absolute -top-1 -right-1 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label={`Remove ${p.name} from comparison`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Link to={`/project/${p.id}`} className="block">
                          <img src={p.mainImage} alt="" className="w-full aspect-[4/3] object-cover rounded-md mb-3" loading="lazy" />
                          <div className="font-semibold text-foreground hover:underline pr-6">{p.name}</div>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-t align-top">
                    <th scope="row" className="text-left p-4 font-medium text-muted-foreground">{row.label}</th>
                    {projects.map((p) => {
                      const v = row.value(p);
                      return <td key={p.id} className="p-4 text-foreground">{v || <span className="text-muted-foreground">-</span>}</td>;
                    })}
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="p-4" />
                  {projects.map((p) => (
                    <td key={p.id} className="p-4">
                      <Link to={`/project/${p.id}`}><Button size="sm" className="w-full">View project</Button></Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Compare;
