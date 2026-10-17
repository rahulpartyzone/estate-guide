import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const propertyTypes = ["Apartments", "Villas", "Plots"];
const budgetRanges = ["80L - 1Cr", "1 - 1.5Cr", "1.5 - 2Cr", "2 - 2.5Cr", "2.5 - 3Cr", "3 - 4Cr", "4Cr+"];

type Props = {
  sourcePage: "landing" | "builders" | "projects";
  className?: string;
};

const LeadPreferenceForm = ({ sourcePage, className }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    preferredPropertyType: "",
    preferredBudgetRange: "",
    preferredLocation: "",
    name: "",
    phone: "",
    email: "",
    homeLoanAssistance: "",
  });

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.preferredPropertyType || !form.preferredBudgetRange || !form.preferredLocation.trim() || !form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.homeLoanAssistance) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await api.createPreferenceLead({
        preferredPropertyType: form.preferredPropertyType,
        preferredBudgetRange: form.preferredBudgetRange,
        preferredLocation: form.preferredLocation.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        homeLoanAssistance: form.homeLoanAssistance as "yes" | "no",
        sourcePage,
      });
      toast({ title: "Request submitted", description: "Our experts will contact you shortly." });
      setForm({
        preferredPropertyType: "",
        preferredBudgetRange: "",
        preferredLocation: "",
        name: "",
        phone: "",
        email: "",
        homeLoanAssistance: "",
      });
    } catch (e: any) {
      toast({ title: "Submission failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={className || "py-12"}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card p-5 md:p-7 space-y-6 shadow-sm">
          <div>
            <h3 className="text-2xl md:text-3xl font-semibold">Let the Experts help you find the Best Property</h3>
            <p className="text-muted-foreground mt-2">A FREE initiative — we charge zero commission or brokerage.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-3">
              <Label>Select Property Type *</Label>
              <div className="flex flex-wrap gap-2">
                {propertyTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setField("preferredPropertyType", type)}
                    className={`px-4 py-2 rounded-md border text-sm ${form.preferredPropertyType === type ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary/70"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Budget Range *</Label>
                <div className="flex flex-wrap gap-2">
                  {budgetRanges.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setField("preferredBudgetRange", range)}
                      className={`px-3 py-2 rounded-md border text-sm ${form.preferredBudgetRange === range ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary/70"}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`preferredLocation-${sourcePage}`}>Location Preference *</Label>
                <Input
                  id={`preferredLocation-${sourcePage}`}
                  value={form.preferredLocation}
                  onChange={(e) => setField("preferredLocation", e.target.value)}
                  placeholder="Please mention preferred city, area"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`name-${sourcePage}`}>Your Name *</Label>
                <Input id={`name-${sourcePage}`} value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`phone-${sourcePage}`}>Contact Number *</Label>
                <Input id={`phone-${sourcePage}`} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Mobile Number" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`email-${sourcePage}`}>Your Email Address *</Label>
              <Input id={`email-${sourcePage}`} type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>

            <div className="space-y-3">
              <Label>Do you require home loan assistance? *</Label>
              <div className="flex gap-3">
                {[
                  { label: "Yes", value: "yes" },
                  { label: "No", value: "no" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("homeLoanAssistance", opt.value)}
                    className={`px-5 py-2 rounded-md border text-sm ${form.homeLoanAssistance === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary/70"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <Button type="submit" className="w-full md:w-auto min-w-[260px]" disabled={saving}>
                {saving ? "Submitting..." : "SUBMIT YOUR CHOICE"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default LeadPreferenceForm;
