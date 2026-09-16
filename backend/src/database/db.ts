import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load backend/.env before this module reads the Supabase credentials. This also
// covers standalone commands such as `npm -w backend run seed`.
const databaseDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(databaseDirectory, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before starting the backend.');
}

/** Server-only Supabase client. Never expose the service-role key to the frontend. */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(`Supabase database error: ${error.message}`);
  return data;
}
