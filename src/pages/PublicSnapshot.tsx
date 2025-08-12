import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HeaderStrip from '@/components/dashboard/HeaderStrip';
import Tiles from '@/components/dashboard/Tiles';

export default function PublicSnapshot() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const slug = new URLSearchParams(window.location.search).get('s');
        if (!slug) return;
        const { data: shares } = await supabase.from('public_shares').select('*').eq('slug', slug).limit(1);
        const share = shares?.[0];
        if (!share) return;
        const { data: snaps } = await supabase.from('weekly_snapshots').select('*').eq('brand_id', share.company_id).order('week_start', { ascending: false }).limit(1);
        const snap = snaps?.[0];
        setSnapshot(snap || null);
        const { data: companies } = await supabase.from('companies').select('company_name').eq('id', share.company_id).limit(1);
        setCompanyName(companies?.[0]?.company_name || '');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!snapshot) return <div className="p-8 text-center">Not found</div>;

  const score = Math.round(snapshot.visibility_score ?? 0);
  const delta = Math.round(snapshot.wow_delta ?? 0);
  const momentum: 'up' | 'down' | 'flat' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const forecast = typeof snapshot.forecast === 'number' ? Math.round(snapshot.forecast) : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">AI Brand Visibility Snapshot</h1>
          <div className="text-sm text-muted-foreground">{companyName}</div>
        </div>
        <div className="space-y-4">
          <HeaderStrip score={score} delta={delta} momentum={momentum} forecast={forecast} />
          <Tiles mentionRate={snapshot.mention_rate ?? 0} avgPosition={snapshot.avg_position ?? null} modelCoverage={snapshot.model_coverage ?? {}} winStreak={snapshot.win_streak ?? 0} />
        </div>
        <div className="text-xs text-muted-foreground mt-10">Shared view. Detailed drill-down available to owners only.</div>
      </div>
    </div>
  );
}

