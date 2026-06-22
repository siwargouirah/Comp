import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxxghnnajjlgkjoavyfj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Nz4RccWltNot4ct3Dc43lA_FFmVsp84';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
