import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Darcy Staffing <noreply@darcystaffing.com>',
      ...options,
    });
    logger.info(`✅ Email sent to ${options.to}: ${options.subject} (${info.messageId})`);
  } catch (err) {
    logger.error(`❌ Email send failed to ${options.to}:`, err);
    // Don't crash the request — log error but continue
    // This way, account creation / actions still succeed even if email fails
  }
};

export const emailTemplates = {
  invite: (inviteUrl: string, businessName: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a1a2e; padding: 30px; border-radius: 8px; text-align: center;">
        <h1 style="color: #e94560; margin: 0;">Darcy Staffing</h1>
        <p style="color: #aaa; margin: 5px 0;">FedEx Contractor Staffing</p>
      </div>
      <div style="padding: 30px 0;">
        <h2>You've been invited!</h2>
        <p>Hello <strong>${businessName}</strong>,</p>
        <p>Your account has been set up with Darcy Staffing. Click the button below to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: #e94560; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Complete Registration
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link expires in 48 hours.</p>
      </div>
    </body>
    </html>
  `,

  welcome: (name: string, loginUrl: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a1a2e; padding: 30px; border-radius: 8px; text-align: center;">
        <h1 style="color: #e94560; margin: 0;">Darcy Staffing</h1>
      </div>
      <div style="padding: 30px 0;">
        <h2>Welcome, ${name}!</h2>
        <p>Your Darcy Staffing account is now active. We're excited to help you find qualified FedEx drivers.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: #e94560; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Access Your Portal
          </a>
        </div>
      </div>
    </body>
    </html>
  `,

  documentStatus: (status: 'approved' | 'rejected', docName: string, notes?: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Document ${status === 'approved' ? '✅ Approved' : '❌ Rejected'}</h2>
      <p>Your document <strong>${docName}</strong> has been ${status}.</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      <p>Log in to your portal to view details.</p>
    </body>
    </html>
  `,
};
