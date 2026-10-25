import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, RotateCcw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { TEXT_FIELDS, TEXT_GROUPS, type TextField } from "@/content/catalog";
import { setSiteTextOverrides, type TextOverrides } from "@/content/siteText";

type Draft = { value: string; hidden: boolean };

const errText = (e: any) => (Array.isArray(e?.message) ? e.message.join(", ") : e?.message || "Something went wrong");

function fromSaved(saved: TextOverrides, field: TextField): Draft {
  const o = saved[field.key];
  return { value: o?.value ?? field.default, hidden: Boolean(o?.hidden) && !field.required };
}

/** Admin -> Settings -> Site text: every label on the public site, by page and block. */
const AdminSiteText = () => {
  const { toast } = useToast();
  const [saved, setSaved] = useState<TextOverrides>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupId, setGroupId] = useState(TEXT_GROUPS[0].id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .getAdminSiteText()
      .then((map) => setSaved(map || {}))
      .catch((e) => toast({ title: "Couldn't load site text", description: errText(e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const current = (field: TextField): Draft => drafts[field.key] ?? fromSaved(saved, field);
  const isDirty = (field: TextField) => {
    const d = drafts[field.key];
    if (!d) return false;
    const s = fromSaved(saved, field);
    return d.value !== s.value || d.hidden !== s.hidden;
  };
  const isEdited = (field: TextField) => {
    const d = current(field);
    return d.value !== field.default || d.hidden;
  };

  const dirtyKeys = useMemo(
    () => Object.keys(drafts).filter((k) => {
      const field = TEXT_FIELDS.get(k);
      return field ? isDirty(field) : false;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, saved],
  );

  const update = (field: TextField, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [field.key]: { ...current(field), ...patch } }));

  const save = async () => {
    if (!dirtyKeys.length) return;
    const empty = dirtyKeys.find((k) => !drafts[k].value.trim() && !drafts[k].hidden);
    setSaving(true);
    try {
      const items = dirtyKeys.map((key) => {
        const field = TEXT_FIELDS.get(key)!;
        const d = drafts[key];
        // An empty box goes back to the default wording; use the switch to hide a label instead.
        const value = !d.value.trim() || d.value === field.default ? null : d.value;
        return { key, value, hidden: field.required ? false : d.hidden };
      });
      const next = await api.saveSiteText(items);
      setSaved(next || {});
      setDrafts({});
      setSiteTextOverrides(next || {});
      toast({
        title: "Site text saved",
        description: empty ? "Empty boxes went back to the default wording." : "Changes show on the website within a minute.",
      });
    } catch (e) {
      toast({ title: "Couldn't save", description: errText(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const q = query.trim().toLowerCase();
  const matches = (field: TextField) =>
    !q || field.label.toLowerCase().includes(q) || field.default.toLowerCase().includes(q) || current(field).value.toLowerCase().includes(q);

  const groupsToShow = q ? TEXT_GROUPS : TEXT_GROUPS.filter((g) => g.id === groupId);
  const editedCount = (groupIdToCount: string) =>
    TEXT_GROUPS.find((g) => g.id === groupIdToCount)!.blocks.reduce((n, b) => n + b.fields.filter(isEdited).length, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading site text…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Site text</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the wording of headings, buttons, links and messages on the website, or switch a label off to remove it. Leave a box empty
              to go back to the original wording. Words in {"{curly braces}"} are filled in by the site; keep them.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Find a label, e.g. “Download Brochure”" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Pages */}
        {!q && (
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TEXT_GROUPS.map((g) => {
              const n = editedCount(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupId(g.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    g.id === groupId ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <span>{g.name}</span>
                  {n > 0 && (
                    <span className={`rounded-full px-1.5 text-xs ${g.id === groupId ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>{n}</span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        <div className={`space-y-4 ${q ? "lg:col-span-2" : ""}`}>
          {groupsToShow.map((group) => {
            const blocks = group.blocks.map((b) => ({ ...b, fields: b.fields.filter(matches) })).filter((b) => b.fields.length);
            if (!blocks.length) return null;
            return (
              <div key={group.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    {group.note && <p className="text-sm text-muted-foreground">{group.note}</p>}
                  </div>
                  {group.path && (
                    <a href={group.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      View page <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {blocks.map((block) => (
                  <Card key={block.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{block.name}</CardTitle>
                      {block.where && <p className="text-xs text-muted-foreground">{block.where}</p>}
                    </CardHeader>
                    <CardContent className="divide-y">
                      {block.fields.map((field) => {
                        const d = current(field);
                        const edited = d.value !== field.default;
                        const Box = field.multiline ? Textarea : Input;
                        return (
                          <div key={field.key} className={`grid gap-2 py-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-start ${d.hidden ? "opacity-60" : ""}`}>
                            <div className="pt-2 text-sm">
                              <div className="font-medium">{field.label}</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {edited && <Badge variant="secondary" className="text-[10px]">Edited</Badge>}
                                {d.hidden && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                                {isDirty(field) && <Badge className="bg-amber-500 text-[10px] hover:bg-amber-500">Not saved</Badge>}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Box
                                value={d.value}
                                rows={field.multiline ? 3 : undefined}
                                placeholder={field.default}
                                disabled={d.hidden}
                                onChange={(e: any) => update(field, { value: e.target.value })}
                              />
                              {(field.help || edited) && (
                                <p className="text-xs text-muted-foreground">
                                  {field.help}
                                  {field.help && edited ? " · " : ""}
                                  {edited && <>Original: “{field.default.length > 90 ? `${field.default.slice(0, 90)}…` : field.default}”</>}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 pt-1.5 md:justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Back to the original wording"
                                disabled={!edited && !d.hidden}
                                onClick={() => update(field, { value: field.default, hidden: false })}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <label className="flex items-center gap-2 text-xs text-muted-foreground" title={field.required ? "The page needs this label, so it can be reworded but not removed" : undefined}>
                                <Switch checked={!d.hidden} disabled={field.required} onCheckedChange={(on) => update(field, { hidden: !on })} />
                                {field.required ? "Always shown" : d.hidden ? "Hidden" : "Shown"}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
          {q && !TEXT_GROUPS.some((g) => g.blocks.some((b) => b.fields.some(matches))) && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">No labels match “{query}”.</CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save bar */}
      {dirtyKeys.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm">
            {dirtyKeys.length} change{dirtyKeys.length === 1 ? "" : "s"} not saved
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDrafts({})} disabled={saving}>
              Discard
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSiteText;
