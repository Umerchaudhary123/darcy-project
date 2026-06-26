import { Request, Response, NextFunction } from 'express';
import { Conversation, Message } from './conversation.model';
import { Client } from '../client/client.model';
import { User } from '../auth/user.model';
import { AppError } from '../../middleware/errorHandler';
import { createNotification } from '../notifications/notification.service';

export class ConversationsController {
  // Client: get own conversations
  getMyConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const conversations = await Conversation.findAll({
        where: { clientId: client.id, isActive: true },
        order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
      });

      res.json({ success: true, data: conversations });
    } catch (err) {
      next(err);
    }
  };

  // Admin: get all conversations
  getAllConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.query;
      const where: Record<string, unknown> = { isActive: true };
      if (clientId) where['clientId'] = clientId;

      const conversations = await Conversation.findAll({
        where,
        include: [{ model: Client, as: 'client', attributes: ['id', 'businessName', 'email'] }],
        order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
      });

      res.json({ success: true, data: conversations });
    } catch (err) {
      next(err);
    }
  };

  // Create conversation
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subject, clientId: bodyClientId, initialMessage } = req.body;

      let clientId: string;

      if (req.user!.role === 'client') {
        const client = await Client.findOne({ where: { userId: req.user!.id } });
        if (!client) throw new AppError('Client not found', 404);
        clientId = client.id;
      } else {
        clientId = bodyClientId;
      }

      const conversation = await Conversation.create({
        clientId,
        subject,
        lastMessageAt: new Date(),
      });

      if (initialMessage) {
        await Message.create({
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: initialMessage,
          senderRole: req.user!.role === 'client' ? 'client' : 'admin',
        });

        // Notify the other party
        await this._notifyNewMessage(conversation.id, req.user!.id, req.user!.role, clientId);
      }

      res.status(201).json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  };

  // Get messages in a conversation
  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) throw new AppError('Conversation not found', 404);

      // Access check for clients
      if (req.user!.role === 'client') {
        const client = await Client.findOne({ where: { userId: req.user!.id } });
        if (!client || conversation.clientId !== client.id) throw new AppError('Forbidden', 403);

        // Mark admin messages as read
        await Message.update({ isRead: true }, {
          where: { conversationId, senderRole: 'admin', isRead: false },
        });
        await conversation.update({ unreadByClient: 0 });
      } else {
        // Admin reads client messages
        await Message.update({ isRead: true }, {
          where: { conversationId, senderRole: 'client', isRead: false },
        });
        await conversation.update({ unreadByAdmin: 0 });
      }

      const messages = await Message.findAll({
        where: { conversationId },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
        order: [['createdAt', 'ASC']],
      });

      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  };

  // Send message
  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const { content } = req.body;

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) throw new AppError('Conversation not found', 404);

      const senderRole = req.user!.role === 'client' ? 'client' : 'admin';

      const message = await Message.create({
        conversationId,
        senderId: req.user!.id,
        content,
        senderRole,
      });

      // Update unread counts and timestamp
      const update: Record<string, unknown> = { lastMessageAt: new Date() };
      if (senderRole === 'client') {
        update['unreadByAdmin'] = (conversation.unreadByAdmin || 0) + 1;
      } else {
        update['unreadByClient'] = (conversation.unreadByClient || 0) + 1;
      }
      await conversation.update(update);

      await this._notifyNewMessage(conversationId, req.user!.id, req.user!.role, conversation.clientId);

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  };

  private _notifyNewMessage = async (
    conversationId: string,
    senderId: string,
    senderRole: string,
    clientId: string
  ) => {
    try {
      if (senderRole === 'client') {
        // Find admin users to notify
        const admins = await User.findAll({ where: { role: ['admin', 'super_admin'] } });
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            clientId,
            title: 'New Message',
            body: 'A client sent a new message.',
            type: 'new_message',
            linkUrl: `/admin/messages?conv=${conversationId}`,
          });
        }
      } else {
        // Notify client
        const client = await Client.findByPk(clientId);
        if (client?.userId) {
          await createNotification({
            userId: client.userId,
            clientId,
            title: 'New Message from Darcy Staffing',
            body: 'You have a new message.',
            type: 'new_message',
            linkUrl: `/messages?conv=${conversationId}`,
          });
        }
      }
    } catch (err) {
      // Non-critical, log and continue
    }
  };
}
