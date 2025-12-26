import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://etdnnxdigxgyqntpaiaz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2qzY8AaWRy_8kQ5LrO8nZg_Dz1nIaxD';

export const supabase = createClient(supabaseUrl, supabaseKey);