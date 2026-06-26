import { Router } from 'express';
import { DocumentController } from './document.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';
import { uploadSingle } from '../../middleware/upload';

const router = Router();
const ctrl = new DocumentController();

router.use(authenticate);

router.get('/my', requireClient, ctrl.getMyDocuments);
router.get('/client/:clientId', requireAdmin, ctrl.getClientDocuments);
router.post('/upload', uploadSingle, ctrl.upload);
router.get('/:id/download', ctrl.getDownloadUrl);
router.patch('/:id/review', requireAdmin, ctrl.review);
router.delete('/:id', ctrl.delete);

export default router;
