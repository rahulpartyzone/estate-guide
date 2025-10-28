import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2 } from "lucide-react";

import { api } from "@/lib/api";

interface SubscriberRecord { id: string; email: string; name?: string | null; subscribedAt: string; status: 'active' | 'unsubscribed' }

const AdminSubscribers = () => {
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data, meta } = await api.listSubscribers({ status: statusFilter || undefined, page, pageSize });
      setSubscribers(data);
      setTotalPages(meta.totalPages);
    } catch (e: any) {
      toast({ title: 'Failed to load subscribers', description: e?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      if (page === 1 && !statusFilter) {
        await api.ensureAdmin?.();
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const deleteSubscriber = async (id: string) => {
    const prev = subscribers;
    setSubscribers(list => list.filter(s => s.id !== id));
    try {
      await api.deleteSubscriber(id);
      toast({ title: 'Subscriber deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
      setSubscribers(prev);
    }
  };

  const exportSubscribers = async () => {
    try {
      const blob = await api.exportSubscribersCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Export complete' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message, variant: 'destructive' });
    }
  };

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const unsubscribedCount = subscribers.filter(s => s.status === 'unsubscribed').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Newsletter Subscribers</CardTitle>
          <div className="flex gap-4 mt-2">
            <Badge variant="default">{activeCount} Active</Badge>
            <Badge variant="secondary">{unsubscribedCount} Unsubscribed</Badge>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1 text-sm" value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>Refresh</Button>
          <Button onClick={exportSubscribers} className="gap-2" size="sm">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground mb-2">Loading...</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Subscribed Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell className="font-medium">{subscriber.email}</TableCell>
                <TableCell>{subscriber.name || '-'}</TableCell>
                <TableCell>
                  {new Date(subscriber.subscribedAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={subscriber.status === 'active' ? 'default' : 'secondary'}
                  >
                    {subscriber.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSubscriber(subscriber.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(!subscribers.length && !loading) && <div className="text-center py-8 text-muted-foreground">No subscribers found</div>}
        <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
          <span>Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSubscribers;