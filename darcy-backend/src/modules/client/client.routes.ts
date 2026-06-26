import { Router } from 'express';
import { ClientController } from './client.controller';
import { authenticate, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new ClientController();

router.get('/profile', authenticate, requireClient, ctrl.getProfile);
router.put('/profile', authenticate, requireClient, ctrl.updateProfile);
router.put('/credentials', authenticate, requireClient, ctrl.updateCredentials);
router.post('/setup', ctrl.completeSetup);

export default router;
