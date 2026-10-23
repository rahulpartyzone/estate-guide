import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailX } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { usePageTitle } from "@/lib/pageTitle";

/**
 * Landing page for the "Unsubscribe" link in newsletters. It asks for a click rather than
 * unsubscribing on page load, because email security scanners open links automatically.
 */
const Unsubscribe = () => {
  usePageTitle("Unsubscribe");
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
                <h1 className="text-2xl font-semibold">You're unsubscribed</h1>
                <p className="text-muted-foreground">You won't get any more newsletters from us.</p>
              </>
            ) : state === "invalid" ? (
              <>
                <MailX className="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 className="text-2xl font-semibold">This link doesn't work</h1>
                <p className="text-muted-foreground">
                  It may be from a test email, or you may already be unsubscribed. If you're still getting emails, reply to one and we'll remove you.
                </p>
              </>
            ) : (
              <>
                <MailX className="mx-auto h-10 w-10 text-primary" />
                <h1 className="text-2xl font-semibold">Unsubscribe from our newsletter?</h1>
                <p className="text-muted-foreground">You'll stop getting updates about new projects and offers.</p>
                {state === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
                <Button className="w-full" onClick={unsubscribe} disabled={state === "working"}>
                  {state === "working" ? "Unsubscribing…" : "Yes, unsubscribe me"}
                </Button>
              </>
            )}
            <Button asChild variant="link">
              <Link to="/">Back to the home page</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Unsubscribe;
