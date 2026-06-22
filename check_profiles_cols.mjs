import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxxghnnajjlgkjoavyfj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Nz4RccWltNot4ct3Dc43lA_FFmVsp84';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Checking if feedback table exists...");
  const { data: fData, error: fError } = await supabase.from('feedback').select('*').limit(1);
  console.log("feedback table result:", fData, fError);

  console.log("Checking if profiles has feedback columns...");
  const { data: pData1, error: pError1 } = await supabase.from('profiles').select('feedback').limit(1);
  console.log("profiles.feedback result:", pData1, pError1);

  const { data: pData2, error: pError2 } = await supabase.from('profiles').select('teacher_feedback').limit(1);
  console.log("profiles.teacher_feedback result:", pData2, pError2);
}

main();
