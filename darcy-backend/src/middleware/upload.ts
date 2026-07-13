import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const usingS3 = Boolean(
  process.env.AWS_ACCESS_KEY_ID
  && process.env.AWS_SECRET_ACCESS_KEY
  && process.env.AWS_REGION
  && process.env.AWS_S3_BUCKET
);

export const s3Client: S3Client | null = usingS3
  ? new S3Client({ region: process.env.AWS_REGION })
  : null;

const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const storage: multer.StorageEngine = usingS3 && s3Client
  ? multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET!,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (_req, file, cb) => cb(null, { originalName: file.originalname }),
      key: (_req, file, cb) => {
        const date = new Date();
        const folder = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        cb(null, `documents/${folder}/${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    })
  : localStorage;

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Upload PDF, DOC, DOCX, JPG, PNG, or WebP.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 5);
