import { useEffect, useState } from "react";
import { useBuyer } from "@/lib/buyer";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

export type EnquiryMode = "site_visit" | "info";

type Props = {
  mode: EnquiryMode | null;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
};

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/** Site-visit and information request form on the project page. Creates a lead and alerts the sales team. */
const ProjectEnquiryDialog = ({ mode, onClose, propertyId, propertyName }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const buyer = useBuyer();

  useEffect(() => {
    if (mode) {
      setDone(false);
      // Signed-in buyers don't have to type their details again
      if (buyer) {
        setName((v) => v || buyer.name || "");
        setPhone((v) => v || buyer.phone.replace(/\D/g, "").slice(-10));
        setEmail((v) => v || buyer.email || "");
      }
      setMessage(mode === "info" ? `I'd like more details about ${propertyName}: pricing, floor plans and availability.` : "");
    }
  }, [mode, propertyName, buyer]);

  const isVisit = mode === "site_visit";
  const phoneDigits = phone.replace(/\D/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    if (phoneDigits.length < 10) return toast.error("Please enter a valid 10-digit phone number");
    setSaving(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, message: message.trim() || undefined };
      if (isVisit) await api.createSiteVisitLead(propertyId, { ...payload, preferredDate: date || undefined });
      else await api.createInfoLead(propertyId, payload);
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message || "Could not send your request. Please try again or call us.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(mode)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" aria-hidden="true" />
            <DialogTitle>Thank you, {name.split(" ")[0] || "we got it"}!</DialogTitle>
            <DialogDescription>
              {isVisit
                ? `Our team will call you on ${phone} to confirm your visit to ${propertyName}.`
                : `Our team will call you on ${phone} with details about ${propertyName}.`}
            </DialogDescription>
            <Button onClick={onClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isVisit ? "Schedule a site visit" : "Get more information"}</DialogTitle>
              <DialogDescription>{propertyName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="enq-name">Your name</Label>
                <Input id="enq-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-phone">Phone number</Label>
                <Input id="enq-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="98765 43210" required maxLength={16} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-email">Email (optional)</Label>
                <Input id="enq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              {isVisit && (
                <div className="space-y-1.5">
                  <Label htmlFor="enq-date">Preferred date (optional)</Label>
                  <Input id="enq-date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="enq-message">Message (optional)</Label>
                <Textarea id="enq-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isVisit ? "Request site visit" : "Send request"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">We'll only use your details to contact you about this project.</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectEnquiryDialog;
