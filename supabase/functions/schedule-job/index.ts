// Supabase Edge Function: schedule-job
// Deploy with: supabase functions deploy schedule-job
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This function stores schedule preferences in the schedules table.
// Cron can call other functions to execute jobs based on these flags.

async function updateSchedule(input: { type: string; enabled: boolean; companyId: string }) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const { type, enabled, companyId } = input;
  const field = type === 'weekly-health-check' ? 'weekly_health_check' : 'monthly_competitor_retest';

  const res = await fetch(`${url}/rest/v1/schedules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ company_id: companyId, [field]: enabled })
  });
  if (!res.ok) throw new Error('Failed to update schedule');
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const input = await req.json();
    await updateSchedule(input);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});

