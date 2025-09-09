// Check what tables exist in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExistingTables() {
  console.log('🔍 Checking what tables exist in the database\n');

  // List of tables we expect for the autopilot system
  const expectedTables = [
    'companies',
    'projects', 
    'health_check_sessions',
    'ai_tests',
    'recommendations',
    'changelog',
    'generated_prompts',
    'analytics_data',
    'tracker_logs'
  ];

  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${tableName} - does not exist`);
        } else {
          console.log(`⚠️ ${tableName} - error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${tableName} - exists`);
        if (data && data.length > 0) {
          console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`   (empty table)`);
        }
      }
    } catch (e) {
      console.log(`💥 ${tableName} - unexpected error: ${e.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log('The database appears to be missing core tables.');
  console.log('This suggests we need to run migrations or create the schema.');
}

checkExistingTables();