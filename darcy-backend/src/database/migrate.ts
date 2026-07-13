import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { Sequelize, DataTypes } from 'sequelize';
import logger from '../utils/logger';

const databaseUrl = process.env.DATABASE_URL || '';
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL/Neon connection string before migrations can run.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

async function ensureJsonbColumn(table: string, column: string) {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable(table);
  const current = columns[column];

  if (!current) {
    await qi.addColumn(table, column, { type: DataTypes.JSONB, allowNull: true });
    return;
  }

  if (!String(current.type).toUpperCase().includes('JSONB')) {
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION darcy_safe_jsonb(value TEXT)
      RETURNS JSONB AS $$
      BEGIN
        IF value IS NULL OR BTRIM(value) = '' THEN
          RETURN NULL;
        END IF;
        RETURN value::JSONB;
      EXCEPTION WHEN OTHERS THEN
        RETURN JSONB_BUILD_OBJECT('legacyValue', value);
      END;
      $$ LANGUAGE plpgsql;
    `);
    await sequelize.query(`
      ALTER TABLE "${table}"
      ALTER COLUMN "${column}" TYPE JSONB
      USING darcy_safe_jsonb("${column}"::TEXT);
    `);
    await sequelize.query('DROP FUNCTION IF EXISTS darcy_safe_jsonb(TEXT);');
  }
}

async function migrate() {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    logger.info('Connected to PostgreSQL database');

    // Users
    await qi.createTable('users', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      username: { type: DataTypes.STRING(50), unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.STRING(20), defaultValue: 'client' },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
      two_factor_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      two_factor_secret: { type: DataTypes.STRING(10) },
      password_reset_token: { type: DataTypes.STRING(255) },
      password_reset_expires: { type: DataTypes.DATE },
      last_login: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('users table exists'));

    // Refresh tokens
    await qi.createTable('refresh_tokens', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      token: { type: DataTypes.TEXT, allowNull: false },
      user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      is_revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
      ip_address: { type: DataTypes.STRING(45) },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('refresh_tokens table exists'));

    // Clients
    await qi.createTable('clients', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      business_name: { type: DataTypes.STRING(255), allowNull: false },
      contractor_type: { type: DataTypes.STRING(50), allowNull: false },
      contact_name: { type: DataTypes.STRING(255) },
      email: { type: DataTypes.STRING(100), allowNull: false },
      phone: { type: DataTypes.STRING(20) },
      address: { type: DataTypes.TEXT },
      city: { type: DataTypes.STRING(100) },
      state: { type: DataTypes.STRING(50) },
      zip: { type: DataTypes.STRING(10) },
      indeed_username: { type: DataTypes.TEXT },
      indeed_password: { type: DataTypes.TEXT },
      first_advantage_username: { type: DataTypes.TEXT },
      first_advantage_password: { type: DataTypes.TEXT },
      agreement_signed: { type: DataTypes.BOOLEAN, defaultValue: false },
      agreement_signed_at: { type: DataTypes.DATE },
      status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
      stripe_customer_id: { type: DataTypes.STRING(255) },
      admin_notes: { type: DataTypes.TEXT },
      invite_token: { type: DataTypes.STRING(255) },
      invite_expires_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('clients table exists'));

    // Pending onboardings
    await qi.createTable('pending_onboardings', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      email: { type: DataTypes.STRING(255), allowNull: false },
      business_name: { type: DataTypes.STRING(255), allowNull: false },
      contractor_type: { type: DataTypes.STRING(50), allowNull: false },
      contact_name: { type: DataTypes.STRING(100) },
      phone: { type: DataTypes.STRING(20) },
      address: { type: DataTypes.TEXT },
      indeed_username: { type: DataTypes.TEXT },
      first_advantage_username: { type: DataTypes.TEXT },
      agreement_signed: { type: DataTypes.BOOLEAN, defaultValue: false },
      agreement_signed_at: { type: DataTypes.DATE },
      status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      stripe_session_id: { type: DataTypes.STRING(255) },
      invite_token: { type: DataTypes.STRING(255) },
      invite_expires_at: { type: DataTypes.DATE },
      form_data: { type: DataTypes.JSONB },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('pending_onboardings table exists'));

    await ensureJsonbColumn('pending_onboardings', 'form_data');

    // Subscriptions
    await qi.createTable('subscriptions', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      plan: { type: DataTypes.STRING(100), allowNull: false },
      status: { type: DataTypes.STRING(20), defaultValue: 'incomplete' },
      stripe_subscription_id: { type: DataTypes.STRING(255) },
      stripe_price_id: { type: DataTypes.STRING(255) },
      current_period_start: { type: DataTypes.DATE },
      current_period_end: { type: DataTypes.DATE },
      trial_end: { type: DataTypes.DATE },
      extra_indeed_listings: { type: DataTypes.INTEGER, defaultValue: 0 },
      extra_terminals: { type: DataTypes.INTEGER, defaultValue: 0 },
      i9_service: { type: DataTypes.BOOLEAN, defaultValue: false },
      monthly_amount: { type: DataTypes.DECIMAL(10, 2) },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('subscriptions table exists'));

    // Applicants
    await qi.createTable('applicants', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      first_name: { type: DataTypes.STRING(100), allowNull: false },
      last_name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(255) },
      phone: { type: DataTypes.STRING(20) },
      avp_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      background_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      drug_screen_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      med_card_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      pipeline_status: { type: DataTypes.STRING(20), defaultValue: 'in_progress' },
      hire_status: { type: DataTypes.STRING(20) },
      interview_date: { type: DataTypes.DATE },
      interview_slot_id: { type: DataTypes.STRING(255) },
      admin_notes: { type: DataTypes.TEXT },
      client_notes: { type: DataTypes.TEXT },
      disqualified_at: { type: DataTypes.DATE },
      non_qualified_at: { type: DataTypes.DATE },
      source: { type: DataTypes.STRING(100) },
      ai_score: { type: DataTypes.INTEGER },
      ai_recommendation: { type: DataTypes.STRING(30) },
      ai_assessment: { type: DataTypes.JSONB },
      ai_analyzed_at: { type: DataTypes.DATE },
      ai_model: { type: DataTypes.STRING(100) },
      resume_file_name: { type: DataTypes.STRING(255) },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('applicants table exists'));

    // Upgrade existing applicant tables with AI screening columns.
    const applicantColumns = await qi.describeTable('applicants');
    const aiColumns: Record<string, any> = {
      ai_score: { type: DataTypes.INTEGER },
      ai_recommendation: { type: DataTypes.STRING(30) },
      ai_assessment: { type: DataTypes.JSONB },
      ai_analyzed_at: { type: DataTypes.DATE },
      ai_model: { type: DataTypes.STRING(100) },
      resume_file_name: { type: DataTypes.STRING(255) },
    };

    for (const [column, definition] of Object.entries(aiColumns)) {
      if (!applicantColumns[column]) {
        await qi.addColumn('applicants', column, definition);
      }
    }

    await qi.addIndex('applicants', ['ai_score'], {
      name: 'applicants_ai_score_idx',
    }).catch(() => logger.info('applicants AI score index exists'));

    await qi.addIndex('applicants', ['client_id', 'ai_score'], {
      name: 'applicants_client_ai_score_idx',
    }).catch(() => logger.info('applicants client/AI score index exists'));

    // Availability slots
    await qi.createTable('availability_slots', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE, allowNull: false },
      is_booked: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_recurring: { type: DataTypes.BOOLEAN, defaultValue: false },
      recurring_type: { type: DataTypes.STRING(10), defaultValue: 'none' },
      booked_applicant_id: { type: DataTypes.UUID, references: { model: 'applicants', key: 'id' }, onDelete: 'SET NULL' },
      notes: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('availability_slots table exists'));

    // Conversations
    await qi.createTable('conversations', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      subject: { type: DataTypes.STRING(255), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      unread_by_client: { type: DataTypes.INTEGER, defaultValue: 0 },
      unread_by_admin: { type: DataTypes.INTEGER, defaultValue: 0 },
      last_message_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('conversations table exists'));

    // Messages
    await qi.createTable('messages', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      conversation_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'conversations', key: 'id' }, onDelete: 'CASCADE' },
      sender_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      content: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      sender_role: { type: DataTypes.STRING(10), allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('messages table exists'));

    // Documents
    await qi.createTable('documents', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      uploaded_by: { type: DataTypes.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      file_name: { type: DataTypes.STRING(255), allowNull: false },
      original_name: { type: DataTypes.STRING(255), allowNull: false },
      mime_type: { type: DataTypes.STRING(100), allowNull: false },
      file_size: { type: DataTypes.INTEGER, allowNull: false },
      s3_key: { type: DataTypes.TEXT, allowNull: false },
      s3_url: { type: DataTypes.TEXT },
      status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
      document_type: { type: DataTypes.STRING(100) },
      admin_notes: { type: DataTypes.TEXT },
      reviewed_at: { type: DataTypes.DATE },
      reviewed_by: { type: DataTypes.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('documents table exists'));

    // Notifications
    await qi.createTable('notifications', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      client_id: { type: DataTypes.UUID, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: DataTypes.STRING(255), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING(50), allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      link_url: { type: DataTypes.TEXT },
      metadata: { type: DataTypes.JSONB },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('notifications table exists'));

    await ensureJsonbColumn('notifications', 'metadata');

    // Time tracking
    await qi.createTable('time_trackings', {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'clients', key: 'id' }, onDelete: 'CASCADE' },
      admin_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE },
      duration_minutes: { type: DataTypes.INTEGER },
      notes: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }).catch(() => logger.info('time_trackings table exists'));

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
