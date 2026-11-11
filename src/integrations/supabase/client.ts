import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hdtuuinrizzdcgvjxhel.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A34Is7VA4PeCDvr0xvA6aw_EOVOtsnX";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
