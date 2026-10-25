import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeIndianRupee, CheckCircle2, Headset, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useBuyer } from "@/lib/buyer";
import { Txt, useText } from "@/content/siteText";

const loanOptions = [
  { key: "shared.expert.loanYes", value: "yes" },
  { key: "shared.expert.loanNo", value: "no" },
  { key: "shared.expert.loanUnsure", value: "" },
];

type Props = {
  sourcePage: "landing" | "builders" | "projects";
  className?: string;
};

const EMPTY = { preferredPropertyType: "", preferredBudgetRange: "", preferredLocation: "", name: "", phone: "", email: "", homeLoanAssistance: "" };

const chip = (active: boolean) =>
  `rounded-full border px-4 py-2 text-sm transition-colors ${
    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
  }`;

/** "Let our experts help": a short two-step form (what you're looking for, then how to reach you). */
const LeadPreferenceForm = ({ sourcePage, className }: Props) => {
  const { toast } = useToast();
  const buyer = useBuyer();
  const { t, show, lines } = useText();
  // Options are edited in Settings -> Site text, one per line
  const propertyTypes = lines("shared.expert.types");
  const budgetRanges = lines("shared.expert.budgets");
  const [step, setStep] = useState<1 | 2 | "done">(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loanTouched, setLoanTouched] = useState(false);

  // Signed-in buyers don't have to type their details again
  useEffect(() => {
    if (!buyer) return;
    setForm((f) => ({
      ...f,
      name: f.name || buyer.name || "",
      phone: f.phone || buyer.phone.replace(/\D/g, "").slice(-10),
      email: f.email || buyer.email || "",
    }));
  }, [buyer]);

  const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const phoneDigits = form.phone.replace(/\D/g, "");

  const next = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.preferredPropertyType) return toast({ title: "Pick a property type", variant: "destructive" });
    if (!form.preferredBudgetRange) return toast({ title: "Pick a budget", variant: "destructive" });
    if (!form.preferredLocation.trim()) return toast({ title: "Tell us where you'd like to live", variant: "destructive" });
    setStep(2);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return toast({ title: "Please enter your name", variant: "destructive" });
    if (phoneDigits.length < 10) return toast({ title: "Please enter a valid 10-digit mobile number", variant: "destructive" });
    setSaving(true);
    try {
      await api.createPreferenceLead({
        preferredPropertyType: form.preferredPropertyType,
        preferredBudgetRange: form.preferredBudgetRange,
        preferredLocation: form.preferredLocation.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        homeLoanAssistance: (form.homeLoanAssistance || undefined) as "yes" | "no" | undefined,
        sourcePage,
      });
      setStep("done");
    } catch (e: any) {
      const msg = Array.isArray(e?.message) ? e.message.join(", ") : e?.message;
      toast({ title: "Couldn't send your request", description: msg || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={className || "py-12"}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl border bg-card shadow-sm lg:grid-cols-5">
          {/* Why talk to us */}
          <div className="bg-gradient-hero p-6 text-white md:p-10 lg:col-span-2">
            <h2 className="text-2xl font-semibold leading-tight md:text-4xl">{t("shared.expert.title")}</h2>
            <Txt k="shared.expert.intro" as="p" className="mt-3 text-white/80" />
            <ul className="mt-6 space-y-4 text-sm md:text-base">
              {([
                [BadgeIndianRupee, "shared.expert.point1Title", "shared.expert.point1Text"],
                [ShieldCheck, "shared.expert.point2Title", "shared.expert.point2Text"],
                [Headset, "shared.expert.point3Title", "shared.expert.point3Text"],
              ] as const).map(([Icon, titleKey, textKey]) =>
                show(titleKey) || show(textKey) ? (
                  <li key={titleKey} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span>
                      <Txt k={titleKey} as="strong" className="text-white" /> <Txt k={textKey} className="text-white/80" />
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>

          {/* The form */}
          <div className="p-6 md:p-10 lg:col-span-3">
            {step === "done" ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                <h3 className="mt-4 font-display text-2xl font-semibold">{t("shared.expert.thanksTitle", { name: form.name.split(" ")[0] })}</h3>
                <Txt
                  k="shared.expert.thanksText"
                  vars={{ phone: form.phone, type: form.preferredPropertyType.toLowerCase(), location: form.preferredLocation, budget: form.preferredBudgetRange }}
                  as="p"
                  className="mt-2 max-w-md text-muted-foreground"
                />
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {show("shared.expert.browse") && (
                    <Button asChild>
                      <Link to="/projects">{t("shared.expert.browse")}</Link>
                    </Button>
                  )}
                  {show("shared.expert.another") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm((f) => ({ ...EMPTY, name: f.name, phone: f.phone, email: f.email }));
                      setLoanTouched(false);
                      setStep(1);
                    }}
                  >
                    {t("shared.expert.another")}
                  </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-1.5 w-10 rounded-full bg-primary" />
                    <span className={`h-1.5 w-10 rounded-full ${step === 2 ? "bg-primary" : "bg-muted"}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t("shared.expert.stepOf", { step })} · {t(step === 1 ? "shared.expert.step1" : "shared.expert.step2")}
                  </span>
                </div>

                {step === 1 ? (
                  <form onSubmit={next} className="space-y-6">
                    <div className="space-y-3">
                      <Label>{t("shared.expert.type")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {propertyTypes.map((type) => (
                          <button key={type} type="button" onClick={() => setField("preferredPropertyType", type)} className={chip(form.preferredPropertyType === type)}>
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>{t("shared.expert.budget")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {budgetRanges.map((range) => (
                          <button key={range} type="button" onClick={() => setField("preferredBudgetRange", range)} className={chip(form.preferredBudgetRange === range)}>
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`preferredLocation-${sourcePage}`}>{t("shared.expert.location")}</Label>
                      <Input
                        id={`preferredLocation-${sourcePage}`}
                        value={form.preferredLocation}
                        onChange={(e) => setField("preferredLocation", e.target.value)}
                        placeholder={t("shared.expert.locationPlaceholder")}
                        className="h-11"
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full gap-2 sm:w-auto sm:min-w-[220px]">
                      {t("shared.expert.next")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${sourcePage}`}>{t("shared.expert.name")}</Label>
                        <Input id={`name-${sourcePage}`} autoComplete="name" className="h-11" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`phone-${sourcePage}`}>{t("shared.expert.phone")}</Label>
                        <Input
                          id={`phone-${sourcePage}`}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          className="h-11"
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                          placeholder="98765 43210"
                          maxLength={16}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`email-${sourcePage}`}>
                        {t("shared.expert.email")} <Txt k="shared.expert.optional" className="font-normal text-muted-foreground" />
                      </Label>
                      <Input id={`email-${sourcePage}`} type="email" autoComplete="email" className="h-11" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <Label>{t("shared.expert.loan")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {loanOptions.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setField("homeLoanAssistance", opt.value);
                              setLoanTouched(true);
                            }}
                            className={chip(loanTouched && form.homeLoanAssistance === opt.value)}
                          >
                            {t(opt.key)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
                      <Button type="button" variant="ghost" className="gap-2" onClick={() => setStep(1)} disabled={saving}>
                        <ArrowLeft className="h-4 w-4" /> {t("shared.expert.back")}
                      </Button>
                      <Button type="submit" size="lg" className="gap-2 sm:min-w-[220px]" disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t("shared.expert.submit")}
                      </Button>
                    </div>
                    <Txt k="shared.expert.privacy" as="p" className="text-xs text-muted-foreground" />
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadPreferenceForm;
