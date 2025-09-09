// Query database for website analysis data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.log('SUPABASE_SERVICE_KEY not set, using anon key');
}

const supabase = createClient(
  supabaseUrl, 
  supabaseServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc'
);

async function queryTables() {
  console.log('🔍 Querying database tables...\n');

  // Check generated_prompts table
  console.log('📋 Generated Prompts Table:');
  const { data: prompts, error: promptsError } = await supabase
    .from('generated_prompts')
    .select('id, website_url, prompt_count, generation_method, generated_at')
    .order('generated_at', { ascending: false })
    .limit(5);

  if (promptsError) {
    console.log('❌ Error querying generated_prompts:', promptsError.message);
  } else if (prompts && prompts.length > 0) {
    console.log(`✅ Found ${prompts.length} generated prompts records:`);
    prompts.forEach(p => {
      console.log(`  - ${p.website_url} (${p.prompt_count} prompts) - ${new Date(p.generated_at).toLocaleDateString()}`);
    });
  } else {
    console.log('ℹ️ No generated prompts found');
  }

  console.log('\n📊 Analytics Data Table:');
  const { data: analytics, error: analyticsError } = await supabase
    .from('analytics_data')
    .select('id, analytics_type, generated_at, data')
    .eq('analytics_type', 'website_analysis')
    .order('generated_at', { ascending: false })
    .limit(5);

  if (analyticsError) {
    console.log('❌ Error querying analytics_data:', analyticsError.message);
  } else if (analytics && analytics.length > 0) {
    console.log(`✅ Found ${analytics.length} website analysis records:`);
    analytics.forEach(a => {
      console.log(`  - Analysis from ${new Date(a.generated_at).toLocaleDateString()}`);
      if (a.data && a.data.analysis) {
        console.log(`    Summary: ${(a.data.analysis.contentSummary || '').substring(0, 80)}...`);
        console.log(`    Topics: ${(a.data.analysis.keyTopics || []).length} key topics`);
      }
    });
  } else {
    console.log('ℹ️ No website analysis records found');
  }

  console.log('\n🏥 Health Check Sessions Table:');
  const { data: sessions, error: sessionsError } = await supabase
    .from('health_check_sessions')
    .select('id, website_url, session_type, health_score, mention_rate, completed_at')
    .order('completed_at', { ascending: false })
    .limit(5);

  if (sessionsError) {
    console.log('❌ Error querying health_check_sessions:', sessionsError.message);
  } else if (sessions && sessions.length > 0) {
    console.log(`✅ Found ${sessions.length} health check sessions:`);
    sessions.forEach(s => {
      console.log(`  - ${s.website_url || 'No URL'} (${s.session_type}) - Score: ${s.health_score || 'N/A'}, Mention: ${s.mention_rate || 'N/A'}% - ${new Date(s.completed_at).toLocaleDateString()}`);
    });
  } else {
    console.log('ℹ️ No health check sessions found');
  }

  console.log('\n✅ Database query complete');
}

queryTables().catch(console.error);