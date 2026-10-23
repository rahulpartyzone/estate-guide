import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Download, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { FINISHED_STATUSES, LEAD_STATUSES, LEAD_TYPE_LABELS, leadSource, userLabel } from '@/constants/leads';
import LeadDetailSheet from './LeadDetailSheet';

type Assignee = { id: string; email: string; name?: string | null };

const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

export default function AdminLeads() {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [type, setType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all'); // all | me | unassigned | <userId>
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [myAlerts, setMyAlerts] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api.getOwnLeadAlerts().then((r) => setMyAlerts(Boolean(r?.enabled))).catch(() => setMyAlerts(null));
    api.listLeadAssignees().then(setAssignees).catch(() => setAssignees([]));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listLeads({
        type: type === 'all' ? undefined : type,
        status: status === 'all' ? undefined : status,
        assignedTo: owner === 'all' ? undefined : owner,
        due: dueOnly ? 'today' : undefined,
        page,
        pageSize,
      });
      setLeads(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (e: any) {
      toast({ title: 'Load failed', description: e?.message || 'Unable to fetch leads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [type, status, owner, dueOnly, page, pageSize]);

  const toggleMyAlerts = async (enabled: boolean) => {
    setMyAlerts(enabled);
    try {
      await api.setOwnLeadAlerts(enabled);
      toast({ title: enabled ? 'You will get an email for every new lead' : 'New-lead emails turned off' });
    } catch (e: any) {
      setMyAlerts(!enabled);
      toast({ title: 'Could not update your lead alerts', description: e?.message, variant: 'destructive' });
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await api.exportLeadsCsv({ type: type === 'all' ? undefined : type, months: 6 });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${type || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message || 'Unable to export', variant: 'destructive' });
    }
  };

  const changeStatus = async (id: string, next: string) => {
    const previous = leads.find((l) => l.id === id)?.status;
    setLeads((rows) => rows.map((l) => (l.id === id ? { ...l, status: next } : l)));
    setSavingId(id);
    try {
      const updated = await api.updateLead(id, { status: next });
      setLeads((rows) => rows.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    } catch (e: any) {
      setLeads((rows) => rows.map((l) => (l.id === id ? { ...l, status: previous } : l)));
      toast({ title: 'Could not update stage', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const onChanged = (updated: any) => setLeads((rows) => rows.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Leads</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            {myAlerts !== null && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Switch checked={myAlerts} onCheckedChange={toggleMyAlerts} aria-label="Email me new leads" />
                Email me new leads
              </label>
            )}
            <Button onClick={exportCsv} className="gap-2" size="sm" variant="outline"><Download className="h-4 w-4" /> Export (6m)</Button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(LEAD_TYPE_LABELS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any stage</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={(v) => { setOwner(v); setPage(1); }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any owner</SelectItem>
              <SelectItem value="me">Assigned to me</SelectItem>
              <SelectItem value="unassigned">No owner</SelectItem>
              {assignees.map((u) => <SelectItem key={u.id} value={u.id}>{userLabel(u)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant={dueOnly ? 'default' : 'outline'} className="gap-1.5" onClick={() => { setDueOnly((d) => !d); setPage(1); }} aria-pressed={dueOnly}>
            <CalendarClock className="h-4 w-4" /> Follow-ups due
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
              ) : leads.length ? (
                leads.map((l) => {
                  const overdue = l.nextFollowUpAt && !FINISHED_STATUSES.includes(l.status) && new Date(l.nextFollowUpAt).getTime() < Date.now();
                  return (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => setOpenId(l.id)}>
                      <TableCell className="whitespace-nowrap text-xs">{shortDate(l.createdAt)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{l.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{l.phone}{l._count?.notes ? ` · ${l._count.notes} note${l._count.notes === 1 ? '' : 's'}` : ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">{LEAD_TYPE_LABELS[l.type] || l.type || '-'}</TableCell>
                      <TableCell className="text-sm">{l.property?.name || '-'}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{leadSource(l)}{l.utmCampaign ? ` · ${l.utmCampaign}` : ''}</TableCell>
                      <TableCell className="text-sm">{userLabel(l.assignedTo) || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className={`text-xs whitespace-nowrap ${overdue ? 'text-destructive font-medium' : ''}`}>{shortDate(l.nextFollowUpAt) || '-'}</TableCell>
                      <TableCell onClick={stop}>
                        <Select value={l.status || 'new'} onValueChange={(v) => changeStatus(l.id, v)} disabled={savingId === l.id}>
                          <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No leads</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm">
          <div>Page {page} of {pages} ({total} total) · click a lead for details, owner, follow-up and notes</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
      <LeadDetailSheet leadId={openId} assignees={assignees} onClose={() => setOpenId(null)} onChanged={onChanged} />
    </Card>
  );
}
