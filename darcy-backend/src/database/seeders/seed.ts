import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { Transaction } from 'sequelize';
import { sequelize } from '../../config/database';
import { User } from '../../modules/auth/user.model';
import { Client } from '../../modules/client/client.model';
import { Subscription } from '../../modules/subscription/subscription.model';
import { Applicant, AiAssessment } from '../../modules/applicant/applicant.model';
import { AvailabilitySlot } from '../../modules/availability/availability.model';
import { Conversation, Message } from '../../modules/conversations/conversation.model';
import { Notification } from '../../modules/notifications/notification.model';
import { TimeTracking } from '../../modules/admin/timeTracking.model';
import { PendingOnboarding } from '../../modules/onboarding/onboarding.model';
import logger from '../../utils/logger';

const configuredClientIdentity = process.env.CLIENT_EMAIL || 'client@darcystaffing.com';
const configuredClientIsEmail = configuredClientIdentity.includes('@');

const credentials = {
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@darcystaffing.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@darcystaffing.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123456',
  },
  client: {
    email: configuredClientIsEmail ? configuredClientIdentity : 'client@darcystaffing.com',
    username: process.env.CLIENT_USERNAME || (configuredClientIsEmail ? 'unza_xwear' : configuredClientIdentity),
    password: process.env.CLIENT_PASSWORD || '@Hadi123',
  },
};

function assertPostgresUrl() {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error(
      'DATABASE_URL must be a PostgreSQL/Neon connection string. The local sqlite placeholder cannot seed this PostgreSQL application.'
    );
  }
}

async function ensureUser(
  values: {
    name: string;
    email: string;
    username: string;
    password: string;
    role: 'admin' | 'super_admin' | 'client';
  },
  transaction: Transaction
) {
  const user = await User.findOne({ where: { email: values.email }, transaction });
  if (user) {
    await user.update({ ...values, isActive: true }, { transaction });
    return user;
  }

  return User.create({ ...values, isActive: true }, { transaction });
}

function assessment(
  scoreBreakdown: AiAssessment['scoreBreakdown'],
  summary: string,
  strengths: string[],
  concerns: string[],
  matchedSkills: string[],
  missingRequirements: string[],
  experienceYears: number | null
): AiAssessment {
  return {
    scoreBreakdown,
    summary,
    strengths,
    concerns,
    matchedSkills,
    missingRequirements,
    suggestedInterviewQuestions: [
      'Walk us through your most relevant route or delivery experience.',
      'How do you handle a safety issue discovered during a pre-trip inspection?',
      'Describe a time you had to protect an on-time delivery under pressure.',
    ],
    experienceYears,
    criteria: 'Relevant experience 30, licenses and skills 25, safety and compliance 20, work history 15, resume quality 10.',
    disclaimer: 'Decision support only. A human reviewer must verify credentials and make the final hiring decision.',
  };
}

async function ensureApplicant(
  clientId: string,
  values: Record<string, unknown>,
  transaction: Transaction
) {
  const applicant = await Applicant.findOne({
    where: { clientId, email: values.email },
    transaction,
  });

  if (applicant) {
    await applicant.update(values, { transaction });
    return applicant;
  }

  return Applicant.create({ ...values, clientId }, { transaction });
}

