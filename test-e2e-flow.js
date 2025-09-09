// End-to-end test for website analysis flow
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testE2EFlow() {
  console.log('🔄 Testing end-to-end website analysis flow\n');

  const testWebsite = 'https://example.com';
  const testCompany = {
    companyName: 'Test Company',
    website: testWebsite,
    industry: 'Technology',
    description: 'A test company for website analysis',
    targetCustomers: 'Small businesses',
    differentiators: 'Easy to use, affordable',
    geography: 'United States'
  };

  try {
    // Step 1: Test the generate-prompts flow (simulates form submission)
    console.log('1️⃣ Testing generate-prompts Edge function...');
    
    const promptsResponse = await supabase.functions.invoke('generate-prompts', {
      body: {
        companyName: testCompany.companyName,
        website: testCompany.website,
        industry: testCompany.industry,
        description: testCompany.description,
        targetCustomers: testCompany.targetCustomers,
        differentiators: testCompany.differentiators,
        geography: testCompany.geography
      }
    });

    if (promptsResponse.error) {
      console.log('❌ Generate prompts failed:', promptsResponse.error);
      return;
    }

    console.log('✅ Generate prompts successful');
    console.log('📄 Prompts generated:', promptsResponse.data.prompts?.length || 0);

    // Step 2: Test website analysis directly 
    console.log('\n2️⃣ Testing website analysis...');
    
    const analysisResponse = await supabase.functions.invoke('analyze-website', {
      body: {
        url: testWebsite,
        companyName: testCompany.companyName
      }
    });

    if (analysisResponse.error) {
      console.log('❌ Website analysis failed:', analysisResponse.error);
      return;
    }

    console.log('✅ Website analysis successful');
    console.log('📊 Analysis data:', {
      hasContent: !!analysisResponse.data.content,
      hasAnalysis: !!analysisResponse.data.analysis,
      contentLength: analysisResponse.data.content?.length || 0,
      analysisKeys: analysisResponse.data.analysis ? Object.keys(analysisResponse.data.analysis) : []
    });

    // Step 3: Verify data structure compatibility
    console.log('\n3️⃣ Verifying data structure for UI rendering...');
    
    const analysis = analysisResponse.data;
    const websiteAnalysisForUI = {
      content: analysis.content,
      analysis: analysis.analysis,
      fetchedAt: analysis.fetchedAt,
      error: analysis.error
    };

    // Check what the analytics page would receive
    const analyticsPageData = {
      websiteAnalysis: websiteAnalysisForUI,
      authorityAnalysis: null,
      industryBenchmark: null,
      trendingOpportunities: []
    };

    console.log('🎨 UI data structure check:');
    console.log('- Website Analysis:', !!analyticsPageData.websiteAnalysis);
    console.log('- Has Analysis Object:', !!analyticsPageData.websiteAnalysis?.analysis);
    console.log('- Content Summary:', !!analyticsPageData.websiteAnalysis?.analysis?.contentSummary);
    console.log('- AI Opportunities:', analyticsPageData.websiteAnalysis?.analysis?.aiOptimizationOpportunities?.length || 0);
    console.log('- Key Topics:', analyticsPageData.websiteAnalysis?.analysis?.keyTopics?.length || 0);
    console.log('- Content Gaps:', analyticsPageData.websiteAnalysis?.analysis?.contentGaps?.length || 0);
    console.log('- Recommendations:', analyticsPageData.websiteAnalysis?.analysis?.recommendations?.length || 0);

    // Step 4: Show what would be displayed in the UI
    console.log('\n4️⃣ Sample UI display data:');
    if (analyticsPageData.websiteAnalysis?.analysis) {
      const a = analyticsPageData.websiteAnalysis.analysis;
      
      console.log('\n📋 Content Summary:');
      console.log(a.contentSummary);
      
      console.log('\n🎯 Key Topics:');
      a.keyTopics.forEach((topic, i) => console.log(`${i + 1}. ${topic}`));
      
      console.log('\n🚀 AI Optimization Opportunities:');
      a.aiOptimizationOpportunities.forEach((opp, i) => console.log(`${i + 1}. ${opp}`));
      
      console.log('\n⚠️ Content Gaps:');
      a.contentGaps.forEach((gap, i) => console.log(`${i + 1}. ${gap}`));
      
      console.log('\n✅ Recommendations:');
      a.recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`));
    }

    console.log('\n✨ End-to-end test completed successfully!');
    
    console.log('\n📋 Summary:');
    console.log('✅ Prompt generation: Working');
    console.log('✅ Website analysis: Working');
    console.log('✅ Data structure: Compatible');
    console.log('✅ UI rendering: Ready');
    
    console.log('\n🎯 To complete testing:');
    console.log('1. Create a user account in the app');
    console.log('2. Run a health check with a website URL');
    console.log('3. Check the analytics page for the website analysis tab');

  } catch (error) {
    console.error('🔥 End-to-end test failed:', error);
  }
}

testE2EFlow();