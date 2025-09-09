// Simple script to debug website analysis
// Run with: node debug-website-analysis.js

import { createClient } from '@supabase/supabase-js';

// Your Supabase config - replace with actual values
const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWebsiteAnalysis() {
  try {
    console.log('🔍 Debugging Website Analysis...\n');

    // 1. Check generated_prompts for website URLs
    console.log('1. Checking generated_prompts for website URLs:');
    const { data: generatedPrompts, error: promptsError } = await supabase
      .from('generated_prompts')
      .select('website_url, company_data, generated_at')
      .order('generated_at', { ascending: false })
      .limit(3);

    if (promptsError) {
      console.error('❌ Error fetching generated_prompts:', promptsError);
    } else {
      console.log('✅ Found', generatedPrompts.length, 'generated prompt records:');
      generatedPrompts.forEach((p, i) => {
        console.log(`   ${i + 1}. URL: ${p.website_url} | Company: ${p.company_data?.companyName || 'Unknown'}`);
      });
    }

    // 2. Check recent health check sessions
    console.log('\n2. Checking recent health check sessions:');
    const { data: sessions, error: sessionsError } = await supabase
      .from('health_check_sessions')
      .select('id, completed_at, website_url, company_data')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(3);

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
    } else {
      console.log('✅ Found', sessions.length, 'health check sessions:');
      sessions.forEach((s, i) => {
        console.log(`   ${i + 1}. ID: ${s.id} | URL: ${s.website_url} | Completed: ${s.completed_at ? 'Yes' : 'No'}`);
      });
    }

    // 3. Check analytics_data for website_analysis
    console.log('\n3. Checking analytics_data for website_analysis:');
    const { data: analytics, error: analyticsError } = await supabase
      .from('analytics_data')
      .select('id, analytics_type, created_at, data')
      .eq('analytics_type', 'website_analysis')
      .order('created_at', { ascending: false })
      .limit(3);

    if (analyticsError) {
      console.error('❌ Error fetching analytics:', analyticsError);
    } else {
      console.log('✅ Found', analytics.length, 'website analysis records:');
      analytics.forEach((a, i) => {
        const summary = a.data?.analysis?.contentSummary || 'No summary';
        console.log(`   ${i + 1}. ID: ${a.id} | Created: ${a.created_at} | Summary: ${summary.substring(0, 60)}...`);
      });
    }

    // 4. Test the Edge function directly
    console.log('\n4. Testing analyze-website Edge function:');
    const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('analyze-website', {
      body: { url: 'https://example.com' }
    });

    if (edgeError) {
      console.error('❌ Edge function error:', edgeError);
    } else {
      console.log('✅ Edge function worked! Response keys:', Object.keys(edgeResult));
      if (edgeResult.analysis) {
        console.log('   Analysis keys:', Object.keys(edgeResult.analysis));
        console.log('   Summary:', edgeResult.analysis.contentSummary?.substring(0, 100) + '...');
      }
    }

  } catch (error) {
    console.error('💥 Debug script failed:', error);
  }
}

debugWebsiteAnalysis();