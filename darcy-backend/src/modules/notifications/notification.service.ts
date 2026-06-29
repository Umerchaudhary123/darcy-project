import { Notification } from './notification.model';
import { sendFirebaseNotification } from '../../utils/firebase';
import logger from '../../utils/logger';

interface CreateNotificationInput {
  userId: string;
  clientId?: string;
  title: string;
  body: string;
  type: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

export const createNotification = async (input: CreateNotificationInput): Promise<Notification> => {
  const notification = await Notification.create(input as any);
  // Fire-and-forget Firebase push
  sendFirebaseNotification(input.userId, {
    title: input.title,
    body: input.body,
    data: { linkUrl: input.linkUrl || '', type: input.type },
  }).catch((err) => logger.warn('Push notification failed:', err));

  return notification;
};
