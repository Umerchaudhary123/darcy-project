import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { AvailabilitySlot } from './availability.model';
import { Client } from '../client/client.model';
import { Applicant } from '../applicant/applicant.model';
import { AppError } from '../../middleware/errorHandler';

export class AvailabilityController {
  // Client: get own slots
  getMySlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const { from, to } = req.query;
      const where: Record<string, unknown> = { clientId: client.id };

      if (from || to) {
        where['startTime'] = {
          ...(from && { [Op.gte]: new Date(from as string) }),
          ...(to && { [Op.lte]: new Date(to as string) }),
        };
      }

      const slots = await AvailabilitySlot.findAll({
        where,
        include: [{ model: Applicant, as: 'bookedApplicant', required: false }],
        order: [['startTime', 'ASC']],
      });

      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  };

  // Client: create availability slot
  createSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const { startTime, endTime, isRecurring, recurringType, notes } = req.body;

      const slot = await AvailabilitySlot.create({
        clientId: client.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isRecurring: isRecurring || false,
        recurringType: recurringType || 'none',
        notes,
      });

      res.status(201).json({ success: true, data: slot });
    } catch (err) {
      next(err);
    }
  };

  // Client: delete slot (only if not booked)
  deleteSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const slot = await AvailabilitySlot.findOne({
        where: { id: req.params.id, clientId: client.id },
      });
      if (!slot) throw new AppError('Slot not found', 404);
      if (slot.isBooked) throw new AppError('Cannot delete a booked slot', 400);

      await slot.destroy();
      res.json({ success: true, message: 'Slot deleted' });
    } catch (err) {
      next(err);
    }
  };

  // Admin: get slots for a client
  getClientSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const { from, to } = req.query;
      const where: Record<string, unknown> = { clientId };

      if (from || to) {
        where['startTime'] = {
          ...(from && { [Op.gte]: new Date(from as string) }),
          ...(to && { [Op.lte]: new Date(to as string) }),
        };
      }

      const slots = await AvailabilitySlot.findAll({
        where,
        include: [{ model: Applicant, as: 'bookedApplicant', required: false }],
        order: [['startTime', 'ASC']],
      });

      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  };

  // Admin: book a slot for an applicant
  bookSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slot = await AvailabilitySlot.findByPk(req.params.id);
      if (!slot) throw new AppError('Slot not found', 404);
      if (slot.isBooked) throw new AppError('Slot already booked', 400);

      const { applicantId } = req.body;
      const applicant = await Applicant.findByPk(applicantId);
      if (!applicant) throw new AppError('Applicant not found', 404);

      await slot.update({ isBooked: true, bookedApplicantId: applicantId });
      await applicant.update({ interviewDate: slot.startTime, interviewSlotId: slot.id });

      res.json({ success: true, data: slot, message: 'Interview scheduled' });
    } catch (err) {
      next(err);
    }
  };

  // Admin: unbook a slot
  unbookSlot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slot = await AvailabilitySlot.findByPk(req.params.id);
      if (!slot) throw new AppError('Slot not found', 404);

      if (slot.bookedApplicantId) {
        await Applicant.update(
          { interviewDate: undefined, interviewSlotId: undefined },
          { where: { id: slot.bookedApplicantId } }
        );
      }

      await slot.update({ isBooked: false, bookedApplicantId: undefined });
      res.json({ success: true, message: 'Interview unbooked' });
    } catch (err) {
      next(err);
    }
  };

  // Admin: get all slots across all clients
  getAllSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query;
      const where: Record<string, unknown> = {};

      if (from || to) {
        where['startTime'] = {
          ...(from && { [Op.gte]: new Date(from as string) }),
          ...(to && { [Op.lte]: new Date(to as string) }),
        };
      }

      const slots = await AvailabilitySlot.findAll({
        where,
        include: [
          { model: Client, as: 'client', attributes: ['id', 'businessName'] },
          { model: Applicant, as: 'bookedApplicant', required: false },
        ],
        order: [['startTime', 'ASC']],
      });

      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  };
}
