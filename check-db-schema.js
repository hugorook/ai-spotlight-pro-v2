// Check database schema for autopilot tables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnixjucjhbozehjpevet.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXhqdWNqaGJvemVoanBldmV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzk2NDE0MCwiZXhwIjoyMDY5NTQwMTQwfQ.O4SBR0DkPiQnwE8H1SdlHg2wqKJIJOxtq6EbquwJCwc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema for autopilot features\n');

  try {
    // Check projects table columns
    console.log('1️⃣ Checking projects table columns...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (projectsError) {
      console.log('❌ Projects table error:', projectsError);
    } else {
      const sampleProject = projects[0];
      if (sampleProject) {
        console.log('✅ Projects table exists');
        console.log('   Columns found:', Object.keys(sampleProject).join(', '));
        
        // Check for autopilot columns
        const autopilotColumns = ['autopilot_frequency', 'last_autopilot_run', 'cms_credentials'];
        const missingColumns = autopilotColumns.filter(col => !(col in sampleProject));
        
        if (missingColumns.length > 0) {
          console.log('⚠️ Missing autopilot columns:', missingColumns.join(', '));
        } else {
          console.log('✅ All autopilot columns present');
        }
      } else {
        console.log('⚠️ Projects table is empty, cannot verify columns');
      }
    }

    // Check recommendations table
    console.log('\n2️⃣ Checking recommendations table...');
    const { data: recommendations, error: recError } = await supabase
      .from('recommendations')
      .select('*')
      .limit(1);

    if (recError) {
      console.log('❌ Recommendations table error:', recError);
    } else {
      console.log('✅ Recommendations table exists');
      if (recommendations[0]) {
        console.log('   Columns found:', Object.keys(recommendations[0]).join(', '));
      } else {
        console.log('   Table is empty');
      }
    }

    // Check changelog table  
    console.log('\n3️⃣ Checking changelog table...');
    const { data: changelog, error: changelogError } = await supabase
      .from('changelog')
      .select('*')
      .limit(1);

    if (changelogError) {
      console.log('❌ Changelog table error:', changelogError);
    } else {
      console.log('✅ Changelog table exists');
      if (changelog[0]) {
        console.log('   Columns found:', Object.keys(changelog[0]).join(', '));
      } else {
        console.log('   Table is empty');
      }
    }

    // Check tracker_logs table
    console.log('\n4️⃣ Checking tracker_logs table...');
    const { data: trackerLogs, error: trackerError } = await supabase
      .from('tracker_logs')
      .select('*')
      .limit(1);

    if (trackerError) {
      console.log('❌ Tracker_logs table missing or error:', trackerError.message);
      console.log('   This table needs to be created via migration');
    } else {
      console.log('✅ Tracker_logs table exists');
      if (trackerLogs[0]) {
        console.log('   Columns found:', Object.keys(trackerLogs[0]).join(', '));
      } else {
        console.log('   Table is empty');
      }
    }

    // Test creating a mock project with autopilot fields
    console.log('\n5️⃣ Testing project creation with autopilot fields...');
    
    const testProject = {
      user_id: '12345678-1234-1234-1234-123456789012', // Mock UUID
      name: 'Test Autopilot Project',
      site_url: 'https://test-autopilot.com',
      cms_provider: 'manual',
      autopilot_enabled: false,
      site_script_status: 'missing',
      cms_credentials: { test: true },
      autopilot_frequency: 'daily'
    };

    const { error: insertError } = await supabase
      .from('projects')
      .insert(testProject);

    if (insertError) {
      console.log('❌ Project insert failed:', insertError.message);
      if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        console.log('   This indicates missing columns from migration');
      }
    } else {
      console.log('✅ Project with autopilot fields created successfully');
      
      // Clean up test project
      await supabase
        .from('projects')
        .delete()
        .eq('site_url', 'https://test-autopilot.com');
    }

  } catch (error) {
    console.error('💥 Schema check failed:', error);
  }
}

checkDatabaseSchema();