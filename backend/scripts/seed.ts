/**
 * Database Seeding Script
 * Populates the database with initial data for development
 */

import { createStage } from '../src/database/models/stage.model.js';
import { createLevel } from '../src/database/models/level.model.js';

async function seedDatabase() {
  try {
    console.log('Seeding stages and levels...');

    // Stage 1: Vowel Basics
    const stage1 = await createStage(
      1,
      'Vowel Basics',
      'Learn the fundamental vowel sounds in English',
      1
    );

    // Levels for Stage 1
    await createLevel(stage1.id, 1, 'The "Ah" Sound', 'Practice the /ɑ/ sound', 'ah', 1);
    await createLevel(stage1.id, 2, 'The "Ee" Sound', 'Practice the /iː/ sound', 'ee', 1);
    await createLevel(stage1.id, 3, 'The "Oo" Sound', 'Practice the /uː/ sound', 'oo', 1);
    await createLevel(stage1.id, 4, 'The "Eh" Sound', 'Practice the /ɛ/ sound', 'eh', 1);
    await createLevel(stage1.id, 5, 'The "Ih" Sound', 'Practice the /ɪ/ sound', 'ih', 1);

    // Stage 2: Consonant Combinations
    const stage2 = await createStage(
      2,
      'Consonant Blends',
      'Learn common consonant combinations',
      2
    );

    // Levels for Stage 2
    await createLevel(stage2.id, 1, 'The "Sh" Sound', 'Practice the /ʃ/ sound', 'sh', 2);
    await createLevel(stage2.id, 2, 'The "Th" Sound', 'Practice the /θ/ sound', 'th', 2);
    await createLevel(stage2.id, 3, 'The "Ch" Sound', 'Practice the /tʃ/ sound', 'ch', 2);

    // Stage 3: Advanced Sounds
    const stage3 = await createStage(
      3,
      'Advanced Phonetics',
      'Master complex phonetic patterns',
      3
    );

    // Levels for Stage 3
    await createLevel(stage3.id, 1, 'Silent Letters', 'Learn words with silent letters', 'ah', 3);
    await createLevel(stage3.id, 2, 'Diphthongs', 'Practice vowel combinations', 'ee', 3);
    await createLevel(stage3.id, 3, 'Stress Patterns', 'Learn word stress rules', 'oo', 3);

    console.log('✓ Database seeded successfully!');
    console.log(`
    Created 3 stages:
    - Stage 1: Vowel Basics (5 levels)
    - Stage 2: Consonant Blends (3 levels)
    - Stage 3: Advanced Phonetics (3 levels)
    `);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
