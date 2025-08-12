// Supabase Edge Function: save-company
// Deploy: supabase functions deploy save-company --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const body = await req.json();
    const payload = {
      user_id: body.user_id,
      company_name: String(body.company_name ?? '').trim(),
      website_url: String(body.website_url ?? '').trim(),
      industry: String(body.industry ?? '').trim(),
      description: String(body.description ?? '').trim(),
      target_customers: String(body.target_customers ?? '').trim(),
      key_differentiators: String(body.key_differentiators ?? '').trim(),
      geographic_focus: Array.isArray(body.geographic_focus) ? body.geographic_focus : [],
      competitors: Array.isArray(body.competitors) ? body.competitors : [],
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return new Response(JSON.stringify(data?.[0] ?? payload), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});