async function seed() {
  assertPostgresUrl();
  await sequelize.authenticate();
  logger.info('Seeder connected to PostgreSQL');

  const seeded = await sequelize.transaction(async (transaction) => {
    const admin = await ensureUser({
      name: 'Darcy Admin',
      username: 'darcy_admin',
      email: credentials.admin.email,
      password: credentials.admin.password,
      role: 'admin',
    }, transaction);

    const superAdmin = await ensureUser({
      name: 'Darcy Super Admin',
      username: 'darcy_super_admin',
      email: credentials.superAdmin.email,
      password: credentials.superAdmin.password,
      role: 'super_admin',
    }, transaction);

    const clientUser = await ensureUser({
      name: 'Alex Morgan',
      username: credentials.client.username,
      email: credentials.client.email,
      password: credentials.client.password,
      role: 'client',
    }, transaction);

    const clientValues = {
      userId: clientUser.id,
      businessName: 'Demo Logistics LLC',
      contractorType: 'Both' as const,
      contactName: 'Alex Morgan',
      email: credentials.client.email,
      phone: '+1 555 010 2026',
      address: '1200 Demo Terminal Road',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      agreementSigned: true,
      agreementSignedAt: new Date(),
      status: 'active' as const,
      displayOrder: 1,
      adminNotes: 'Idempotent demo client created by the project seeder.',
    };

    let client = await Client.findOne({ where: { userId: clientUser.id }, transaction });
    if (client) {
      await client.update(clientValues, { transaction });
    } else {
      client = await Client.create(clientValues, { transaction });
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscriptionValues = {
      plan: 'Both' as const,
      status: 'active' as const,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      extraIndeedListings: 2,
      extraTerminals: 1,
      i9Service: true,
      monthlyAmount: 399,
    };
    const subscription = await Subscription.findOne({ where: { clientId: client.id }, transaction });
    if (subscription) {
      await subscription.update(subscriptionValues, { transaction });
    } else {
      await Subscription.create({ ...subscriptionValues, clientId: client.id }, { transaction });
    }

    const applicantRows = [
      {
        firstName: 'Jordan', lastName: 'Miller', email: 'jordan.miller@demo.test', phone: '+1 555 010 3001',
        avpStatus: 'passed', backgroundStatus: 'clear', drugScreenStatus: 'negative', medCardStatus: 'verified',
        pipelineStatus: 'interview_ready', hireStatus: 'in_progress', source: 'Indeed', aiScore: 91,
        aiRecommendation: 'high_alignment', aiModel: 'seeded-demo', aiAnalyzedAt: new Date(), resumeFileName: 'jordan-miller-cv.pdf',
        aiAssessment: assessment(
          { relevantExperience: 28, licensesAndSkills: 23, safetyAndCompliance: 19, workHistory: 13, resumeQuality: 8 },
          'Strong delivery candidate with current commercial credentials, recent route experience, and clear safety evidence.',
          ['Five years of route delivery experience', 'Current CDL and medical card', 'Documented safe-driving record'],
          ['Confirm terminal-specific availability'], ['CDL', 'DOT compliance', 'Route delivery', 'Pre-trip inspections'], [], 5
        ),
      },
      {
        firstName: 'Avery', lastName: 'Brooks', email: 'avery.brooks@demo.test', phone: '+1 555 010 3002',
        avpStatus: 'passed', backgroundStatus: 'ordered', drugScreenStatus: 'negative', medCardStatus: 'verified',
        pipelineStatus: 'in_progress', hireStatus: 'in_progress', source: 'Referral', aiScore: 78,
        aiRecommendation: 'good_alignment', aiModel: 'seeded-demo', aiAnalyzedAt: new Date(), resumeFileName: 'avery-brooks-cv.docx',
        aiAssessment: assessment(
          { relevantExperience: 24, licensesAndSkills: 21, safetyAndCompliance: 15, workHistory: 11, resumeQuality: 7 },
          'Good alignment for delivery work; background verification is still in progress.',
          ['Three years of delivery work', 'Current CDL', 'Stable recent employment'],
          ['Background check remains open'], ['CDL', 'Customer service', 'Delivery scanning'], ['Final background clearance'], 3
        ),
      },
      {
        firstName: 'Taylor', lastName: 'Reed', email: 'taylor.reed@demo.test', phone: '+1 555 010 3003',
        avpStatus: 'pending', backgroundStatus: 'pending', drugScreenStatus: 'pending', medCardStatus: 'verified',
        pipelineStatus: 'in_progress', hireStatus: 'in_progress', source: 'Direct', aiScore: 66,
        aiRecommendation: 'good_alignment', aiModel: 'seeded-demo', aiAnalyzedAt: new Date(), resumeFileName: 'taylor-reed-cv.pdf',
        aiAssessment: assessment(
          { relevantExperience: 21, licensesAndSkills: 18, safetyAndCompliance: 10, workHistory: 10, resumeQuality: 7 },
          'Relevant local delivery experience is present, but compliance evidence needs verification.',
          ['Two years of local delivery experience', 'Clear work chronology'],
          ['Safety and compliance details are limited'], ['Local delivery', 'Warehouse operations'], ['Verified safety record', 'Completed screening checks'], 2
        ),
      },
      {
        firstName: 'Casey', lastName: 'Johnson', email: 'casey.johnson@demo.test', phone: '+1 555 010 3004',
        avpStatus: 'pending', backgroundStatus: 'pending', drugScreenStatus: 'pending', medCardStatus: 'missing',
        pipelineStatus: 'in_progress', hireStatus: 'in_progress', source: 'Indeed', aiScore: 48,
        aiRecommendation: 'review', aiModel: 'seeded-demo', aiAnalyzedAt: new Date(), resumeFileName: 'casey-johnson-cv.txt',
        aiAssessment: assessment(
          { relevantExperience: 16, licensesAndSkills: 12, safetyAndCompliance: 6, workHistory: 8, resumeQuality: 6 },
          'Some transferable driving experience is shown, but required credential evidence is incomplete.',
          ['Customer-facing driving experience'], ['Medical card not provided', 'Commercial license details are unclear'],
          ['Customer service', 'Navigation'], ['Medical card', 'Verified commercial license', 'Safety history'], 1
        ),
      },
      {
        firstName: 'Morgan', lastName: 'Lee', email: 'morgan.lee@demo.test', phone: '+1 555 010 3005',
        avpStatus: 'pending', backgroundStatus: 'pending', drugScreenStatus: 'pending', medCardStatus: 'pending',
        pipelineStatus: 'in_progress', hireStatus: 'in_progress', source: 'Walk-in', aiScore: null,
        aiRecommendation: null, aiAssessment: null, aiModel: null, aiAnalyzedAt: null, resumeFileName: null,
      },
    ];

    const applicants: Applicant[] = [];
    for (const row of applicantRows) {
      applicants.push(await ensureApplicant(client.id, row, transaction));
    }

    const slotBase = new Date();
    slotBase.setDate(slotBase.getDate() + 1);
    slotBase.setHours(10, 0, 0, 0);
    for (let index = 0; index < 3; index += 1) {
      const startTime = new Date(slotBase);
      startTime.setDate(startTime.getDate() + index);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      const notes = `Demo interview slot ${index + 1}`;
      const existing = await AvailabilitySlot.findOne({ where: { clientId: client.id, notes }, transaction });
      const values = { startTime, endTime, isBooked: false, isRecurring: false, recurringType: 'none' as const };
      if (existing) await existing.update(values, { transaction });
      else await AvailabilitySlot.create({ ...values, clientId: client.id, notes }, { transaction });
    }

    let conversation = await Conversation.findOne({
      where: { clientId: client.id, subject: 'Welcome to Darcy Staffing' },
      transaction,
    });
    if (!conversation) {
      conversation = await Conversation.create({
        clientId: client.id,
        subject: 'Welcome to Darcy Staffing',
        isActive: true,
        unreadByClient: 1,
        unreadByAdmin: 0,
        lastMessageAt: new Date(),
      }, { transaction });
    }

    const messages = [
      { senderId: admin.id, senderRole: 'admin' as const, content: 'Welcome! Your demo workspace and applicant pipeline are ready.' },
      { senderId: clientUser.id, senderRole: 'client' as const, content: 'Thanks. I can see the applicant ranking and interview slots.' },
    ];
    for (const values of messages) {
      const existing = await Message.findOne({
        where: { conversationId: conversation.id, content: values.content },
        transaction,
      });
      if (!existing) await Message.create({ ...values, conversationId: conversation.id, isRead: true }, { transaction });
    }

    const notificationValues = [
      {
        userId: clientUser.id,
        title: 'AI-ranked pipeline is ready',
        body: 'Demo applicants are ranked by CV screening score. Human review is still required.',
        type: 'system',
        linkUrl: '/pipeline',
        metadata: { seeded: true },
      },
      {
        userId: admin.id,
        title: 'Demo client activated',
        body: 'Demo Logistics LLC and its applicant pipeline are available for testing.',
        type: 'system',
        linkUrl: '/admin/pipeline',
        metadata: { seeded: true, clientId: client.id },
      },
    ];
    for (const values of notificationValues) {
      const existing = await Notification.findOne({ where: { userId: values.userId, title: values.title }, transaction });
      if (existing) await existing.update({ ...values, clientId: client.id }, { transaction });
      else await Notification.create({ ...values, clientId: client.id, isRead: false }, { transaction });
    }

    const timeNote = 'Seeded demo account review';
    const trackedStart = new Date(Date.now() - 45 * 60 * 1000);
    const trackedEnd = new Date();
    const timeEntry = await TimeTracking.findOne({ where: { clientId: client.id, notes: timeNote }, transaction });
    const timeValues = {
      adminId: admin.id,
      startTime: trackedStart,
      endTime: trackedEnd,
      durationMinutes: 45,
    };
    if (timeEntry) await timeEntry.update(timeValues, { transaction });
    else await TimeTracking.create({ ...timeValues, clientId: client.id, notes: timeNote }, { transaction });

    const onboardingEmail = 'prospect@demo-logistics.test';
    const onboardingValues = {
      email: onboardingEmail,
      businessName: 'Prospect Freight LLC',
      contractorType: 'P&D',
      contactName: 'Jamie Parker',
      phone: '+1 555 010 4040',
      address: '500 Prospect Avenue, Dallas, TX 75202',
      agreementSigned: false,
      status: 'pending' as const,
      formData: { source: 'seed', note: 'Demo pending onboarding record' },
    };
    const onboarding = await PendingOnboarding.findOne({ where: { email: onboardingEmail }, transaction });
    if (onboarding) await onboarding.update(onboardingValues, { transaction });
    else await PendingOnboarding.create(onboardingValues, { transaction });

    return {
      users: [admin, superAdmin, clientUser].length,
      clients: 1,
      applicants: applicants.length,
      availabilitySlots: 3,
      conversations: 1,
      notifications: notificationValues.length,
      pendingOnboardings: 1,
    };
  });

  logger.info(`Seed complete: ${JSON.stringify(seeded)}`);
  logger.info(`Admin login: ${credentials.admin.email}`);
  logger.info(`Super admin login: ${credentials.superAdmin.email}`);
  logger.info(`Client login: ${credentials.client.email}`);
  logger.info(`Client username: ${credentials.client.username}`);
}

seed()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error('Seed failed:', error);
    await sequelize.close().catch(() => undefined);
    process.exit(1);
  });
