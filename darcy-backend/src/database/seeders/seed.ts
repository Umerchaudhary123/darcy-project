import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

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

async function seed() {
  try {
    await sequelize.authenticate();
    logger.info('Seeder connected to SQLite');

    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
    const superPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123456', 12);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@darcystaffing.com';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@darcystaffing.com';
    const now = new Date().toISOString();

    // Check if admin exists
    const [admins] = await sequelize.query(
      `SELECT id FROM users WHERE email = '${adminEmail}' LIMIT 1`
    );

    if ((admins as any[]).length === 0) {
      await sequelize.query(`
        INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
        VALUES (
          '${uuidv4()}',
          'Admin User',
          '${adminEmail}',
          '${adminPassword}',
          'admin',
          1,
          '${now}',
          '${now}'
        )
      `);
      logger.info(`✅ Admin created: ${adminEmail}`);
    } else {
      logger.info(`Admin already exists: ${adminEmail}`);
    }

    // Check if super admin exists
    const [supers] = await sequelize.query(
      `SELECT id FROM users WHERE email = '${superAdminEmail}' LIMIT 1`
    );

    if ((supers as any[]).length === 0) {
      await sequelize.query(`
        INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
        VALUES (
          '${uuidv4()}',
          'Super Admin',
          '${superAdminEmail}',
          '${superPassword}',
          'super_admin',
          1,
          '${now}',
          '${now}'
        )
      `);
      logger.info(`✅ Super Admin created: ${superAdminEmail}`);
    } else {
      logger.info(`Super Admin already exists: ${superAdminEmail}`);
    }

    logger.info('');
    logger.info('══════════════════════════════════════════');
    logger.info('  SEED COMPLETE — Demo Credentials:');
    logger.info('══════════════════════════════════════════');
    logger.info(`  Admin:       ${adminEmail}`);
    logger.info(`  Password:    ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    logger.info(`  SuperAdmin:  ${superAdminEmail}`);
    logger.info(`  Password:    ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123456'}`);
    logger.info('══════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();