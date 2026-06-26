import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { Subscription } from './subscription.model';
import { Client } from '../client/client.model';
import { AppError } from '../../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export class SubscriptionController {
  // Client: get own subscription
  getMy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({
        where: { userId: req.user!.id },
        include: [{ model: Subscription }],
      });
      if (!client) throw new AppError('Client not found', 404);
      res.json({ success: true, data: client.subscription });
    } catch (err) {
      next(err);
    }
  };

  // Client: manage billing (Stripe portal)
  getBillingPortal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client?.stripeCustomerId) throw new AppError('No billing account found', 404);

      const session = await stripe.billingPortal.sessions.create({
        customer: client.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL}/subscription`,
      });

      res.json({ success: true, data: { url: session.url } });
    } catch (err) {
      next(err);
    }
  };

  // Admin: get subscription for a client
  getClientSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await Subscription.findOne({ where: { clientId: req.params.clientId } });
      if (!sub) throw new AppError('Subscription not found', 404);
      res.json({ success: true, data: sub });
    } catch (err) {
      next(err);
    }
  };

  // Admin: update add-ons
  updateAddons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await Subscription.findOne({ where: { clientId: req.params.clientId } });
      if (!sub) throw new AppError('Subscription not found', 404);

      const { extraIndeedListings, extraTerminals, i9Service } = req.body;
      await sub.update({ extraIndeedListings, extraTerminals, i9Service });

      res.json({ success: true, data: sub });
    } catch (err) {
      next(err);
    }
  };

  // Admin: cancel subscription
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await Subscription.findOne({ where: { clientId: req.params.clientId } });
      if (!sub?.stripeSubscriptionId) throw new AppError('Subscription not found', 404);

      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await sub.update({ status: 'canceled' });

      res.json({ success: true, message: 'Subscription cancelled' });
    } catch (err) {
      next(err);
    }
  };
}
