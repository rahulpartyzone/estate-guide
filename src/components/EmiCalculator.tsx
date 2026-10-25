import { useMemo, useState } from "react";
import { Txt, useText } from "@/content/siteText";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { inr, inrShort, monthlyEmi } from "@/lib/emi";

type Props = {
  priceMin?: number;
  priceMax?: number;
  /** Opens the "get more information" form, e.g. for home-loan help */
  onLoanHelp?: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Home-loan EMI estimate for a project, using its price range. Indicative only. */
const EmiCalculator = ({ priceMin, priceMax, onLoanHelp }: Props) => {
  const lo = priceMin && priceMin > 0 ? priceMin : priceMax && priceMax > 0 ? priceMax : 5_000_000;
  const hi = Math.max(lo, priceMax && priceMax > 0 ? priceMax : lo);
  const [price, setPrice] = useState(lo);
  const { t, show } = useText();
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const loan = Math.max(0, price * (1 - downPct / 100));
  const emi = useMemo(() => monthlyEmi(loan, rate, years), [loan, rate, years]);
  const totalPaid = emi * years * 12;
  const interest = Math.max(0, totalPaid - loan);
  const step = Math.max(10_000, Math.round((hi - lo) / 100 / 10_000) * 10_000 || 10_000);

  return (
    <Card className="p-6">
      <Txt k="project.emi.title" as="h2" className="text-2xl font-bold text-foreground flex items-center gap-2 mb-1" before={<Calculator className="h-6 w-6 text-primary" aria-hidden="true" />} />
      <Txt k="project.emi.subtitle" as="p" className="text-sm text-muted-foreground mb-6" />

      <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>{t("project.emi.price")}</Label>
          <span className="font-medium tabular-nums">{inrShort(price)}</span>
        </div>
        {hi > lo ? (
          <Slider min={lo} max={hi} step={step} value={[price]} onValueChange={([v]) => setPrice(v)} aria-label={t("project.emi.price")} />
        ) : (
          <Input type="number" min={100000} step={100000} value={Math.round(price)} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} aria-label={t("project.emi.price")} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>{t("project.emi.down")}</Label>
          <span className="font-medium tabular-nums">{downPct}% · {inrShort(price * downPct / 100)}</span>
        </div>
        <Slider min={10} max={90} step={5} value={[downPct]} onValueChange={([v]) => setDownPct(v)} aria-label="Down payment percent" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="emi-rate">{t("project.emi.rate")}</Label>
          <Input id="emi-rate" type="number" inputMode="decimal" min={1} max={20} step={0.05} value={rate}
            onChange={(e) => setRate(clamp(Number(e.target.value) || 0, 0, 30))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emi-years">{t("project.emi.term")}</Label>
          <Input id="emi-years" type="number" inputMode="numeric" min={1} max={30} step={1} value={years}
            onChange={(e) => setYears(clamp(Math.round(Number(e.target.value) || 0), 1, 30))} />
        </div>
      </div>
      </div>

      <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-primary/5 border border-primary/15 p-5 space-y-1">
        <div className="text-sm text-muted-foreground">{t("project.emi.monthly")}</div>
        <div className="text-4xl font-bold text-foreground tabular-nums">{inr(emi)}</div>
        <div className="text-xs text-muted-foreground">for {years} year{years === 1 ? "" : "s"} at {rate}% a year</div>
        <div className="grid grid-cols-3 gap-2 pt-3 text-xs">
          <div><div className="text-muted-foreground">{t("project.emi.loan")}</div><div className="font-medium tabular-nums">{inrShort(loan)}</div></div>
          <div><div className="text-muted-foreground">{t("project.emi.interest")}</div><div className="font-medium tabular-nums">{inrShort(interest)}</div></div>
          <div><div className="text-muted-foreground">{t("project.emi.total")}</div><div className="font-medium tabular-nums">{inrShort(totalPaid)}</div></div>
        </div>
      </div>

      <Txt k="project.emi.note" as="p" className="text-xs text-muted-foreground" />
      {onLoanHelp && show("project.emi.help") && (
        <Button variant="outline" className="w-full mt-auto" onClick={onLoanHelp}>{t("project.emi.help")}</Button>
      )}
      </div>
      </div>
    </Card>
  );
};

export default EmiCalculator;
