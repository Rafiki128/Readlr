import { supabase, unwrap } from '../../database/db.js';
import { OPEN_POLICY, type ClassroomPolicy } from './classroom.policy.js';

export async function classroomState() {
  return unwrap(await supabase.from('classroom_control').select('policy,overrides,revision,updated_at').eq('id',1).single()) as {
    policy: ClassroomPolicy; overrides: Record<string,ClassroomPolicy>; revision:number; updated_at:string;
  };
}
export async function effectivePolicy(userId:number) {
  const state = await classroomState();
  return {policy:state.overrides[String(userId)] ?? state.policy ?? OPEN_POLICY, revision:state.revision};
}
