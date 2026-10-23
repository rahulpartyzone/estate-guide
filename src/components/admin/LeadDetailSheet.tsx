import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Mail, MessageCircle, Phone, StickyNote, UserRound, ArrowRightLeft } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { LEAD_STATUSES, LEAD_TYPE_LABELS, leadSource, userLabel } from "@/constants/leads";

type Assignee = { id: string; email: string; name?: string | null };

type Props = {
  leadId: string | null;
  assignees: Assignee[];
  onClose: () => void;
  /** Called with the updated lead after any change, so the list can refresh its row. */
  onChanged: (lead: any) => void;
};

const NO_OWNER = "__none__";

// <input type="datetime-local"> works in local time without a zone
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function at(daysFromNow: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

const KIND_ICONS: Record<string, typeof StickyNote> = { note: StickyNote, status: ArrowRightLeft, assignment: UserRound, follow_up: CalendarClock };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm py-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{children}</div>
    </div>
  );
}

const LeadDetailSheet = ({ leadId, assignees, onClose, onChanged }: Props) => {
  const { toast } = useToast();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }
    setLoading(true);
    setNote("");
    api
      .getLead(leadId)
      .then((l) => {
        setLead(l);
        setFollowUp(toLocalInput(l?.nextFollowUpAt));
      })
      .catch((e: any) => toast({ title: "Could not load the lead", description: e?.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [leadId]);

  const update = async (payload: { status?: string; assignedToId?: string | null; nextFollowUpAt?: string | null }) => {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await api.updateLead(lead.id, payload);
      setLead(updated);
      setFollowUp(toLocalInput(updated?.nextFollowUpAt));
      onChanged(updated);
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!lead || !note.trim()) return;
    setSaving(true);
    try {
      const created = await api.addLeadNote(lead.id, note.trim());
      const updated = { ...lead, notes: [created, ...(lead.notes || [])] };
      setLead(updated);
      setNote("");
      onChanged(updated);
    } catch (e: any) {
      toast({ title: "Could not add the note", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const digits = (lead?.phone || "").replace(/\D/g, "");
  const waNumber = digits.length === 10 ? `91${digits}` : digits;
  const extra = (lead?.attribution || {}) as Record<string, string>;
  const overdue = lead?.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < Date.now();

  return (
    <Sheet open={Boolean(leadId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {loading || !lead ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                {lead.name || "Lead"}
                <Badge variant="secondary">{LEAD_TYPE_LABELS[lead.type] || lead.type}</Badge>
              </SheetTitle>
              <SheetDescription>
                {lead.property?.name ? `${lead.property.name} · ` : ""}
                Received {fmt(lead.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              {digits && (
                <a href={`tel:${lead.phone}`}>
                  <Button size="sm" variant="outline" className="gap-1.5"><Phone className="h-4 w-4" /> {lead.phone}</Button>
                </a>
              )}
              {digits && (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}>
                  <Button size="sm" variant="outline" className="gap-1.5"><Mail className="h-4 w-4" /> Email</Button>
                </a>
              )}
            </div>

            <section className="space-y-3 rounded-lg border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select value={lead.status || "new"} onValueChange={(v) => update({ status: v })} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Owner</Label>
                  <Select
                    value={lead.assignedToId || NO_OWNER}
                    onValueChange={(v) => update({ assignedToId: v === NO_OWNER ? null : v })}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue placeholder="No owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_OWNER}>No owner</SelectItem>
                      {assignees.map((u) => <SelectItem key={u.id} value={u.id}>{userLabel(u)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="followup">
                  Next follow-up {overdue && <span className="text-destructive font-medium">(overdue)</span>}
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="followup"
                    type="datetime-local"
                    className="w-auto"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    onBlur={() => {
                      const next = followUp ? new Date(followUp).toISOString() : null;
                      if (next !== (lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toISOString() : null)) update({ nextFollowUpAt: next });
                    }}
                    disabled={saving}
                  />
                  <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => update({ nextFollowUpAt: at(1) })}>Tomorrow 10am</Button>
                  <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => update({ nextFollowUpAt: at(3) })}>In 3 days</Button>
                  <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => update({ nextFollowUpAt: at(7) })}>Next week</Button>
                  {lead.nextFollowUpAt && (
                    <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => update({ nextFollowUpAt: null })}>Clear</Button>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-1">Details</h3>
              <Row label="Phone">{lead.phone}</Row>
              <Row label="Email">{lead.email}</Row>
              <Row label="Project">{lead.property ? `${lead.property.name}${lead.property.area ? `, ${lead.property.area}` : ""}` : null}</Row>
              <Row label="Visit date">{lead.preferredDate ? new Date(lead.preferredDate).toDateString() : null}</Row>
              <Row label="Looking for">{[lead.preferredPropertyType, lead.preferredBudgetRange, lead.preferredLocation].filter(Boolean).join(" · ")}</Row>
              <Row label="Home loan">{typeof lead.needsHomeLoanAssistance === "boolean" ? (lead.needsHomeLoanAssistance ? "Needs help" : "No") : null}</Row>
              <Row label="Message">{lead.message}</Row>
              <Row label="Source">{leadSource(lead)}{lead.utmCampaign ? ` · campaign ${lead.utmCampaign}` : ""}</Row>
              <Row label="Landing page">{extra.landing_page}</Row>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Notes and activity</h3>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Call summary, budget, preferred towers, next steps..."
                rows={3}
                maxLength={4000}
              />
              <Button size="sm" onClick={addNote} disabled={saving || !note.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Add note
              </Button>
              <ol className="space-y-3 pt-2">
                {(lead.notes || []).map((n: any) => {
                  const Icon = KIND_ICONS[n.kind] || StickyNote;
                  return (
                    <li key={n.id} className="flex gap-3 text-sm">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className={n.kind === "note" ? "text-foreground whitespace-pre-wrap break-words" : "text-muted-foreground"}>{n.body}</div>
                        <div className="text-xs text-muted-foreground">{userLabel(n.author) || "Someone"} · {fmt(n.createdAt)}</div>
                      </div>
                    </li>
                  );
                })}
                {!(lead.notes || []).length && <li className="text-sm text-muted-foreground">No notes yet.</li>}
              </ol>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailSheet;
