// Debug the website-modifier function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugWebsiteModifier() {
  console.log('🐛 Debugging website-modifier function\n');

  try {
    // Test with minimal valid payload
    const testRequest = {
      projectId: 'test-project-123',
      actionType: 'meta',
      target: 'homepage',
      changes: {
        before: '',
        after: JSON.stringify({
          title: 'Test Title',
          description: 'Test Description'
        }),
        metadata: {}
      },
      rollbackToken: 'test-rollback-token'
    };

    console.log('📤 Sending test request:', testRequest);

    const { data, error } = await supabase.functions.invoke('website-modifier', {
      body: testRequest
    });

    if (error) {
      console.log('❌ Function Error:', error);
      if (error.context) {
        const errorBody = await error.context.text();
        console.log('📄 Error Response Body:', errorBody);
      }
    } else {
      console.log('✅ Function Success:', data);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugWebsiteModifier();