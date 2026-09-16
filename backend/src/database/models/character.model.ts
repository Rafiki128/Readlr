import { supabase, unwrap } from '../db.js';
import type { Character, CharacterAppearance, CharacterBehavior, CharacterPersonality, CharacterVoice, CreateCharacterRequest, UpdateCharacterRequest } from '../../modules/character/character.types.js';

type CharacterRow = Omit<Character, 'appearance' | 'personality' | 'voice' | 'behaviors'>;
type AppearanceRow = Omit<CharacterAppearance, 'accessories'> & { accessories: string[] };
function mergeDefined<T extends object>(base: T, updates: Partial<T>): T { return Object.fromEntries(Object.entries({ ...base, ...updates }).filter(([, value]) => value !== undefined)) as T; }

export async function createCharacter(data: CreateCharacterRequest): Promise<Character> {
  const character = unwrap(await supabase.from('characters').insert({ name: data.name, template: data.template }).select().single()) as CharacterRow;
  const character_id = character.id;
  unwrap(await supabase.from('character_appearance').insert({ character_id, ...data.appearance }));
  unwrap(await supabase.from('character_personality').insert({ character_id, ...data.personality }));
  unwrap(await supabase.from('character_voice').insert({ character_id, ...data.voice }));
  if (data.behaviors?.length) unwrap(await supabase.from('character_behaviors').insert(data.behaviors.map(({ id: _id, character_id: _characterId, ...behavior }) => ({ character_id, ...behavior }))));
  return getCharacterById(character_id);
}

export async function getCharacterById(id: number): Promise<Character> {
  const character = unwrap(await supabase.from('characters').select('*').eq('id', id).maybeSingle()) as CharacterRow | null;
  if (!character) throw new Error(`Character with id ${id} not found`);
  const [appearanceResult, personalityResult, voiceResult, behaviorsResult] = await Promise.all([
    supabase.from('character_appearance').select('*').eq('character_id', id).maybeSingle(),
    supabase.from('character_personality').select('*').eq('character_id', id).maybeSingle(),
    supabase.from('character_voice').select('*').eq('character_id', id).maybeSingle(),
    supabase.from('character_behaviors').select('*').eq('character_id', id),
  ]);
  const appearance = unwrap(appearanceResult) as AppearanceRow | null;
  const personality = unwrap(personalityResult) as CharacterPersonality | null;
  const voice = unwrap(voiceResult) as CharacterVoice | null;
  const behaviors = unwrap(behaviorsResult) as CharacterBehavior[];
  if (!appearance || !personality || !voice) throw new Error(`Character with id ${id} is missing related configuration`);
  return { ...character, appearance, personality, voice, behaviors };
}
export async function getCharacterByName(name: string): Promise<Character> { const character = unwrap(await supabase.from('characters').select('id').eq('name', name).maybeSingle()) as { id: number } | null; if (!character) throw new Error(`Character with name ${name} not found`); return getCharacterById(character.id); }
export async function getAllCharacters(): Promise<Character[]> { const characters = unwrap(await supabase.from('characters').select('id')) as { id: number }[]; return Promise.all(characters.map(({ id }) => getCharacterById(id))); }
export async function updateCharacter(id: number, updates: UpdateCharacterRequest): Promise<Character> {
  const current = await getCharacterById(id);
  if (updates.name) unwrap(await supabase.from('characters').update({ name: updates.name }).eq('id', id));
  if (updates.appearance) unwrap(await supabase.from('character_appearance').update(mergeDefined(current.appearance, updates.appearance)).eq('character_id', id));
  if (updates.personality) unwrap(await supabase.from('character_personality').update(mergeDefined(current.personality, updates.personality)).eq('character_id', id));
  if (updates.voice) unwrap(await supabase.from('character_voice').update(mergeDefined(current.voice, updates.voice)).eq('character_id', id));
  if (updates.behaviors) { unwrap(await supabase.from('character_behaviors').delete().eq('character_id', id)); if (updates.behaviors.length) unwrap(await supabase.from('character_behaviors').insert(updates.behaviors.map(({ id: _id, character_id: _characterId, ...behavior }) => ({ character_id: id, ...behavior })))); }
  return getCharacterById(id);
}
export async function deleteCharacter(id: number): Promise<void> { unwrap(await supabase.from('characters').delete().eq('id', id)); }
