import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { Client } from '../client/client.model';
import { User } from '../auth/user.model';
import { Subscription } from '../subscription/subscription.model';
import { PendingOnboarding } from '../onboarding/onboarding.model';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail } from '../../utils/email';
import logger from '../../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const PLAN_PRICE_IDS: Record<string, string> = {
  'P&D': process.env.STRIPE_PD_PRICE_ID as string,
  'Linehaul': process.env.STRIPE_LINEHAUL_PRICE_ID as string,
};

export class PaymentsController {

  createCheckout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, plan, email, businessName } = req.body;

      const priceId = PLAN_PRICE_IDS[plan];
      if (!priceId) throw new AppError('Invalid plan', 400);

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/account-setup?session_id={CHECKOUT_SESSION_ID}&onboarding=${sessionId}`,
        cancel_url: `${process.env.FRONTEND_URL}/signup?step=4&session=${sessionId}`,
        metadata: { onboardingId: sessionId, businessName, plan },
        subscription_data: {
          metadata: { onboardingId: sessionId, plan },
        },
      });

      if (sessionId) {
        await PendingOnboarding.update(
          { status: 'payment_pending', stripeSessionId: session.id },
          { where: { id: sessionId } }
        );
      }

      res.json({ success: true, data: { url: session.url, sessionId: session.id } });
    } catch (err) {
      next(err);
    }
  };

  webhook = async (req: Request, res: Response) => {
    console.log('🔥 WEBHOOK ROUTE HIT');
    console.log('🔥 BODY IS BUFFER:', Buffer.isBuffer(req.body) ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM');
    console.log('🔥 STRIPE-SIGNATURE:', req.headers['stripe-signature'] ? '✅ EXISTS' : '❌ MISSING');
    console.log('🔥 WEBHOOK SECRET SET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ YES' : '❌ NO');

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.log('❌ SIGNATURE VERIFICATION FAILED:', err.message);
      logger.error('Webhook signature verification failed:', err);
      res.status(400).send('Webhook error');
      return;
    }

    console.log('✅ EVENT VERIFIED:', event.type, event.id);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this._handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this._handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_failed':
          await this._handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log('ℹ️ UNHANDLED EVENT:', event.type);
      }
    } catch (err) {
      console.log('❌ WEBHOOK PROCESSING ERROR:', err);
      logger.error('Webhook processing error:', err);
    }

    res.json({ received: true });
  };

  private _handleCheckoutComplete = async (session: Stripe.Checkout.Session) => {
    console.log('🔥 _handleCheckoutComplete CALLED');
    console.log('🔥 SESSION ID:', session.id);
    console.log('🔥 METADATA:', JSON.stringify(session.metadata));
    console.log('🔥 CUSTOMER EMAIL:', session.customer_email);

    const { onboardingId, businessName, plan } = session.metadata || {};

    if (!onboardingId) {
      console.log('❌ NO ONBOARDING ID - SKIPPING');
      return;
    }

    const pending = await PendingOnboarding.findByPk(onboardingId);
    if (!pending) {
      console.log('❌ PENDING NOT FOUND:', onboardingId);
      return;
    }

    console.log('✅ PENDING FOUND:', pending.email, pending.businessName);

    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
    console.log('✅ STRIPE SUB RETRIEVED:', stripeSub.id);

    // Check if client already exists for this email (prevents duplicate webhook crash)
    const existingClient = await Client.findOne({ where: { email: pending.email } });
    if (existingClient) {
      console.log('ℹ️ CLIENT ALREADY EXISTS FOR THIS EMAIL — SKIPPING DUPLICATE CREATE:', existingClient.id);
      await pending.update({ status: 'completed' });
      return;
    }

    let user = await User.findOne({ where: { email: pending.email } });

    if (!user) {
      user = await User.create({
        name: pending.contactName || businessName || pending.businessName,
        email: pending.email,
        password: 'TEMP_' + Math.random().toString(36).slice(2),
        role: 'client',
        isActive: false,
      });
      console.log('✅ USER CREATED:', user.id, user.email);
    } else {
      console.log('ℹ️ USER ALREADY EXISTS:', user.id, user.email);
    }

    const maxOrder = (await Client.max('displayOrder') as number) || 0;
    const client = await Client.create({
      userId: user.id,
      businessName: pending.businessName,
      email: pending.email,
      contactName: pending.contactName || '',
      phone: pending.phone || '',
      contractorType: (pending.contractorType as any) || 'P&D',
      indeedUsername: pending.indeedUsername || '',
      firstAdvantageUsername: pending.firstAdvantageUsername || '',
      agreementSigned: pending.agreementSigned,
      agreementSignedAt: pending.agreementSignedAt,
      status: 'active',
      displayOrder: maxOrder + 1,
      stripeCustomerId: session.customer as string,
    });

    console.log('✅ CLIENT CREATED:', client.id, client.businessName);

    await Subscription.create({
      clientId: client.id,
      plan: plan || 'P&D',
      status: 'active',
      stripeSubscriptionId: stripeSub.id,
      stripePriceId: stripeSub.items.data[0]?.price.id,
      currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
      monthlyAmount: (stripeSub.items.data[0]?.price.unit_amount || 0) / 100,
    });

    console.log('✅ SUBSCRIPTION CREATED');

    await pending.update({ status: 'completed' });
    logger.info(`🎉 New client created: ${client.businessName} (${client.id})`);
  };

  private _handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
    const sub = await Subscription.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;
    await sub.update({
      status: subscription.status as any,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    });
  };

  private _handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
    const sub = await Subscription.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;
    await sub.update({ status: 'canceled' });
    const client = await Client.findByPk(sub.clientId);
    if (client) await client.update({ status: 'suspended' });
  };

  private _handlePaymentFailed = async (invoice: Stripe.Invoice) => {
    const sub = await Subscription.findOne({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });
    if (!sub) return;
    await sub.update({ status: 'past_due' });
    const client = await Client.findByPk(sub.clientId);
    if (client) {
      await sendEmail({
        to: client.email,
        subject: 'Payment Failed — Darcy Staffing',
        html: `<p>Your recent payment failed. Please update your billing info to continue service.</p>`,
      });
    }
  };

  getCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      console.log('🔥 GET CHECKOUT SESSION:', sessionId);

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const user = session.customer_email
        ? await User.findOne({ where: { email: session.customer_email } })
        : null;

      console.log('🔥 USER FOUND:', user ? user.id : 'NULL');

      res.json({
        success: true,
        data: {
          email: session.customer_email,
          userId: user?.id || null,
          status: session.payment_status,
        },
      });
    } catch (err) {
      next(err);
    }
  };
  manualComplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      console.log('🔧 MANUAL COMPLETE:', sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('🔧 SESSION METADATA:', JSON.stringify(session.metadata));
      await this._handleCheckoutComplete(session);
      res.json({ success: true, message: 'Done' });
    } catch (err) {
      next(err);
    }
  };
}