import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(databaseDirectory, '../..');
dotenv.config({ path: path.resolve(backendDirectory, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function unwrap<T = any>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(`Supabase database error: ${error.message}`);
  return data;
}
