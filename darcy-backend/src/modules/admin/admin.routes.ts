import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const ctrl = new AdminController();

const addClientSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  contractorType: z.enum(['P&D', 'Linehaul', 'Both']).default('P&D'),
});

const displayOrderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(100),
});

router.use(authenticate, requireAdmin);

router.get('/stats', ctrl.getDashboardStats);

router.get('/clients', ctrl.getClients);
router.post('/clients', validate(addClientSchema), ctrl.addClient);

// ✅ IMPORTANT: Put this BEFORE any /clients/:id routes
router.put(
  '/clients/display-order',
  validate(displayOrderSchema),
  ctrl.updateDisplayOrder
);

router.put('/clients/:id', ctrl.updateClient);
router.get('/clients/:id', ctrl.getClient);

router.patch('/clients/:id/archive', ctrl.setArchived);
router.post('/clients/:id/resend-invite', ctrl.resendInvite);

// Time tracking
router.post('/clients/:clientId/timer/start', ctrl.startTimer);
router.patch('/timer/:trackingId/stop', ctrl.stopTimer);
router.get('/clients/:clientId/timer/history', ctrl.getTimeHistory);

export default router;