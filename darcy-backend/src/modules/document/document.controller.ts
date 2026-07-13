import { Request, Response, NextFunction } from 'express';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs/promises';
import { Document } from './document.model';
import { Client } from '../client/client.model';
import { s3Client, uploadDir, usingS3 } from '../../middleware/upload';
import { AppError } from '../../middleware/errorHandler';
import { createNotification } from '../notifications/notification.service';
import { sendEmail, emailTemplates } from '../../utils/email';
import logger from '../../utils/logger';

export class DocumentController {
  // Client: get own documents
  getMyDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await Client.findOne({ where: { userId: req.user!.id } });
      if (!client) throw new AppError('Client not found', 404);

      const docs = await Document.findAll({
        where: { clientId: client.id },
        order: [['createdAt', 'DESC']],
      });

      res.json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  };

  // Admin: get documents for a client
  getClientDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const docs = await Document.findAll({
        where: { clientId },
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  };

  // Upload document (client or admin)
  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const file = req.file as any;

      let clientId: string;
      if (req.user!.role === 'client') {
        const client = await Client.findOne({ where: { userId: req.user!.id } });
        if (!client) throw new AppError('Client not found', 404);
        clientId = client.id;
      } else {
        clientId = req.body.clientId;
        if (!clientId) throw new AppError('clientId required for admin uploads', 400);
      }

      const doc = await Document.create({
        clientId,
        uploadedBy: req.user!.id,
        fileName: file.key || file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        s3Key: file.key || file.filename,
        s3Url: file.location || file.path || `/uploads/${file.filename}`,
        documentType: req.body.documentType || 'general',
        status: 'pending',
      });

      if (req.user!.role === 'client') {
        const admins = await (await import('../auth/user.model')).User.findAll({
          where: { role: ['admin', 'super_admin'] },
        });
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            clientId,
            title: 'New Document Uploaded',
            body: `A client uploaded "${file.originalname}" for review.`,
            type: 'document_uploaded',
            linkUrl: `/admin/documents?clientId=${clientId}`,
          });
        }
      }

      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };

  // Get signed download URL
  getDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await Document.findByPk(req.params.id);
      if (!doc) throw new AppError('Document not found', 404);

      // Access check for clients
      if (req.user!.role === 'client') {
        const client = await Client.findOne({ where: { userId: req.user!.id } });
        if (!client || doc.clientId !== client.id) throw new AppError('Forbidden', 403);
      }

      if (usingS3 && s3Client) {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: doc.s3Key,
          ResponseContentDisposition: `attachment; filename="${doc.originalName.replace(/["\r\n]/g, '')}"`,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        res.json({ success: true, data: { url, expiresIn: 300 } });
        return;
      }

      const publicBase = (process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const url = `${publicBase}/uploads/${encodeURIComponent(path.basename(doc.s3Key))}`;
      res.json({ success: true, data: { url, expiresIn: null } });
    } catch (err) {
      next(err);
    }
  };

  // Admin: review document
  review = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, notes } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        throw new AppError('Status must be approved or rejected', 400);
      }

      const doc = await Document.findByPk(req.params.id);
      if (!doc) throw new AppError('Document not found', 404);

      await doc.update({
        status,
        adminNotes: notes,
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      });

      // ✅ Response FORAN bhej do — main kaam (DB update) ho chuka hai
      res.json({ success: true, data: doc });

      // ✅ Notification + Email background mein — inka slow/fail hona
      // ab frontend ko kabhi affect nahi karega
      setImmediate(async () => {
        try {
          const client = await Client.findByPk(doc.clientId);
          if (client?.userId) {
            await createNotification({
              userId: client.userId,
              clientId: client.id,
              title: `Document ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
              body: `Your document "${doc.originalName}" has been ${status}.${notes ? ` Notes: ${notes}` : ''}`,
              type: status === 'approved' ? 'document_approved' : 'document_rejected',
              linkUrl: '/documents',
            });

            await sendEmail({
              to: client.email,
              subject: `Document ${status} — Darcy Staffing`,
              html: emailTemplates.documentStatus(status as 'approved' | 'rejected', doc.originalName, notes),
            });
          }
        } catch (bgErr) {
          logger.error('Review notification/email failed (non-blocking):', bgErr);
        }
      });
    } catch (err) {
      next(err);
    }
  };

  // Delete document
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await Document.findByPk(req.params.id);
      if (!doc) throw new AppError('Document not found', 404);

      try {
        if (usingS3 && s3Client) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: doc.s3Key,
          }));
        } else {
          await fs.unlink(path.join(uploadDir, path.basename(doc.s3Key)));
        }
      } catch (storageError) {
        logger.warn(`Stored file could not be deleted for document ${doc.id}: ${String(storageError)}`);
      }

      await doc.destroy();
      res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
      next(err);
    }
  };
}
