const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseServiceRole = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceRole = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error("Error reading env file:", e);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  console.log("Checking dental records...");
  const { data: records, error } = await supabase
    .from('dental_records')
    .select('id, patient_id, odontogram_state');
  
  if (error) {
    console.error("Error fetching records:", error);
    return;
  }
  
  console.log("Dental Records:", JSON.stringify(records, null, 2));

  console.log("\nChecking dental consultations...");
  const { data: consultations, error2 } = await supabase
    .from('dental_consultations')
    .select('id, patient_id, odontogram_snapshot, treatment_notes');
  
  if (error2) {
    console.error("Error fetching consultations:", error2);
    return;
  }
  
  console.log("Dental Consultations:", JSON.stringify(consultations, null, 2));
}

run();
