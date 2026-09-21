/**
 * Character Routes
 */

import { Router } from 'express';
import * as characterController from './character.controller.js';
import { authMiddleware, requireRole } from '../../middleware/auth.js';

const router = Router();

// Get all characters
router.get('/', characterController.getAllCharacters);

// Get specific character
router.get('/:id', characterController.getCharacter);

// Create character
router.post('/', authMiddleware, requireRole('admin'), characterController.createCharacter);

// Update character
router.put('/:id', authMiddleware, requireRole('admin'), characterController.updateCharacter);

// Delete character
router.delete('/:id', authMiddleware, requireRole('admin'), characterController.deleteCharacter);

export default router;
