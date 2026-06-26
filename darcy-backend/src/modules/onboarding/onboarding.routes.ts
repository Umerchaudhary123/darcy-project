import { Router } from 'express';
import { OnboardingController } from './onboarding.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();
const ctrl = new OnboardingController();

router.post('/step', ctrl.saveStep);
router.get('/session/:sessionId', ctrl.getBySession);
router.get('/invite/:token', ctrl.verifyInvite);
router.post('/payment-pending', ctrl.setPaymentPending);
router.get('/pending', authenticate, requireAdmin, ctrl.listPending);

export default router;
