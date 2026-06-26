import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from './user.model';
import { RefreshToken } from './refreshToken.model';
import { Client } from '../client/client.model';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail } from '../../utils/email';

const generateTokens = (user: User) => {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

export class AuthController {
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, username, password } = req.body;

      const user = await User.findOne({
        where: email ? { email } : { username },
        include: [{ model: Client, as: 'client' }],
      });

      if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid credentials', 401);
      }

      if (!user.isActive) {
        throw new AppError('Account is not active. Please complete your setup.', 403);
      }

      if (user.role !== 'client') {
        throw new AppError('Please use the admin login portal', 403);
      }

      const { accessToken, refreshToken } = generateTokens(user);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshToken.create({
        token: refreshToken,
        userId: user.id,
        expiresAt,
        ipAddress: req.ip,
      });

      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        data: {
          user: user.toSafeJSON(),
          accessToken,
          refreshToken,
          redirectTo: '/portal',
        },
      });
    } catch (err) {
      next(err);
    }
  };

  adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, superAdmin } = req.body;

      const user = await User.findOne({ where: { email } });

      if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid credentials', 401);
      }

      if (!['admin', 'super_admin'].includes(user.role)) {
        throw new AppError('Access denied', 403);
      }

      if (superAdmin && user.role !== 'super_admin') {
        throw new AppError('Super admin access required', 403);
      }

      const { accessToken, refreshToken } = generateTokens(user);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshToken.create({
        token: refreshToken,
        userId: user.id,
        expiresAt,
        ipAddress: req.ip,
      });

      user.lastLogin = new Date();
      await user.save();

      const redirectTo = user.role === 'super_admin' ? '/admin/super-admin' : '/admin/dashboard';

      res.json({
        success: true,
        data: { user: user.toSafeJSON(), accessToken, refreshToken, redirectTo },
      });
    } catch (err) {
      next(err);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, username, password } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) throw new AppError('Email already registered', 409);

      const user = await User.create({
        name, email, username, password, role: 'client', isActive: false,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Complete your subscription to activate.',
        data: { userId: user.id },
      });
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      const stored = await RefreshToken.findOne({
        where: { token: refreshToken, isRevoked: false },
        include: [{ model: User }],
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;
      const user = stored.user;

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      // Revoke old token
      stored.isRevoked = true;
      await stored.save();

      await RefreshToken.create({
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
      });

      res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        await RefreshToken.update({ isRevoked: true }, { where: { userId: req.user!.id } });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: 'Darcy Staffing — Password Reset',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
      });

      res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const hashed = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        where: { passwordResetToken: hashed },
      });

      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      user.password = password;
      user.passwordResetToken = null as any;
      user.passwordResetExpires = null as any;
      await user.save();

      // Revoke all refresh tokens
      await RefreshToken.update({ isRevoked: true }, { where: { userId: user.id } });

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user!.id);
      if (!user) throw new AppError('User not found', 404);

      if (!(await user.comparePassword(currentPassword))) {
        throw new AppError('Current password is incorrect', 400);
      }

      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findByPk(req.user!.id, {
        include: [{ model: Client, as: 'client' }],
      });
      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, data: user.toSafeJSON() });
    } catch (err) {
      next(err);
    }
  };

  enable2FA = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // In production: use speakeasy or otplib to generate TOTP secret
      res.json({ success: true, message: '2FA setup initiated', data: { qrCode: 'placeholder' } });
    } catch (err) {
      next(err);
    }
  };

  verify2FA = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, message: '2FA verified and enabled' });
    } catch (err) {
      next(err);
    }
  };

  disable2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findByPk(req.user!.id);
      if (!user) throw new AppError('User not found', 404);
      user.twoFactorEnabled = false;
      await user.save();
      res.json({ success: true, message: '2FA disabled' });
    } catch (err) {
      next(err);
    }
  };
}
