// Test the schema creation function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSchemaCreation() {
  console.log('🛠️ Testing schema creation\n');

  try {
    const { data, error } = await supabase.functions.invoke('create-schema', {
      body: { action: 'create_tables' }
    });

    if (error) {
      console.log('❌ Schema creation failed:', error.message);
      return;
    }

    console.log('✅ Schema creation result:', data);

    // Now test if tables are accessible
    console.log('\n🔍 Testing table access...');

    const testTables = ['projects', 'recommendations', 'changelog', 'tracker_logs'];
    
    for (const tableName of testTables) {
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (tableError) {
        console.log(`❌ ${tableName}: ${tableError.message}`);
      } else {
        console.log(`✅ ${tableName}: Table accessible`);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testSchemaCreation();