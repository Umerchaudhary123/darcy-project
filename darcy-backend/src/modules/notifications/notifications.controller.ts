import { Request, Response, NextFunction } from 'express';
import { Notification } from './notification.model';
import { Client } from '../client/client.model';

export class NotificationsController {
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, unreadOnly } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: Record<string, unknown> = { userId: req.user!.id };
      if (unreadOnly === 'true') where['isRead'] = false;

      const { rows, count } = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit as string),
        offset,
      });

      const unreadCount = await Notification.count({ where: { userId: req.user!.id, isRead: false } });

      res.json({
        success: true,
        data: rows,
        meta: { total: count, unreadCount, page: parseInt(page as string) },
      });
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await Notification.update({ isRead: true }, { where: { id, userId: req.user!.id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Notification.update({ isRead: true }, { where: { userId: req.user!.id, isRead: false } });
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Notification.destroy({ where: { id: req.params.id, userId: req.user!.id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };
}
