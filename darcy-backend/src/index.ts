import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { sequelize } from './config/database';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';
import clientRoutes from './modules/client/client.routes';
import adminRoutes from './modules/admin/admin.routes';
import applicantRoutes from './modules/applicant/applicant.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import conversationRoutes from './modules/conversations/conversations.routes';
import documentRoutes from './modules/document/document.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import paymentRoutes from './modules/payments/payments.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

const app = express();

app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use(limiter);

/* ------------------------------------------------------------------ */
/* STRIPE WEBHOOK RAW BODY (MUST BE BEFORE JSON PARSER) */
/* ------------------------------------------------------------------ */
app.use(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' })
);

/* ------------------------------------------------------------------ */
/* NORMAL BODY PARSERS */
/* ------------------------------------------------------------------ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
const API = '/api/v1';
app.use(`${API}/auth`,authRoutes);
app.use(`${API}/onboarding`, onboardingRoutes);
app.use(`${API}/clients`, clientRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/applicants`, applicantRoutes);
app.use(`${API}/availability`, availabilityRoutes);
app.use(`${API}/conversations`, conversationRoutes);
app.use(`${API}/documents`, documentRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/notifications`, notificationRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database + Server start
async function bootstrap() {
  try {
    await sequelize.authenticate();

    console.log('✅ Database connected');
    console.log(`🚀 Server starting on port ${PORT}`);

    app.listen(PORT, () => {
      console.log(`🚀 Darcy Staffing API running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;