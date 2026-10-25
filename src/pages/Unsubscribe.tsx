import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailX } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { usePageTitle } from "@/lib/pageTitle";
import { Txt, useText } from "@/content/siteText";

/**
 * Landing page for the "Unsubscribe" link in newsletters. It asks for a click rather than
 * unsubscribing on page load, because email security scanners open links automatically.
 */
const Unsubscribe = () => {
  usePageTitle("Unsubscribe");
  const { t } = useText();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"idle" | "working" | "done" | "invalid" | "error">(token ? "idle" : "invalid");

  const unsubscribe = async () => {
    setState("working");
    try {
      await api.unsubscribe(token);
      setState("done");
    } catch (e: any) {
      setState(e?.status === 404 || e?.status === 400 ? "invalid" : "error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto flex justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-8 text-center">
            {state === "done" ? (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h1 className="text-2xl font-semibold">{t("other.unsub.doneTitle")}</h1>
                <Txt k="other.unsub.doneText" as="p" className="text-muted-foreground" />
              </>
            ) : state === "invalid" ? (
              <>
                <MailX className="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 className="text-2xl font-semibold">{t("other.unsub.invalidTitle")}</h1>
                <Txt k="other.unsub.invalidText" as="p" className="text-muted-foreground" />
              </>
            ) : (
              <>
                <MailX className="mx-auto h-10 w-10 text-primary" />
                <h1 className="text-2xl font-semibold">{t("other.unsub.title")}</h1>
                <Txt k="other.unsub.text" as="p" className="text-muted-foreground" />
                {state === "error" && <p className="text-sm text-destructive">{t("other.unsub.error")}</p>}
                <Button className="w-full" onClick={unsubscribe} disabled={state === "working"}>
                  {state === "working" ? t("other.unsub.working") : t("other.unsub.button")}
                </Button>
              </>
            )}
            <Button asChild variant="link">
              <Link to="/">{t("other.unsub.home")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Unsubscribe;
