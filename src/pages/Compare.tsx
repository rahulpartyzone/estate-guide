import { useEffect, useState } from "react";
import { Txt, text, useText } from "@/content/siteText";
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
  { label: "compare.row.price", value: (p) => p.priceRange },
  { label: "compare.row.location", value: (p) => [p.area, p.city].filter(Boolean).join(", ") },
  { label: "compare.row.builder", value: (p) => p.builder },
  { label: "compare.row.type", value: (p) => PropertyTypeLabels[p.propertyType as keyof typeof PropertyTypeLabels] || p.propertyType },
  { label: "compare.row.status", value: (p) => ProjectStatusLabels[p.status as keyof typeof ProjectStatusLabels] || p.status },
  { label: "compare.row.possession", value: (p) => p.possessionTime || p.completionDate },
  { label: "compare.row.unitSizes", value: (p) => p.unitSizeRange || p.size },
  { label: "compare.row.configurations", value: (p) => p.unitVariants || p.bedroomSummary },
  { label: "compare.row.developmentSize", value: (p) => p.developmentSize },
  { label: "compare.row.totalUnits", value: (p) => (p.totalUnits ? p.totalUnits.toLocaleString("en-IN") : "") },
  { label: "compare.row.towers", value: (p) => p.towersBlocks },
  { label: "compare.row.floorPlans", value: (p) => (p.floorPlans?.length ? `${p.floorPlans.length}` : "") },
  { label: "compare.row.amenities", value: (p) => (p.amenities?.length ? `${p.amenities.length}: ${p.amenities.slice(0, 8).join(", ")}${p.amenities.length > 8 ? "…" : ""}` : "") },
  { label: "compare.row.rera", value: (p) => p.reraId },
  { label: "compare.row.brochure", value: (p) => (p.brochureUrl ? text("compare.row.brochureYes") : text("compare.row.brochureNo")) },
  { label: "compare.row.media", value: (p) => [p.videoUrl && text("compare.row.video"), p.virtualTourUrl && text("compare.row.tour")].filter(Boolean).join(", ") },
];

const Compare = () => {
  usePageTitle("Compare projects");
  const ids = useCompareIds();
  const { t } = useText();
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
          <Scale className="h-8 w-8 text-primary" aria-hidden="true" /> {t("compare.title")}
        </h1>
        <Txt k="compare.subtitle" as="p" className="text-muted-foreground mb-8" />

        {loading && !projects.length && <div className="text-sm text-muted-foreground">{t("compare.loading")}</div>}

        {!loading && !ids.length && (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-foreground font-medium mb-1">{t("compare.emptyTitle")}</p>
            <Txt k="compare.emptyText" as="p" className="text-sm text-muted-foreground mb-6" />
            <Link to="/projects"><Button>{t("compare.emptyButton")}</Button></Link>
          </div>
        )}

        {projects.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 align-top">
                  <th className="text-left p-4 w-40 font-medium text-muted-foreground">{t("compare.row.project")}</th>
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
                    <th scope="row" className="text-left p-4 font-medium text-muted-foreground">{t(row.label)}</th>
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
                      <Link to={`/project/${p.id}`}><Button size="sm" className="w-full">{t("compare.viewProject")}</Button></Link>
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
