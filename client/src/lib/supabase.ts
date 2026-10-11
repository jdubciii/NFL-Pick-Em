import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsljipyoihcoqkuphhll.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbGppcHlvaWhjb3FrdXBoaGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTY3NDUsImV4cCI6MjEwNjEzMjc0NX0.OD0dom_H-n0cAPeQyngmUPJhrKNNr9G9m6DqpPsFGYw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
