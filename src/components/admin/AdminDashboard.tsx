import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

type MonthRow = { month: string; label: string; total: number; site_visit: number; info: number; brochure: number; preference: number };
type Stats = {
  properties: number;
  builders: number;
  leads: number;
  subscribers: number;
  testimonials: number;
  leadsLast7Days: number;
  leadsLast30Days: number;
  newLeads: number;
  leadsByMonth: MonthRow[];
  topProjects: { id: string; name: string; views: number; saves: number; leads: number }[];
};

const TYPE_LABELS: [keyof MonthRow, string][] = [
  ["site_visit", "Site visits"],
  ["info", "Info requests"],
  ["brochure", "Brochures"],
  ["preference", "Preferences"],
];

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold text-foreground mt-1 tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MonthTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row: MonthRow = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <div className="font-medium text-foreground mb-1">
        {row.label}: {row.total} lead{row.total === 1 ? "" : "s"}
      </div>
      {TYPE_LABELS.map(([key, label]) => (
        <div key={key} className="flex justify-between gap-6 text-muted-foreground">
          <span>{label}</span>
          <span className="tabular-nums text-foreground">{row[key] as number}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAdminStats()
      .then(setStats)
      .catch((e: any) => setError(e?.message || "Could not load the dashboard"));
  }, []);

  if (error) return <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>;
  if (!stats) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const months = stats.leadsByMonth || [];
  const thisMonth = months[months.length - 1];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Tile label="New leads to follow up" value={stats.newLeads} hint="Status: New" />
        <Tile label="Leads, last 7 days" value={stats.leadsLast7Days} />
        <Tile label="Leads, last 30 days" value={stats.leadsLast30Days} />
        <Tile label="All leads" value={stats.leads} />
        <Tile label="Projects" value={stats.properties} />
        <Tile label="Builders" value={stats.builders} />
        <Tile label="Newsletter subscribers" value={stats.subscribers} />
        <Tile label="Published testimonials" value={stats.testimonials} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Leads per month{thisMonth ? `: ${thisMonth.total} so far in ${thisMonth.label}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64" role="img" aria-label={`Leads per month: ${months.map((m) => `${m.label} ${m.total}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip content={<MonthTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  {TYPE_LABELS.map(([key, label]) => <TableHead key={key} className="text-right">{label}</TableHead>)}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...months].reverse().map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{m.label}</TableCell>
                    {TYPE_LABELS.map(([key]) => <TableCell key={key} className="text-right tabular-nums">{m[key] as number}</TableCell>)}
                    <TableCell className="text-right tabular-nums font-medium">{m.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top projects</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topProjects.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Page views</TableHead>
                  <TableHead className="text-right">Saves</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.views}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.saves}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No projects yet.</div>
          )}
          <p className="text-xs text-muted-foreground mt-3">Page views and saves are counted from this release onwards.</p>
        </CardContent>
      </Card>
    </div>
  );
}
