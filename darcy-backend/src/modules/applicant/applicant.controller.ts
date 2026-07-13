import { Request, Response, NextFunction } from 'express';
import { Op, literal } from 'sequelize';
import { Applicant } from './applicant.model';
import { Client } from '../client/client.model';
import { AppError } from '../../middleware/errorHandler';
import { createNotification } from '../notifications/notification.service';

const computePipelineStatus = (applicant: Partial<Applicant>): 'in_progress' | 'interview_ready' | 'disqualified' => {
  const failedStatuses = ['failed'];
  const fields = ['avpStatus', 'backgroundStatus', 'drugScreenStatus', 'medCardStatus'] as const;

  for (const field of fields) {
    const val = applicant[field];
    if (val && failedStatuses.includes(val)) return 'disqualified';
  }

  const allPassed =
    ['passed', 'waived'].includes(applicant.avpStatus || '') &&
    ['clear'].includes(applicant.backgroundStatus || '') &&
    ['negative'].includes(applicant.drugScreenStatus || '') &&
    ['verified'].includes(applicant.medCardStatus || '');

  return allPassed ? 'interview_ready' : 'in_progress';
};

export class ApplicantController {
  // Admin: get all applicants (with client filter)
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, search, status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: Record<string, unknown> = {};

      if (clientId) where['clientId'] = clientId;
      if (status) where['pipelineStatus'] = status;

      if (search) {
        where[Op.or as any] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Auto-removal logic
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

      where[Op.not as any] = [
        { pipelineStatus: 'disqualified', disqualifiedAt: { [Op.lt]: tenDaysAgo } },
        {
          pipelineStatus: 'in_progress',
          hireStatus: null,
          nonQualifiedAt: { [Op.lt]: fortyFiveDaysAgo },
        },
      ];

      const { rows, count } = await Applicant.findAndCountAll({
        where,
        include: [{ model: Client, attributes: ['id', 'businessName'] }],
        order: [literal('"ai_score" DESC NULLS LAST'), ['createdAt', 'DESC']],
        limit: parseInt(limit as string),
        offset,
      });

      res.json({
        success: true,
        data: rows,
        meta: {
          total: count,
          page: parseInt(page as string),
          pages: Math.ceil(count / parseInt(limit as string)),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // Client: get their applicants (read-only)
  getClientApplicants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const { search, status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: Record<string, unknown> = { clientId: client.id };

      if (status) where['pipelineStatus'] = status;
      if (search) {
        where[Op.or as any] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows, count } = await Applicant.findAndCountAll({
        where,
        attributes: { exclude: ['adminNotes'] },
        order: [literal('"ai_score" DESC NULLS LAST'), ['createdAt', 'DESC']],
        limit: parseInt(limit as string),
        offset,
      });

      res.json({
        success: true,
        data: rows,
        meta: { total: count, page: parseInt(page as string), pages: Math.ceil(count / parseInt(limit as string)) },
      });
    } catch (err) {
      next(err);
    }
  };

  // Admin: create applicant
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, firstName, lastName, email, phone, source } = req.body;

      const client = await Client.findByPk(clientId);
      if (!client) throw new AppError('Client not found', 404);

      const applicant = await Applicant.create({
        clientId, firstName, lastName, email, phone, source,
        nonQualifiedAt: new Date(),
      });

      res.status(201).json({ success: true, data: applicant });
    } catch (err) {
      next(err);
    }
  };

  // Admin: update vetting fields
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicant = await Applicant.findByPk(req.params.id);
      if (!applicant) throw new AppError('Applicant not found', 404);

      const allowedFields = [
        'firstName', 'lastName', 'email', 'phone', 'source',
        'avpStatus', 'backgroundStatus', 'drugScreenStatus', 'medCardStatus',
        'hireStatus', 'interviewDate', 'interviewSlotId', 'adminNotes',
      ];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      // Recalculate pipeline status when vetting fields change
      const vettingFields = ['avpStatus', 'backgroundStatus', 'drugScreenStatus', 'medCardStatus'];
      const hasVettingUpdate = vettingFields.some((f) => updates[f]);

