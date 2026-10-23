import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Mail, Monitor, Pause, Plus, RotateCcw, Send, Smartphone, Trash2, X } from "lucide-react";
import { api, type Newsletter, type NewsletterInput, type NewsletterProgress } from "@/lib/api";

const errText = (e: any) => (Array.isArray(e?.message) ? e.message.join(", ") : e?.message || "Something went wrong");

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

const StatusBadge = ({ n }: { n: Pick<Newsletter, "status" | "sentCount" | "failedCount" | "recipientCount"> }) => {
  if (n.status === "draft") return <Badge variant="secondary">Draft</Badge>;
  if (n.status === "sending") return <Badge className="bg-amber-500 hover:bg-amber-500">Sending</Badge>;
  return <Badge className="bg-emerald-600 hover:bg-emerald-600">Sent</Badge>;
};

interface Overview {
  data: Newsletter[];
  activeSubscribers: number;
  mailConfigured: boolean;
  siteUrl: string;
}

const AdminNewsletters = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = useState<Newsletter | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await api.listNewsletters());
    } catch (e) {
      toast({ title: "Couldn't load newsletters", description: errText(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const duplicate = async (n: Newsletter) => {
    try {
      const copy = await api.duplicateNewsletter(n.id);
      toast({ title: "Copied to a new draft" });
      setEditing({ id: copy.id });
    } catch (e) {
      toast({ title: "Couldn't duplicate", description: errText(e), variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.deleteNewsletter(deleting.id);
      toast({ title: "Newsletter deleted" });
      load();
    } catch (e) {
      toast({ title: "Couldn't delete", description: errText(e), variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (editing) {
    return (
      <NewsletterEditor
        id={editing.id}
        overview={overview}
        onBack={() => {
          setEditing(null);
          load();
        }}
        onCreated={(id) => setEditing({ id })}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Newsletters</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Write an update, feature a few projects and email it to your{" "}
            {overview ? <strong>{overview.activeSubscribers}</strong> : ""} active subscribers.
          </p>
        </div>
        <Button onClick={() => setEditing({})} className="gap-2">
          <Plus className="h-4 w-4" /> New newsletter
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {overview && !overview.mailConfigured && (
          <Alert variant="destructive">
            <AlertTitle>Email sending isn't set up</AlertTitle>
            <AlertDescription>
              Add <code>BREVO_API_KEY</code> and <code>MAIL_FROM_EMAIL</code> to the API project's environment variables on Vercel, then
              redeploy. You can still write drafts.
            </AlertDescription>
          </Alert>
        )}
        {loading && !overview && <div className="text-sm text-muted-foreground">Loading…</div>}
        {overview && overview.data.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No newsletters yet</p>
            <p className="text-sm text-muted-foreground">New launches, price updates or a festive offer are good reasons to write one.</p>
            <Button className="mt-4 gap-2" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Write the first one
            </Button>
          </div>
        )}
        {overview && overview.data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.data.map((n) => (
                  <TableRow key={n.id} className="cursor-pointer" onClick={() => setEditing({ id: n.id })}>
                    <TableCell className="max-w-[320px] font-medium">
                      <span className="line-clamp-1">{n.subject || <span className="text-muted-foreground">(no subject)</span>}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge n={n} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {n.status === "draft" ? (
                        "—"
                      ) : (
                        <>
                          {n.sentCount} of {n.recipientCount}
                          {n.failedCount > 0 && <span className="ml-1 text-destructive">({n.failedCount} failed)</span>}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {n.status === "sent" ? `Sent ${formatDate(n.sentAt)}` : `Edited ${formatDate(n.updatedAt)}`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" title="Duplicate" onClick={() => duplicate(n)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {n.status !== "sending" && (
                        <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => setDeleting(n)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this newsletter?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.subject || "(no subject)"}" will be removed{deleting?.status === "sent" ? ", along with its delivery record" : ""}. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// ---------------------------------------------------------------------------

const EMPTY: NewsletterInput = { subject: "", previewText: "", body: "", propertyIds: [], ctaLabel: "", ctaUrl: "" };
const MAX_PROJECTS = 6;

type ProjectOption = { id: string; name: string; area: string; city: string };

function toInput(n: Newsletter): NewsletterInput {
  return {
    subject: n.subject || "",
    previewText: n.previewText || "",
    body: n.body || "",
    propertyIds: n.propertyIds || [],
    ctaLabel: n.ctaLabel || "",
    ctaUrl: n.ctaUrl || "",
  };
}

const NewsletterEditor = ({
  id,
  overview,
  onBack,
  onCreated,
}: {
  id?: string;
  overview: Overview | null;
  onBack: () => void;
  onCreated: (id: string) => void;
}) => {
  const { toast } = useToast();
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [form, setForm] = useState<NewsletterInput>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<NewsletterProgress | null>(null);
  const [failures, setFailures] = useState<{ email: string; error?: string | null }[] | null>(null);
  const stopRef = useRef(false);
  const mountedRef = useRef(true);
  /** Id already in state (e.g. a draft we just created), so switching to it doesn't reload the form. */
  const loadedIdRef = useRef<string | undefined>(undefined);

  const readOnly = Boolean(newsletter && newsletter.status !== "draft");
  const activeSubscribers = overview?.activeSubscribers ?? 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRef.current = true;
    };
  }, []);

  useEffect(() => {
    api.listNewsletterProjects().then((p) => mountedRef.current && setProjects(p)).catch(() => undefined);
  }, []);

  // Load the newsletter
  useEffect(() => {
    let cancelled = false;
    if (id && loadedIdRef.current === id) return;
    loadedIdRef.current = id;
    if (!id) {
      setNewsletter(null);
      setForm(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getNewsletter(id)
      .then((n) => {
        if (cancelled) return;
        setNewsletter(n);
        setForm(toInput(n));
        setDirty(false);
        setProgress(null);
        setFailures(null);
        if (n.status !== "draft") {
          setProgress({ id: n.id, status: n.status, recipientCount: n.recipientCount, sentCount: n.sentCount, failedCount: n.failedCount, remaining: Math.max(0, n.recipientCount - n.sentCount - n.failedCount) });
        }
      })
      .catch((e) => toast({ title: "Couldn't open the newsletter", description: errText(e), variant: "destructive" }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  // Live preview, a moment after typing stops
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      api
        .previewNewsletter({ ...form, subject: form.subject || "Preview" })
        .then((r) => mountedRef.current && setPreviewHtml(r.html))
        .catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [form, loading]);

  // Warn before closing the tab mid-send
  useEffect(() => {
    if (!sending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sending]);

  const set = <K extends keyof NewsletterInput>(key: K, value: NewsletterInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  /** Saves the draft and returns its id. */
  const save = async (quiet = false): Promise<string | null> => {
    if (readOnly) return newsletter?.id || null;
    setSaving(true);
    try {
      const saved = newsletter ? await api.updateNewsletter(newsletter.id, form) : await api.createNewsletter(form);
      setNewsletter(saved);
      setDirty(false);
      if (!quiet) toast({ title: "Draft saved" });
      if (!newsletter) {
        loadedIdRef.current = saved.id;
        onCreated(saved.id);
      }
      return saved.id;
    } catch (e) {
      toast({ title: "Couldn't save", description: errText(e), variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    const savedId = await save(true);
    if (!savedId) return;
    setTesting(true);
    try {
      const r = await api.sendNewsletterTest(savedId, testEmail.trim() || undefined);
      toast({ title: "Test email sent", description: `Check the inbox of ${r.sentTo}.` });
    } catch (e) {
      toast({ title: "Test failed", description: errText(e), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const runSend = async (startId: string) => {
    stopRef.current = false;
    setSending(true);
    try {
      for (;;) {
        const p = await api.sendNewsletterBatch(startId);
        if (!mountedRef.current) return;
        setProgress(p);
        setNewsletter((n) => (n ? { ...n, status: p.status, sentCount: p.sentCount, failedCount: p.failedCount, recipientCount: p.recipientCount } : n));
        if (p.status === "sent" || p.remaining === 0) {
          toast({ title: "Newsletter sent", description: `${p.sentCount} delivered${p.failedCount ? `, ${p.failedCount} failed` : ""}.` });
          break;
        }
        if (p.rateLimited) {
          toast({
            title: "Paused: email limit reached",
            description: `Brevo stopped accepting emails for now (${p.lastError || "rate limit"}). The free plan allows 300 a day. Use "Resume sending" later; nobody will get it twice.`,
            variant: "destructive",
          });
          break;
        }
        if (stopRef.current) {
          toast({ title: "Sending paused", description: "Use \"Resume sending\" to carry on." });
          break;
        }
      }
    } catch (e) {
      if (mountedRef.current) toast({ title: "Sending stopped", description: errText(e), variant: "destructive" });
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const startSend = async () => {
    setConfirmSend(false);
    const savedId = await save(true);
    if (savedId) runSend(savedId);
  };

  const retryFailed = async () => {
    if (!newsletter) return;
    try {
      const p = await api.retryNewsletterFailed(newsletter.id);
      setProgress(p);
      setFailures(null);
      setNewsletter((n) => (n ? { ...n, status: p.status } : n));
      runSend(newsletter.id);
    } catch (e) {
      toast({ title: "Couldn't retry", description: errText(e), variant: "destructive" });
    }
  };

  const showFailures = async () => {
    if (!newsletter) return;
    try {
      setFailures(await api.listNewsletterFailures(newsletter.id));
    } catch (e) {
      toast({ title: "Couldn't load failures", description: errText(e), variant: "destructive" });
    }
  };

  const duplicate = async () => {
    if (!newsletter) return;
    try {
      const copy = await api.duplicateNewsletter(newsletter.id);
      toast({ title: "Copied to a new draft" });
      onCreated(copy.id);
    } catch (e) {
      toast({ title: "Couldn't duplicate", description: errText(e), variant: "destructive" });
    }
  };

  const selected = form.propertyIds || [];
  const toggleProject = (pid: string) => {
    if (selected.includes(pid)) set("propertyIds", selected.filter((x) => x !== pid));
    else if (selected.length < MAX_PROJECTS) set("propertyIds", [...selected, pid]);
    else toast({ title: `Up to ${MAX_PROJECTS} projects`, description: "Remove one to add another." });
  };
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return q ? projects.filter((p) => `${p.name} ${p.area} ${p.city}`.toLowerCase().includes(q)) : projects;
  }, [projects, projectSearch]);

  const canSend = Boolean(form.subject.trim()) && Boolean((form.body || "").trim() || selected.length);
  const done = progress ? progress.sentCount + progress.failedCount : 0;
  const pct = progress && progress.recipientCount ? Math.min(100, Math.round((done / progress.recipientCount) * 100)) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" className="gap-2 px-2" onClick={onBack} disabled={sending}>
          <ArrowLeft className="h-4 w-4" /> All newsletters
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {newsletter && <StatusBadge n={newsletter} />}
          {!readOnly && (
            <Button variant="outline" onClick={() => save()} disabled={saving || (!dirty && Boolean(newsletter))}>
              {saving ? "Saving…" : dirty || !newsletter ? "Save draft" : "Saved"}
            </Button>
          )}
          {readOnly && (
            <Button variant="outline" className="gap-2" onClick={duplicate} disabled={sending}>
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
          )}
        </div>
      </div>

      {/* Sending / sent status */}
      {newsletter && newsletter.status !== "draft" && progress && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {newsletter.status === "sent"
                  ? `Sent ${formatDate(newsletter.sentAt)}`
                  : sending
                    ? "Sending… keep this page open"
                    : "Sending paused"}
              </div>
              <div className="flex flex-wrap gap-2">
                {sending && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => (stopRef.current = true)}>
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                )}
                {!sending && newsletter.status === "sending" && (
                  <Button size="sm" className="gap-2" onClick={() => runSend(newsletter.id)}>
                    <Send className="h-4 w-4" /> Resume sending
                  </Button>
                )}
                {!sending && progress.failedCount > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={showFailures}>
                      See failed
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={retryFailed}>
                      <RotateCcw className="h-4 w-4" /> Retry {progress.failedCount} failed
                    </Button>
                  </>
                )}
              </div>
            </div>
            <Progress value={newsletter.status === "sent" ? 100 : pct} />
            <div className="text-sm text-muted-foreground">
              {progress.sentCount} delivered of {progress.recipientCount}
              {progress.failedCount > 0 && <span className="text-destructive"> · {progress.failedCount} failed</span>}
              {newsletter.status !== "sent" && progress.remaining > 0 && ` · ${progress.remaining} still to go`}
            </div>
            {failures && (
              <div className="max-h-56 overflow-y-auto rounded border text-sm">
                {failures.length === 0 && <div className="p-3 text-muted-foreground">No failed deliveries.</div>}
                {failures.map((f) => (
                  <div key={f.email} className="flex flex-col border-b p-2 last:border-b-0 sm:flex-row sm:justify-between sm:gap-4">
                    <span className="font-medium">{f.email}</span>
                    <span className="text-muted-foreground">{f.error}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{readOnly ? "What was sent" : newsletter ? "Edit newsletter" : "New newsletter"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nl-subject">Subject</Label>
              <Input
                id="nl-subject"
                value={form.subject}
                maxLength={200}
                disabled={readOnly}
                placeholder="e.g. 3 new launches in Kakkanad this month"
                onChange={(e) => set("subject", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-preview">Preview line (optional)</Label>
              <Input
                id="nl-preview"
                value={form.previewText}
                maxLength={250}
                disabled={readOnly}
                placeholder="Shown next to the subject in most inboxes"
                onChange={(e) => set("previewText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-body">Message</Label>
              <Textarea
                id="nl-body"
                value={form.body}
                disabled={readOnly}
                rows={12}
                placeholder={"Hi there,\n\nHere's what's new this month…"}
                onChange={(e) => set("body", e.target.value)}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Leave a blank line between paragraphs. Start a line with <code>## </code> for a heading or <code>- </code> for a bullet. Use{" "}
                <code>**bold**</code> and <code>[link text](https://…)</code>; plain https:// links work too.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Featured projects (optional, up to {MAX_PROJECTS})</Label>
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.map((pid, i) => (
                    <Badge key={pid} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
                      {i + 1}. {projectById.get(pid)?.name || "Unpublished project"}
                      {!readOnly && (
                        <button type="button" aria-label="Remove" className="rounded p-0.5 hover:bg-muted-foreground/20" onClick={() => toggleProject(pid)}>
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
              {!readOnly && (
                <>
                  <Input placeholder="Search projects" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    {filteredProjects.length === 0 && <div className="p-3 text-sm text-muted-foreground">No published projects match.</div>}
                    {filteredProjects.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50">
                        <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          {p.area}, {p.city}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nl-cta-label">Button text (optional)</Label>
                <Input
                  id="nl-cta-label"
                  value={form.ctaLabel}
                  maxLength={60}
                  disabled={readOnly}
                  placeholder="Book a site visit"
                  onChange={(e) => set("ctaLabel", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nl-cta-url">Button link</Label>
                <Input
                  id="nl-cta-url"
                  value={form.ctaUrl}
                  maxLength={500}
                  disabled={readOnly}
                  placeholder={`${overview?.siteUrl || "https://…"}/projects`}
                  onChange={(e) => set("ctaUrl", e.target.value)}
                />
              </div>
            </div>
            {overview?.siteUrl && (
              <p className="text-xs text-muted-foreground">
                Links to your site get tracking tags added, so enquiries from this email show "newsletter" as their source in Leads. Links point
                to <strong>{overview.siteUrl}</strong>.
              </p>
            )}

            {!readOnly && (
              <div className="space-y-4 border-t pt-5">
                <div className="space-y-2">
                  <Label htmlFor="nl-test">Send a test first</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="nl-test"
                      type="email"
                      value={testEmail}
                      placeholder="Your login email, or type another"
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button variant="outline" className="gap-2" onClick={sendTest} disabled={testing || saving || !canSend}>
                      <Mail className="h-4 w-4" /> {testing ? "Sending…" : "Send test"}
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={!canSend || sending || saving || activeSubscribers === 0 || overview?.mailConfigured === false}
                  onClick={() => setConfirmSend(true)}
                >
                  <Send className="h-4 w-4" />
                  {activeSubscribers === 0 ? "No active subscribers yet" : `Send to ${activeSubscribers} subscriber${activeSubscribers === 1 ? "" : "s"}`}
                </Button>
                {overview?.mailConfigured === false && (
                  <p className="text-xs text-destructive">Email sending isn't set up on the API yet (BREVO_API_KEY and MAIL_FROM_EMAIL).</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="xl:sticky xl:top-4 xl:self-start">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Preview</CardTitle>
            <div className="flex gap-1">
              <Button variant={previewWidth === "desktop" ? "secondary" : "ghost"} size="sm" title="Desktop" onClick={() => setPreviewWidth("desktop")}>
                <Monitor className="h-4 w-4" />
              </Button>
              <Button variant={previewWidth === "mobile" ? "secondary" : "ghost"} size="sm" title="Phone" onClick={() => setPreviewWidth("mobile")}>
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{form.subject || <span className="text-muted-foreground">Subject</span>}</div>
              {form.previewText && <div className="truncate text-muted-foreground">{form.previewText}</div>}
            </div>
            <div className="flex justify-center overflow-hidden rounded-md border bg-[#f3f4f6]">
              {previewHtml ? (
                <iframe
                  title="Newsletter preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[640px] border-0 bg-white transition-all xl:h-[calc(100vh-14rem)]"
                  style={{ width: previewWidth === "mobile" ? 375 : "100%" }}
                />
              ) : (
                <div className="p-10 text-sm text-muted-foreground">Start writing to see the preview.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {activeSubscribers} subscribers?</AlertDialogTitle>
            <AlertDialogDescription>
              "{form.subject}" goes out now and can't be recalled. Keep this page open until it finishes; if it stops part way you can resume
              without anyone getting it twice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startSend}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNewsletters;
