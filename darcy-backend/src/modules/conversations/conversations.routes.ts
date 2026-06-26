import { Router } from 'express';
import { ConversationsController } from './conversations.controller';
import { authenticate, requireAdmin, requireClient } from '../../middleware/auth';

const router = Router();
const ctrl = new ConversationsController();

router.use(authenticate);

router.get('/my', requireClient, ctrl.getMyConversations);
router.get('/', requireAdmin, ctrl.getAllConversations);
router.post('/', ctrl.create);
router.get('/:conversationId/messages', ctrl.getMessages);
router.post('/:conversationId/messages', ctrl.sendMessage);

export default router;
