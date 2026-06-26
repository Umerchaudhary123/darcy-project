import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new SubscriptionController();

router.use(authenticate);

router.get('/my', requireClient, ctrl.getMy);
router.get('/my/billing-portal', requireClient, ctrl.getBillingPortal);
router.get('/client/:clientId', requireAdmin, ctrl.getClientSubscription);
router.patch('/client/:clientId/addons', requireAdmin, ctrl.updateAddons);
router.delete('/client/:clientId', requireAdmin, ctrl.cancel);

export default router;
