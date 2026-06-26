import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { z } from 'zod';

const router = Router();
const ctrl = new AuthController();

const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
  superAdmin: z.boolean().optional(),
}).refine(d => d.email || d.username, { message: 'Email or username required' });

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  }),
  role: z.enum(['client']).default('client'),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(8) });
const refreshSchema = z.object({ refreshToken: z.string() });
const changePassSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.post('/login', validate(loginSchema), ctrl.login);
router.post('/admin-login', validate(loginSchema), ctrl.adminLogin);
router.post('/register', validate(registerSchema), ctrl.register);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.post('/forgot-password', validate(forgotSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetSchema), ctrl.resetPassword);
router.post('/change-password', authenticate, validate(changePassSchema), ctrl.changePassword);
router.get('/me', authenticate, ctrl.me);
router.post('/enable-2fa', authenticate, ctrl.enable2FA);
router.post('/verify-2fa', authenticate, ctrl.verify2FA);
router.post('/disable-2fa', authenticate, ctrl.disable2FA);

export default router;
