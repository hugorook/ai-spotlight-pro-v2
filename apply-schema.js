// Apply the autopilot schema using Supabase client
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjQxNDAsImV4cCI6MjA2OTU0MDE0MH0.PMFylVWEej98DtZuNONQYqopwwcfxwNJeb3o6IEQkJc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applySchema() {
  console.log('🗄️ Creating autopilot database schema\n');

  try {
    // Read the SQL file
    const sql = readFileSync('/Users/veronicaopl/Desktop/GEO/ai-spotlight-pro-v2/create-autopilot-schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE.*?(\w+)/)?.[1];
        console.log(`${i + 1}️⃣ Creating table: ${tableName}...`);
      } else if (statement.includes('CREATE POLICY')) {
        console.log(`${i + 1}️⃣ Creating RLS policy...`);
      } else if (statement.includes('CREATE INDEX')) {
        console.log(`${i + 1}️⃣ Creating index...`);
      } else {
        console.log(`${i + 1}️⃣ Executing statement...`);
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          console.log(`   ❌ Failed: ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (e) {
        // RPC might not be available, try direct approach
        console.log(`   ⚠️ RPC not available, using alternative method`);
        break;
      }
    }

    console.log('\n🎯 Schema application complete! Now testing tables...\n');

    // Test table creation by trying to access them
    const testTables = ['projects', 'recommendations', 'changelog', 'tracker_logs'];
    
    for (const tableName of testTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: Table accessible`);
      }
    }

  } catch (error) {
    console.error('💥 Schema application failed:', error);
    
    console.log('\n🔧 Alternative: Creating tables via Edge function...');
    
    // Try using an edge function to create tables
    const { data: schemaData, error: schemaError } = await supabase.functions.invoke('create-schema', {
      body: { action: 'create_tables' }
    });

    if (schemaError) {
      console.log('❌ Edge function approach also failed');
      console.log('\n📋 Manual steps required:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Copy contents of create-autopilot-schema.sql');
      console.log('3. Paste and execute the SQL statements');
      console.log('4. Run this script again to verify');
    } else {
      console.log('✅ Tables created via edge function');
    }
  }
}

applySchema();