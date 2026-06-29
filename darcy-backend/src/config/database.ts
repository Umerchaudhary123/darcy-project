import { Sequelize } from 'sequelize-typescript';
import logger from '../utils/logger';

// Import all models
import { User } from '../modules/auth/user.model';
import { RefreshToken } from '../modules/auth/refreshToken.model';
import { Client } from '../modules/client/client.model';
import { Applicant } from '../modules/applicant/applicant.model';
import { Subscription } from '../modules/subscription/subscription.model';
import { Document } from '../modules/document/document.model';
import { Conversation, Message } from '../modules/conversations/conversation.model';
import { Notification } from '../modules/notifications/notification.model';
import { AvailabilitySlot } from '../modules/availability/availability.model';
import { TimeTracking } from '../modules/admin/timeTracking.model';
import { PendingOnboarding } from '../modules/onboarding/onboarding.model';

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
  models: [
    User,
    RefreshToken,
    Client,
    Applicant,
    Subscription,
    Document,
    Conversation,
    Message,
    Notification,
    AvailabilitySlot,
    TimeTracking,
    PendingOnboarding,
  ],
  define: {
    timestamps: true,
    underscored: true,
  },
});

export default sequelize;