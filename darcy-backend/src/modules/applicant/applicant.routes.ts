import { Router } from 'express';
import { ApplicantController } from './applicant.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new ApplicantController();

router.use(authenticate);

// Admin routes
router.get('/', requireAdmin, ctrl.getAll);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.delete);
router.post('/bulk', requireAdmin, ctrl.bulkUpdate);
router.get('/export/csv', requireAdmin, ctrl.exportCsv);
router.get('/stats', requireAdmin, ctrl.getStats);

// Client routes
router.get('/my', requireClient, ctrl.getClientApplicants);
router.patch('/:id/note', requireClient, ctrl.addClientNote);

export default router;
