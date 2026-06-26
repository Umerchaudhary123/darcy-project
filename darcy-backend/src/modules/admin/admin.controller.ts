import { Request, Response, NextFunction } from 'express';
import { Op, literal } from 'sequelize';
import crypto from 'crypto';
import { Client } from '../client/client.model';
import { User } from '../auth/user.model';
import { Subscription } from '../subscription/subscription.model';
import { TimeTracking } from './timeTracking.model';
import { Applicant } from '../applicant/applicant.model';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail, emailTemplates } from '../../utils/email';

export class AdminController {
  // Cursor-based paginated client list (shared with super admin)
  getClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit = 20, search, status, all } = req.query;

      const where: Record<string, unknown> = {};

      if (status && status !== 'all') {
        where['status'] = status;
      } else if (!status) {
        where['status'] = { [Op.ne]: 'archived' };
      }

      if (search) {
        where[Op.or as any] = [
          { businessName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { contactName: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (cursor) {
        const cursorClient = await Client.findByPk(cursor as string);
        if (cursorClient) {
          where['displayOrder'] = { [Op.gt]: cursorClient.displayOrder };
        }
      }

      const pageLimit = parseInt(limit as string);

      const clients = await Client.findAll({
        where,
        include: [
          { model: Subscription, as: 'subscription', required: false },
          { model: Applicant, as: 'applicants', attributes: ['id', 'pipelineStatus'], required: false },
        ],
        order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
        limit: all ? undefined : pageLimit + 1,
      });

      const hasMore = !all && clients.length > pageLimit;
      if (hasMore) clients.pop();

      const nextCursor = hasMore ? clients[clients.length - 1].id : null;

      res.json({ success: true, data: clients, meta: { hasMore, nextCursor } });
    } catch (err) {
      next(err);
    }
  };

  // Get single client details
  getClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findByPk(req.params.id, {
        include: [
          { model: User, as: 'user', attributes: { exclude: ['password'] } },
          { model: Subscription, as: 'subscription' },
        ],
      });
      if (!client) throw new AppError('Client not found', 404);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  };

  // Add client manually (admin flow)
  addClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessName, email, contactName, phone, contractorType, plan } = req.body;

      const existing = await Client.findOne({ where: { email } });
      if (existing) throw new AppError('A client with this email already exists', 409);

      const maxOrder = await Client.max('displayOrder') as number || 0;
      const inviteToken = crypto.randomBytes(32).toString('hex');

      const client = await Client.create({
        businessName, email, contactName, phone,
        contractorType: contractorType || 'P&D',
        status: 'invited',
        displayOrder: maxOrder + 1,
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      // Send invite email
      const inviteUrl = `${process.env.FRONTEND_URL}/signup?invite=${inviteToken}`;
      await sendEmail({
        to: email,
        subject: 'You\'ve been invited to Darcy Staffing',
        html: emailTemplates.invite(inviteUrl, businessName),
      });

      res.status(201).json({ success: true, data: client, message: 'Client invited successfully' });
    } catch (err) {
      next(err);
    }
  };

  // Update client (admin)
  updateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (!client) throw new AppError('Client not found', 404);

      await client.update(req.body);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  };

  // Archive / restore client
  setArchived = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { archived } = req.body;
      const client = await Client.findByPk(req.params.id);
      if (!client) throw new AppError('Client not found', 404);

      await client.update({ status: archived ? 'archived' : 'active' });
      res.json({ success: true, message: `Client ${archived ? 'archived' : 'restored'}` });
    } catch (err) {
      next(err);
    }
  };

  // Update display order (drag-and-drop)
  updateDisplayOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderedIds } = req.body as { orderedIds: string[] };

      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        throw new AppError('orderedIds must be a non-empty array', 400);
      }

      await Promise.all(
        orderedIds.map((id, index) =>
          Client.update({ displayOrder: index }, { where: { id } })
        )
      );

      res.json({ success: true, message: 'Display order updated' });
    } catch (err) {
      next(err);
    }
  };

  // Time tracking
  startTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const client = await Client.findByPk(clientId);
      if (!client) throw new AppError('Client not found', 404);

      const tracking = await TimeTracking.create({
        clientId,
        adminId: req.user!.id,
        startTime: new Date(),
      });

      res.json({ success: true, data: tracking });
    } catch (err) {
      next(err);
    }
  };

  stopTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { trackingId } = req.params;
      const tracking = await TimeTracking.findByPk(trackingId);
      if (!tracking) throw new AppError('Tracking session not found', 404);

      const endTime = new Date();
      const durationMinutes = Math.round(
        (endTime.getTime() - tracking.startTime.getTime()) / 60000
      );

      await tracking.update({ endTime, durationMinutes, notes: req.body.notes });
      res.json({ success: true, data: tracking });
    } catch (err) {
      next(err);
    }
  };

  getTimeHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const since = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days

      const history = await TimeTracking.findAll({
        where: { clientId, createdAt: { [Op.gte]: since } },
        include: [{ model: User, as: 'admin', attributes: ['id', 'name', 'email'] }],
        order: [['createdAt', 'DESC']],
      });

      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  };

  // Resend invite
  resendInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (!client) throw new AppError('Client not found', 404);

      const inviteToken = crypto.randomBytes(32).toString('hex');
      await client.update({
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const inviteUrl = `${process.env.FRONTEND_URL}/signup?invite=${inviteToken}`;
      await sendEmail({
        to: client.email,
        subject: 'Darcy Staffing — Invitation Reminder',
        html: emailTemplates.invite(inviteUrl, client.businessName),
      });

      res.json({ success: true, message: 'Invite resent' });
    } catch (err) {
      next(err);
    }
  };

  // Dashboard stats
  getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [totalClients, activeClients, totalApplicants, interviewReady] = await Promise.all([
        Client.count(),
        Client.count({ where: { status: 'active' } }),
        Applicant.count(),
        Applicant.count({ where: { pipelineStatus: 'interview_ready' } }),
      ]);

      res.json({
        success: true,
        data: { totalClients, activeClients, totalApplicants, interviewReady },
      });
    } catch (err) {
      next(err);
    }
  };
}
