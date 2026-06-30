import { Router } from 'express';
import { ApplicantController } from './applicant.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new ApplicantController();

router.use(authenticate);

// ======================
// Admin Routes
// ======================
router.get('/', requireAdmin, ctrl.getAll);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.delete);
router.post('/bulk', requireAdmin, ctrl.bulkUpdate);
router.get('/export/csv', requireAdmin, ctrl.exportCsv);
router.get('/stats', requireAdmin, ctrl.getStats);

// ======================
// Client Routes
// ======================
router.get('/my', requireClient, ctrl.getClientApplicants);
router.get('/my/stats', requireClient, ctrl.getMyStats);
router.patch('/:id/note', requireClient, ctrl.addClientNote);

export default router;