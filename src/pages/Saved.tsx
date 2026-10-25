import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/pageTitle";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { mapBackendProperty } from "@/lib/propertyMapper";
import { useSavedIds } from "@/lib/saved";
import { openBuyerLogin, useBuyerState } from "@/lib/buyer";
import { Txt, useText } from "@/content/siteText";
import type { Property } from "@/types/property";

const Saved = () => {
  usePageTitle("Saved projects");
  const savedIds = useSavedIds();
  const { buyer, loaded: buyerLoaded } = useBuyerState();
  const { t, show } = useText();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!savedIds.length) {
      setProperties([]);
      return;
    }
    setLoading(true);
    Promise.allSettled(savedIds.map((id) => api.getProperty(id)))
      .then((results) => {
        if (cancelled) return;
        const found = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && Boolean(r.value))
          .map((r) => mapBackendProperty(r.value));
        setProperties(found);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [savedIds]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t("saved.title")}</h1>
        <p className="text-muted-foreground mb-8">
          {t(buyer ? "saved.subtitleBuyer" : "saved.subtitleGuest")} {t("saved.subtitleHint")}
        </p>

        {buyerLoaded && !buyer && show("saved.signInTitle") && (
          <div className="mb-8 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">{t("saved.signInTitle")}</p>
              <Txt k="saved.signInText" as="p" className="text-sm text-muted-foreground" />
            </div>
            <Button onClick={() => openBuyerLogin()} className="shrink-0">
              {t("saved.signInButton")}
            </Button>
          </div>
        )}

        {loading && properties.length === 0 && <div className="text-sm text-muted-foreground">{t("saved.loading")}</div>}

        {!loading && savedIds.length === 0 && (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-foreground font-medium mb-1">{t("saved.emptyTitle")}</p>
            <Txt k="saved.emptyText" as="p" className="text-sm text-muted-foreground mb-6" />
            <Link to="/projects">
              <Button>{t("saved.emptyButton")}</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Saved;
