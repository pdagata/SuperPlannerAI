/**
 * Supabase JS client — usable in both React (Vite) and Node (server-side).
 *
 * In React components use: import { supabase } from '@/lib/supabase'
 * In server-side code   use: import { supabase } from './src/lib/supabase.js'
 *
 * The client is useful for:
 *   - Supabase Auth (social login, magic links, etc.)
 *   - Realtime subscriptions
 *   - Storage (file uploads)
 *
 * The primary database connection still uses the pg driver (src/db/index.ts)
 * so all existing SQL queries continue to work unchanged.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite exposes VITE_* vars via import.meta.env; Node uses process.env.
function getEnv(key: string): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[`VITE_${key}`] ?? '';
  }
  return process.env[key] ?? '';
}

const supabaseUrl  = getEnv('SUPABASE_URL');
const supabaseKey  = getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — ' +
    'Supabase client features will be unavailable.',
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key',
);
