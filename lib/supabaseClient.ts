import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysufxvelehtudogjkan.supabase.co';
const supabaseAnonKey = 'sb_publishable_-XZSWHH5QxfEnlPpKc1clA_93ewpwd9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
