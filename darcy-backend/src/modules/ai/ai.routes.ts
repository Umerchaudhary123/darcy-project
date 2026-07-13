import { Request, Response, NextFunction, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { AiController } from './ai.controller';

const router = Router();
const ctrl = new AiController();

const allowedExtensions = new Set(['.pdf', '.docx', '.txt']);
const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, allowedExtensions.has(extension));
  },
}).single('cv');

const handleCvUpload = (req: Request, res: Response, next: NextFunction) => {
  cvUpload(req, res, (error) => {
    if (error) return next(new AppError(error.message, 400));
    if (!req.file) return next(new AppError('Use a text-based PDF, DOCX, or TXT CV up to 10 MB.', 400));
    next();
  });
};

const assistantSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  clientId: z.string().uuid().optional(),
});

router.use(authenticate, requireAdmin);
router.post('/applicants/:id/screen', handleCvUpload, ctrl.screenApplicantCv);
router.post('/assistant', validate(assistantSchema), ctrl.assistant);

export default router;
