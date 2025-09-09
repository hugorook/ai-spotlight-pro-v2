// Create a test project to verify CMS integration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestProject() {
  console.log('🧪 Creating test project for CMS integration\n');

  // First, let me check what tables/columns exist
  console.log('1️⃣ Checking existing projects...');
  const { data: projects, error: listError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (listError) {
    console.log('❌ Cannot access projects table:', listError);
    return;
  }

  if (projects && projects.length > 0) {
    console.log('✅ Projects table exists');
    console.log('   Sample columns:', Object.keys(projects[0]).join(', '));
    
    // Check if it has autopilot columns
    const hasAutopilotColumns = 'cms_credentials' in projects[0];
    if (hasAutopilotColumns) {
      console.log('✅ Autopilot columns present');
    } else {
      console.log('⚠️ Autopilot columns missing - need to add them');
    }
  } else {
    console.log('📝 Projects table is empty');
  }

  // Create WordPress test project
  console.log('\n2️⃣ Creating WordPress test project...');
  
  const wpTestProject = {
    name: 'WordPress Test Site',
    site_url: 'https://wordpress-test.example.com',
    cms_provider: 'wordpress'
  };

  // Add autopilot fields if they exist
  if (projects && projects.length > 0 && 'cms_credentials' in projects[0]) {
    wpTestProject.cms_credentials = {
      domain: 'wordpress-test.example.com',
      authMethod: 'application_password',
      username: 'admin',
      applicationPassword: 'test-password-12345'
    };
    wpTestProject.autopilot_enabled = true;
    wpTestProject.autopilot_scopes = ['meta', 'h1', 'altText'];
    wpTestProject.site_script_status = 'connected';
  }

  const { data: wpProject, error: wpError } = await supabase
    .from('projects')
    .insert(wpTestProject)
    .select()
    .single();

  if (wpError) {
    console.log('❌ WordPress project creation failed:', wpError.message);
  } else {
    console.log('✅ WordPress test project created:', wpProject.id);
  }

  // Create Shopify test project  
  console.log('\n3️⃣ Creating Shopify test project...');
  
  const shopifyTestProject = {
    name: 'Shopify Test Store',
    site_url: 'https://test-store.myshopify.com',
    cms_provider: 'shopify'
  };

  if (projects && projects.length > 0 && 'cms_credentials' in projects[0]) {
    shopifyTestProject.cms_credentials = {
      shop: 'test-store',
      accessToken: 'test-shopify-token-12345',
      apiVersion: '2023-10'
    };
    shopifyTestProject.autopilot_enabled = true;
    shopifyTestProject.autopilot_scopes = ['meta', 'altText'];
    shopifyTestProject.site_script_status = 'connected';
  }

  const { data: shopifyProject, error: shopifyError } = await supabase
    .from('projects')
    .insert(shopifyTestProject)
    .select()
    .single();

  if (shopifyError) {
    console.log('❌ Shopify project creation failed:', shopifyError.message);
  } else {
    console.log('✅ Shopify test project created:', shopifyProject.id);
  }

  console.log('\n🎯 Test projects created! Now testing website-modifier...');

  // Test WordPress modification
  if (wpProject) {
    console.log('\n4️⃣ Testing WordPress modification...');
    
    const wpModification = {
      projectId: wpProject.id,
      actionType: 'meta',
      target: 'homepage',
      changes: {
        before: '',
        after: JSON.stringify({
          title: 'Optimized WordPress Title | SEO Ready',
          description: 'This WordPress site has been automatically optimized for better SEO performance.'
        }),
        metadata: { source: 'autopilot', cms: 'wordpress' }
      },
      rollbackToken: crypto.randomUUID()
    };

    const { data: wpResult, error: wpModError } = await supabase.functions.invoke('website-modifier', {
      body: wpModification
    });

    if (wpModError) {
      console.log('❌ WordPress modification failed:', wpModError.message);
    } else {
      console.log('✅ WordPress modification result:', wpResult);
    }
  }

  // Test Shopify modification
  if (shopifyProject) {
    console.log('\n5️⃣ Testing Shopify modification...');
    
    const shopifyModification = {
      projectId: shopifyProject.id,
      actionType: 'meta',
      target: 'products/test-product',
      changes: {
        before: '',
        after: JSON.stringify({
          title: 'Amazing Product | Best Price Online',
          description: 'Get the best deal on this amazing product with free shipping and excellent customer service.'
        }),
        metadata: { source: 'autopilot', cms: 'shopify' }
      },
      rollbackToken: crypto.randomUUID()
    };

    const { data: shopifyResult, error: shopifyModError } = await supabase.functions.invoke('website-modifier', {
      body: shopifyModification
    });

    if (shopifyModError) {
      console.log('❌ Shopify modification failed:', shopifyModError.message);
    } else {
      console.log('✅ Shopify modification result:', shopifyResult);
    }
  }

  console.log('\n🎉 Test complete! Check results above.');
}

createTestProject();