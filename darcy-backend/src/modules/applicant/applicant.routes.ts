import { Router } from 'express';
import { ApplicantController } from './applicant.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new ApplicantController();

router.use(authenticate);

// Debug route
router.get('/stats', (req, res, next) => {
    console.log('🔥 USER:', req.user);
    next();
}, requireAdmin, ctrl.getStats);

// Admin routes
router.get('/', requireAdmin, ctrl.getAll);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.delete);
router.post('/bulk', requireAdmin, ctrl.bulkUpdate);
router.get('/export/csv', requireAdmin, ctrl.exportCsv);

// Client routes
router.get('/my', requireClient, ctrl.getClientApplicants);
router.patch('/:id/note', requireClient, ctrl.addClientNote);

export default router;
