import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

/** Admin -> Settings: Google Analytics 4 and Meta Pixel IDs. The website loads them on the next page view. */
const AdminAnalyticsSettings = () => {
  const { toast } = useToast();
  const [ga4, setGa4] = useState("");
  const [pixel, setPixel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getAdminSiteProfile()
      .then((p: any) => {
        setGa4(p?.ga4MeasurementId || "");
        setPixel(p?.metaPixelId || "");
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const g = ga4.trim().toUpperCase();
    const p = pixel.trim();
    if (g && !/^G-[A-Z0-9]{4,20}$/.test(g)) return toast({ title: "GA4 Measurement ID looks like G-XXXXXXXXXX", variant: "destructive" });
    if (p && !/^[0-9]{6,20}$/.test(p)) return toast({ title: "Meta Pixel ID is a number, e.g. 123456789012345", variant: "destructive" });
    setSaving(true);
    try {
      await api.upsertAdminSiteProfile({ ga4MeasurementId: g, metaPixelId: p } as any);
      toast({ title: "Analytics settings saved", description: "They apply to new page loads on the website." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Settings · Analytics & ad tracking</CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste your IDs to measure visits and count every lead as a conversion: <code>generate_lead</code> in Google
          Analytics and <code>Lead</code> in Meta. Leave a box empty to turn that service off. Admin pages are never tracked.
        </p>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ga4">Google Analytics 4 Measurement ID</Label>
              <Input id="ga4" value={ga4} onChange={(e) => setGa4(e.target.value)} placeholder="G-XXXXXXXXXX" />
              <p className="text-xs text-muted-foreground">Google Analytics → Admin → Data streams → your website.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pixel">Meta (Facebook / Instagram) Pixel ID</Label>
              <Input id="pixel" value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder="123456789012345" inputMode="numeric" />
              <p className="text-xs text-muted-foreground">Meta Events Manager → Data sources → your pixel.</p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save analytics settings
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAnalyticsSettings;