      if (hasVettingUpdate) {
        const merged = { ...applicant.toJSON(), ...updates };
        const newStatus = computePipelineStatus(merged);
        updates['pipelineStatus'] = newStatus;

        if (newStatus === 'disqualified' && applicant.pipelineStatus !== 'disqualified') {
          updates['disqualifiedAt'] = new Date();
        }

        if (newStatus === 'interview_ready' && applicant.pipelineStatus !== 'interview_ready') {
          // Notify client
          const client = await Client.findByPk(applicant.clientId, {
            include: [{ model: require('../auth/user.model').User }],
          });
          if (client?.userId) {
            await createNotification({
              userId: client.userId,
              clientId: client.id,
              title: 'Applicant Ready for Interview',
              body: `${applicant.firstName} ${applicant.lastName} has passed all vetting checks and is ready to interview.`,
              type: 'applicant_ready',
              linkUrl: '/pipeline',
            });
          }
        }
      }

      await applicant.update(updates);
      res.json({ success: true, data: applicant });
    } catch (err) {
      next(err);
    }
  };

  // Client: add note to applicant
  addClientNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const applicant = await Applicant.findOne({
        where: { id: req.params.id, clientId: client.id },
      });
      if (!applicant) throw new AppError('Applicant not found', 404);

      await applicant.update({ clientNotes: req.body.notes });
      res.json({ success: true, message: 'Note saved' });
    } catch (err) {
      next(err);
    }
  };

  // Admin: delete applicant
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicant = await Applicant.findByPk(req.params.id);
      if (!applicant) throw new AppError('Applicant not found', 404);
      await applicant.destroy();
      res.json({ success: true, message: 'Applicant deleted' });
    } catch (err) {
      next(err);
    }
  };

  // Admin: bulk status update
  bulkUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids, updates } = req.body;
      const allowedFields = [
        'avpStatus', 'backgroundStatus', 'drugScreenStatus', 'medCardStatus',
        'hireStatus', 'adminNotes',
      ];
      const safeUpdates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (updates?.[field] !== undefined) safeUpdates[field] = updates[field];
      }
      await Applicant.update(safeUpdates, { where: { id: ids } });
      res.json({ success: true, message: `${ids.length} applicants updated` });
    } catch (err) {
      next(err);
    }
  };

  // Admin: export CSV
  exportCsv = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.query;
      const where: Record<string, unknown> = {};
      if (clientId) where['clientId'] = clientId;

      const applicants = await Applicant.findAll({ where });

      const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'AI Score', 'AI Alignment', 'AVP', 'Background', 'Drug Screen', 'Med Card', 'Status', 'Hire Status', 'Created'];
      const rows = applicants.map((a) => [
        a.firstName, a.lastName, a.email, a.phone,
        a.aiScore ?? '', a.aiRecommendation || '',
        a.avpStatus, a.backgroundStatus, a.drugScreenStatus, a.medCardStatus,
        a.pipelineStatus, a.hireStatus || '', a.createdAt.toISOString(),
      ]);

      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="applicants.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  };

  // Pipeline stats
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.query;
      const where: Record<string, unknown> = {};
      if (clientId) where['clientId'] = clientId;

      const [total, interviewReady, inProgress, disqualified, hired] = await Promise.all([
        Applicant.count({ where }),
        Applicant.count({ where: { ...where, pipelineStatus: 'interview_ready' } }),
        Applicant.count({ where: { ...where, pipelineStatus: 'in_progress' } }),
        Applicant.count({ where: { ...where, pipelineStatus: 'disqualified' } }),
        Applicant.count({ where: { ...where, hireStatus: 'hired' } }),
      ]);

      res.json({ success: true, data: { total, interviewReady, inProgress, disqualified, hired } });
    } catch (err) {
      next(err);
    }
  };
// Client: pipeline stats
getMyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await Client.findOne({
      where: {
        userId: req.user!.id,
      },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    const where = {
      clientId: client.id,
    };

    const [
      total,
      interviewReady,
      inProgress,
      disqualified,
      hired,
    ] = await Promise.all([
      Applicant.count({ where }),
      Applicant.count({
        where: {
          ...where,
          pipelineStatus: 'interview_ready',
        },
      }),
      Applicant.count({
        where: {
          ...where,
          pipelineStatus: 'in_progress',
        },
      }),
      Applicant.count({
        where: {
          ...where,
          pipelineStatus: 'disqualified',
        },
      }),
      Applicant.count({
        where: {
          ...where,
          hireStatus: 'hired',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        interviewReady,
        inProgress,
        disqualified,
        hired,
      },
    });
  } catch (err) {
    next(err);
  }
};
}
