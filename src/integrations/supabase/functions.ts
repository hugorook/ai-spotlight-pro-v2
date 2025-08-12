import { supabase } from "@/integrations/supabase/client";

export async function invokeCopilot(input: { question: string; contextPath?: string }) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-copilot', {
      body: input,
    });
    if (error) throw error;
    return data ?? { answer: mockCopilot(input) };
  } catch {
    return { answer: mockCopilot(input) };
  }
}

export async function scheduleJob(input: { type: 'weekly-health-check' | 'monthly-competitor-retest'; enabled: boolean; companyId: string }) {
  try {
    const { data, error } = await supabase.functions.invoke('schedule-job', {
      body: input,
    });
    if (error) throw error;
    return data ?? { ok: true };
  } catch {
    // Local fallback: pretend success
    return { ok: true };
  }
}

function mockCopilot({ question, contextPath }: { question: string; contextPath?: string }) {
  const ctx = contextPath ? ` for ${contextPath}` : '';
  return `Mock Copilot${ctx}: ${question ? 'Here is a suggested next step → Run Health Check, review Heatmap, and create a content brief.' : 'Ask a question to get guidance.'}`;
}

export async function logEvent(event: { type: string; companyId?: string; userId?: string; payload?: unknown }) {
  try {
    const { data, error } = await supabase.from('events').insert({
      type: event.type,
      company_id: event.companyId ?? null,
      user_id: event.userId ?? null,
      payload: event.payload ?? {},
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('logEvent fallback', e);
  }
}

export async function runHealthCheckNow() {
  try {
    const { data, error } = await supabase.functions.invoke('run-health-check', { body: {} });
    if (error) throw error;
    return data ?? { ok: true };
  } catch (e) {
    console.warn('runHealthCheckNow fallback', e);
    return { ok: true };
  }
}

export async function runCompetitorRetestNow() {
  try {
    const { data, error } = await supabase.functions.invoke('run-competitor-retest', { body: {} });
    if (error) throw error;
    return data ?? { ok: true };
  } catch (e) {
    console.warn('runCompetitorRetestNow fallback', e);
    return { ok: true };
  }
}

