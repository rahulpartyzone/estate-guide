import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Txt, useText } from "@/content/siteText";

/** Newsletter sign-up block, used on the home and news pages. */
const NewsletterSignup = ({ className = "" }: { className?: string }) => {
  const { t } = useText();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.subscribe(email, name || undefined);
      toast({ title: t("shared.newsletter.done") });
      setEmail("");
      setName("");
    } catch (err: any) {
      if (err?.status === 409) toast({ title: t("shared.newsletter.already") });
      else toast({ title: "Subscription failed", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`border-t bg-muted/30 py-16 ${className}`}>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight">{t("shared.newsletter.title")}</h2>
        <Txt k="shared.newsletter.text" as="p" className="text-muted-foreground" />
        <form onSubmit={subscribe} className="grid gap-3 text-left md:grid-cols-3">
          <Input placeholder={t("shared.newsletter.name")} value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoComplete="name" />
          <Input
            placeholder={t("shared.newsletter.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            autoComplete="email"
            className="h-11"
          />
          <Button type="submit" disabled={submitting} className="h-11 w-full">
            {submitting ? "…" : t("shared.newsletter.button")}
          </Button>
          <Txt k="shared.newsletter.note" as="div" className="text-center text-xs text-muted-foreground md:col-span-3" />
        </form>
      </div>
    </section>
  );
};

export default NewsletterSignup;
