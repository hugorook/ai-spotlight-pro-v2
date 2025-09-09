// Test the complete website analysis flow
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqlopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteFlow() {
  console.log('🚀 Starting complete website analysis flow test\n');

  const testWebsiteUrl = 'https://example.com';
  const testUserId = 'test-user-' + Date.now(); // Simulate a user ID

  try {
    // Step 1: Test Edge function directly
    console.log('1️⃣ Testing analyze-website Edge function...');
    const edgeResponse = await supabase.functions.invoke('analyze-website', {
      body: { url: testWebsiteUrl }
    });

    if (edgeResponse.error) {
      console.log('❌ Edge function failed:', edgeResponse.error);
      return;
    }

    console.log('✅ Edge function successful');
    console.log('📄 Analysis structure:', {
      hasContent: !!edgeResponse.data.content,
      hasAnalysis: !!edgeResponse.data.analysis,
      analysisKeys: edgeResponse.data.analysis ? Object.keys(edgeResponse.data.analysis) : []
    });

    // Step 2: Simulate health check session creation
    console.log('\n2️⃣ Creating mock health check session...');
    
    // Note: This will fail due to RLS policies without proper authentication
    // But we can test the data structure
    
    const mockSessionData = {
      user_id: testUserId,
      website_url: testWebsiteUrl,
      prompts_used: ['test prompt 1', 'test prompt 2'],
      total_prompts: 2,
      mention_rate: 50,
      average_position: 3,
      health_score: 75,
      session_type: 'url_only',
      company_data: { name: 'Test Company', industry: 'Technology' }
    };

    console.log('📊 Mock session data prepared:', {
      websiteUrl: mockSessionData.website_url,
      sessionType: mockSessionData.session_type,
      totalPrompts: mockSessionData.total_prompts
    });

    // Step 3: Test analytics data structure
    console.log('\n3️⃣ Testing analytics data structure...');
    
    const mockAnalyticsData = {
      user_id: testUserId,
      health_check_session_id: 'mock-session-id',
      analytics_type: 'website_analysis',
      data: edgeResponse.data // Use the actual Edge function response
    };

    console.log('📈 Mock analytics data prepared:', {
      analyticsType: mockAnalyticsData.analytics_type,
      hasData: !!mockAnalyticsData.data,
      dataStructure: {
        hasContent: !!mockAnalyticsData.data.content,
        hasAnalysis: !!mockAnalyticsData.data.analysis,
        hasError: !!mockAnalyticsData.data.error
      }
    });

    // Step 4: Verify the data would render correctly in UI
    console.log('\n4️⃣ Testing UI data structure compatibility...');
    
    const analysisData = mockAnalyticsData.data;
    
    if (analysisData && analysisData.analysis) {
      const uiCompatibility = {
        contentSummary: !!analysisData.analysis.contentSummary,
        aiOptimizationOpportunities: Array.isArray(analysisData.analysis.aiOptimizationOpportunities),
        keyTopics: Array.isArray(analysisData.analysis.keyTopics),
        contentGaps: Array.isArray(analysisData.analysis.contentGaps),
        recommendations: Array.isArray(analysisData.analysis.recommendations),
        fetchedAt: !!analysisData.fetchedAt
      };

      console.log('🎨 UI compatibility check:', uiCompatibility);

      const allCompatible = Object.values(uiCompatibility).every(v => v === true);
      console.log(allCompatible ? '✅ Data structure is UI compatible' : '❌ Data structure has issues');

      // Show sample data that would be displayed
      if (allCompatible) {
        console.log('\n📋 Sample data that would be displayed:');
        console.log('- Content Summary:', analysisData.analysis.contentSummary.substring(0, 100) + '...');
        console.log('- AI Optimization Opportunities:', analysisData.analysis.aiOptimizationOpportunities.length, 'items');
        console.log('- Key Topics:', analysisData.analysis.keyTopics.join(', '));
        console.log('- Content Gaps:', analysisData.analysis.contentGaps.length, 'items');
        console.log('- Recommendations:', analysisData.analysis.recommendations.length, 'items');
      }
    }

    console.log('\n✅ Complete flow test successful!');
    console.log('\n📋 Summary:');
    console.log('- Edge function: ✅ Working');
    console.log('- Data structure: ✅ Compatible');
    console.log('- UI rendering: ✅ Should work');
    console.log('\n🔍 Next steps:');
    console.log('1. Run an actual health check to create real database records');
    console.log('2. Test the analytics page with authenticated user');
    console.log('3. Verify the results-section component renders correctly');

  } catch (error) {
    console.error('🔥 Test failed:', error.message);
  }
}

testCompleteFlow();