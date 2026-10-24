import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeIndianRupee, CheckCircle2, Headset, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useBuyer } from "@/lib/buyer";

const propertyTypes = ["Apartments", "Villas", "Plots"];
const budgetRanges = ["Under 80L", "80L - 1Cr", "1 - 1.5Cr", "1.5 - 2Cr", "2 - 2.5Cr", "2.5 - 3Cr", "3 - 4Cr", "4Cr+"];
const loanOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Not sure", value: "" },
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
            <h2 className="text-2xl font-semibold leading-tight md:text-4xl">Let our experts find the right home for you</h2>
            <p className="mt-3 text-white/80">Tell us what you're looking for. We'll shortlist matching projects and call you back.</p>
            <ul className="mt-6 space-y-4 text-sm md:text-base">
              <li className="flex gap-3">
                <BadgeIndianRupee className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <strong className="text-white">Free of charge.</strong> <span className="text-white/80">We charge zero commission or brokerage.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <strong className="text-white">RERA-registered projects,</strong> <span className="text-white/80">with the details on every listing.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Headset className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <strong className="text-white">One person to talk to,</strong> <span className="text-white/80">from site visits to home-loan help.</span>
                </span>
              </li>
            </ul>
          </div>

          {/* The form */}
          <div className="p-6 md:p-10 lg:col-span-3">
            {step === "done" ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                <h3 className="mt-4 font-display text-2xl font-semibold">Thank you, {form.name.split(" ")[0]}!</h3>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Our expert will call you on {form.phone} with projects that match {form.preferredPropertyType.toLowerCase()} in{" "}
                  {form.preferredLocation} ({form.preferredBudgetRange}).
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <Link to="/projects">Browse projects meanwhile</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm((f) => ({ ...EMPTY, name: f.name, phone: f.phone, email: f.email }));
                      setLoanTouched(false);
                      setStep(1);
                    }}
                  >
                    Send another request
                  </Button>
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
                    Step {step} of 2 · {step === 1 ? "What you're looking for" : "How we can reach you"}
                  </span>
                </div>

                {step === 1 ? (
                  <form onSubmit={next} className="space-y-6">
                    <div className="space-y-3">
                      <Label>Property type</Label>
                      <div className="flex flex-wrap gap-2">
                        {propertyTypes.map((type) => (
                          <button key={type} type="button" onClick={() => setField("preferredPropertyType", type)} className={chip(form.preferredPropertyType === type)}>
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Budget</Label>
                      <div className="flex flex-wrap gap-2">
                        {budgetRanges.map((range) => (
                          <button key={range} type="button" onClick={() => setField("preferredBudgetRange", range)} className={chip(form.preferredBudgetRange === range)}>
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`preferredLocation-${sourcePage}`}>Preferred location</Label>
                      <Input
                        id={`preferredLocation-${sourcePage}`}
                        value={form.preferredLocation}
                        onChange={(e) => setField("preferredLocation", e.target.value)}
                        placeholder="City or area, e.g. Kakkanad, Kochi"
                        className="h-11"
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full gap-2 sm:w-auto sm:min-w-[220px]">
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${sourcePage}`}>Your name</Label>
                        <Input id={`name-${sourcePage}`} autoComplete="name" className="h-11" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`phone-${sourcePage}`}>Mobile number</Label>
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
                        Email <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input id={`email-${sourcePage}`} type="email" autoComplete="email" className="h-11" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <Label>Need help with a home loan?</Label>
                      <div className="flex flex-wrap gap-2">
                        {loanOptions.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              setField("homeLoanAssistance", opt.value);
                              setLoanTouched(true);
                            }}
                            className={chip(loanTouched && form.homeLoanAssistance === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
                      <Button type="button" variant="ghost" className="gap-2" onClick={() => setStep(1)} disabled={saving}>
                        <ArrowLeft className="h-4 w-4" /> Back
                      </Button>
                      <Button type="submit" size="lg" className="gap-2 sm:min-w-[220px]" disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Get a call back
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">We'll only use your details to help with your home search.</p>
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
