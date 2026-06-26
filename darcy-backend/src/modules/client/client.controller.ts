import { Request, Response, NextFunction } from 'express';
import { Client } from './client.model';
import { User } from '../auth/user.model';
import { Subscription } from '../subscription/subscription.model';
import { AppError } from '../../middleware/errorHandler';

export class ClientController {
  // Get own profile
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({
        where: { userId: req.user!.id },
        include: [{ model: Subscription }],
      });
      if (!client) throw new AppError('Client profile not found', 404);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  };

  // Update own profile
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const allowed = ['contactName', 'phone', 'address', 'city', 'state', 'zip'];
      const updates: Record<string, unknown> = {};
      allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      await client.update(updates);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  };

  // Update credentials (Indeed, First Advantage)
  updateCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const { indeedUsername, indeedPassword, firstAdvantageUsername, firstAdvantagePassword } = req.body;
      await client.update({ indeedUsername, indeedPassword, firstAdvantageUsername, firstAdvantagePassword });

      res.json({ success: true, message: 'Credentials updated' });
    } catch (err) {
      next(err);
    }
  };

  // Complete account setup (post-payment)
  completeSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, username, password } = req.body;

      const user = await User.findByPk(userId);
      if (!user) throw new AppError('User not found', 404);

      if (username) {
        const exists = await User.findOne({ where: { username } });
        if (exists && exists.id !== userId) throw new AppError('Username already taken', 409);
        user.username = username;
      }

      user.password = password;
      user.isActive = true;
      await user.save();

      res.json({ success: true, message: 'Account setup complete' });
    } catch (err) {
      next(err);
    }
  };
}
