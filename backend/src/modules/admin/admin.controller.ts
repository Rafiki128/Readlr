import { Request, Response } from 'express';
import { getLearnersForAdmin } from './admin.service.js';

export async function handleGetLearners(req: Request, res: Response): Promise<void> {
  try {
    const learners = await getLearnersForAdmin();
    res.json({ success: true, learners });
  } catch (error) {
    console.error('Error fetching admin learner data:', error);
    res.status(500).json({ success: false, message: 'Failed to load learners' });
  }
}