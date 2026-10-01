import { Request, Response } from 'express';
import { getLearnersForAdmin } from './admin.service.js';

export async function handleGetLearners(req: Request, res: Response): Promise<void> {
  try {
    const learners = await getLearnersForAdmin();
    res.json({ success: true, learners });
  } catch (error) {
    console.error('Error fetching admin learner data:', error);
    if (error instanceof Error && error.message === 'Stage definitions are missing. Run stage setup.') {
      res.status(503).json({ success: false, message: error.message }); return;
    }
    res.status(500).json({ success: false, message: 'Failed to load learners' });
  }
}
