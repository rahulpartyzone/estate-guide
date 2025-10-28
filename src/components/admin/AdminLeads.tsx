import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export default function AdminLeads() {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [type, setType] = useState<string>('brochure'); // 'all' | 'brochure' | 'site_visit' | 'info'
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const typeParam = type === 'all' ? undefined : type;
      const res = await api.listLeads({ type: typeParam, status, page, pageSize });
      setLeads(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (e: any) {
      toast({ title: 'Load failed', description: e?.message || 'Unable to fetch leads', variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [type, status, page, pageSize]);

  const exportCsv = async () => {
    try {
      const typeParam = type === 'all' ? undefined : type;
      const blob = await api.exportLeadsCsv({ type: typeParam, months: 6 });
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

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Leads</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={(v)=>{ setType(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="brochure">Brochure</SelectItem>
              <SelectItem value="site_visit">Site Visit</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} className="gap-2" size="sm"><Download className="h-4 w-4" /> Export (6m)</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
              ) : leads.length ? (
                leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">{l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}</TableCell>
                    <TableCell className="capitalize">{l.type || '-'}</TableCell>
                    <TableCell>{(l.property && l.property.name) || l.propertyId || '-'}</TableCell>
                    <TableCell>{l.name || '-'}</TableCell>
                    <TableCell>{l.phone || '-'}</TableCell>
                    <TableCell>{l.email || '-'}</TableCell>
                    <TableCell className="capitalize">{l.status || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No leads</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm">
          <div>Page {page} of {pages} ({total} total)</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
