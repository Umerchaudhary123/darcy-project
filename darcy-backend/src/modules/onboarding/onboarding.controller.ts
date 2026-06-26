import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PendingOnboarding } from './onboarding.model';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail, emailTemplates } from '../../utils/email';

export class OnboardingController {
  // Step 1-4: Save form data progressively
  saveStep = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { step, sessionId, ...data } = req.body;

      let record = sessionId
        ? await PendingOnboarding.findOne({ where: { id: sessionId } })
        : null;

      if (!record) {
        record = await PendingOnboarding.create({
          email: data.email || '',
          businessName: data.businessName || '',
          contractorType: data.contractorType || 'P&D',
          formData: data,
          status: 'pending',
        });
      } else {
        await record.update({ formData: { ...(record.formData || {}), ...data } });
      }

      // Step-specific field updates
      if (step === 1) {
        await record.update({ contractorType: data.contractorType });
      } else if (step === 2) {
        await record.update({
          email: data.email,
          businessName: data.businessName,
          contactName: data.contactName,
          phone: data.phone,
          indeedUsername: data.indeedUsername,
          firstAdvantageUsername: data.firstAdvantageUsername,
        });
      } else if (step === 3) {
        await record.update({
          agreementSigned: true,
          agreementSignedAt: new Date(),
        });
      }

      res.json({ success: true, data: { sessionId: record.id } });
    } catch (err) {
      next(err);
    }
  };

  // Get pending onboarding by session/token
  getBySession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const record = await PendingOnboarding.findByPk(sessionId);
      if (!record) throw new AppError('Session not found', 404);
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  };

  // Verify invite token
  verifyInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const record = await PendingOnboarding.findOne({ where: { inviteToken: token } });

      if (!record) throw new AppError('Invalid invite token', 400);
      if (record.inviteExpiresAt && record.inviteExpiresAt < new Date()) {
        throw new AppError('Invite token has expired', 400);
      }

      res.json({ success: true, data: { email: record.email, businessName: record.businessName } });
    } catch (err) {
      next(err);
    }
  };

  // Mark as payment pending (after Stripe redirect)
  setPaymentPending = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, stripeSessionId } = req.body;
      const record = await PendingOnboarding.findByPk(sessionId);
      if (!record) throw new AppError('Session not found', 404);

      await record.update({ status: 'payment_pending', stripeSessionId });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  // List all pending (admin only)
  listPending = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await PendingOnboarding.findAll({
        where: { status: ['pending', 'invited', 'payment_pending'] },
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  };
}
