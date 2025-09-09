// Test script for website analysis Edge function
// Run with: node test-website-analysis.js

const testURL = process.argv[2] || 'https://example.com';
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  console.log('Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx node test-website-analysis.js [url]');
  process.exit(1);
}

const testWebsiteAnalysis = async (url) => {
  try {
    console.log(`🌐 Testing website analysis for: ${url}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-website`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url
      })
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Website analysis completed');
      console.log('📄 Result structure:', {
        hasContent: !!result.content,
        contentLength: result.content?.length || 0,
        hasAnalysis: !!result.analysis,
        analysisKeys: result.analysis ? Object.keys(result.analysis) : [],
        hasError: !!result.error,
        error: result.error
      });
      
      if (result.analysis) {
        console.log('🔍 Analysis details:');
        console.log('- Content Summary:', result.analysis.contentSummary?.substring(0, 100) + '...');
        console.log('- AI Optimization Opportunities:', result.analysis.aiOptimizationOpportunities?.length || 0);
        console.log('- Key Topics:', result.analysis.keyTopics?.length || 0);
        console.log('- Content Gaps:', result.analysis.contentGaps?.length || 0);
        console.log('- Recommendations:', result.analysis.recommendations?.length || 0);
      }
    } else {
      console.log('❌ ERROR: Website analysis failed');
      console.log('Error details:', result);
    }
    
    return result;
  } catch (error) {
    console.error('🔥 CRITICAL ERROR: Failed to call Edge function:', error.message);
    return null;
  }
};

testWebsiteAnalysis(testURL);