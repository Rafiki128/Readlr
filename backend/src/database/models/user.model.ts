import { supabase, unwrap } from '../db.js';
export interface User { id: number; email: string; password_hash: string; role: 'learner' | 'teacher'; created_at: string; updated_at: string; }
export async function findUserByEmail(email: string): Promise<User | undefined> { return unwrap(await supabase.from('users').select('*').eq('email', email).maybeSingle()) as User | undefined; }
export async function findUserById(id: number): Promise<User | undefined> { return unwrap(await supabase.from('users').select('*').eq('id', id).maybeSingle()) as User | undefined; }
export async function createUser(email: string, passwordHash: string, role: User['role']): Promise<User> { return unwrap(await supabase.from('users').insert({ email, password_hash: passwordHash, role }).select().single()) as User; }
