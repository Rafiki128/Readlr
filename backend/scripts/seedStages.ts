import { supabase, unwrap } from '../src/database/db.js';

// Add missing definitions without changing existing IDs or learner records.
const definitions = [
  { stage_number: 1, title: 'Valley of Vowels', description: 'Train vowel powers and restore the valley.', difficulty: 1 },
  { stage_number: 2, title: 'Blending Bridges', description: 'Join consonants and vowels to restore bridges.', difficulty: 2 },
  { stage_number: 3, title: 'CVC Kingdom', description: 'Read CVC words and restore the crown.', difficulty: 3 },
];
unwrap(await supabase.from('stages').upsert(definitions, { onConflict: 'stage_number', ignoreDuplicates: true }));
const rows = unwrap(await supabase.from('stages').select('id,stage_number,title').order('stage_number'));
console.log(JSON.stringify({ stages: rows }));
