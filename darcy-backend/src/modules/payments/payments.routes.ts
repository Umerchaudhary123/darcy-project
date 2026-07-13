import { Router } from 'express';
import { PaymentsController } from './payments.controller';

const router = Router();
const ctrl = new PaymentsController();

router.post('/webhook', ctrl.webhook);

router.post('/checkout', ctrl.createCheckout);
router.get('/checkout/:sessionId', ctrl.getCheckoutSession);

export default router;
