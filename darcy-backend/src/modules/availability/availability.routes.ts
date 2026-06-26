import { Router } from 'express';
import { AvailabilityController } from './availability.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new AvailabilityController();

router.use(authenticate);

// Client
router.get('/my', requireClient, ctrl.getMySlots);
router.post('/my', requireClient, ctrl.createSlot);
router.delete('/my/:id', requireClient, ctrl.deleteSlot);

// Admin
router.get('/', requireAdmin, ctrl.getAllSlots);
router.get('/client/:clientId', requireAdmin, ctrl.getClientSlots);
router.patch('/:id/book', requireAdmin, ctrl.bookSlot);
router.patch('/:id/unbook', requireAdmin, ctrl.unbookSlot);

export default router;
