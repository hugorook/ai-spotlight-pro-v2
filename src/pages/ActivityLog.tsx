import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/MinimalAuthContext';

type EventRow = {
  id: string;
  created_at: string;
  type: string;
  payload: any;
};

export default function ActivityLog() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch events for any of the user's companies
        const { data: companies } = await supabase.from('companies').select('id').eq('user_id', user?.id);
        const ids = (companies ?? []).map((c: any) => c.id);
        if (ids.length === 0) { setRows([]); setLoading(false); return; }
        const { data } = await supabase.from('events').select('*').in('company_id', ids).order('created_at', { ascending: false }).limit(200);
        setRows((data as any) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <AppShell title="Activity Log" subtitle="Recent events and exports">
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No activity yet</div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate">{JSON.stringify(r.payload ?? {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

