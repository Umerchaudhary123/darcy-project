import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import logger from './logger';

let firebaseApp: App | null = null;

export const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    logger.info('Firebase Admin is not configured; push notifications are disabled.');
    return null;
  }

  try {
    firebaseApp = getApps()[0] || initializeApp({
      credential: cert({ projectId, privateKey, clientEmail }),
    });
    logger.info('Firebase Admin initialized');
  } catch (error) {
    logger.warn('Firebase init failed (non-critical):', error);
  }

  return firebaseApp;
};

export const sendFirebaseNotification = async (
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) => {
  if (!firebaseApp) return;
  try {
    // In production: store FCM tokens per user and send targeted notifications.
    logger.info(`Firebase notification queued for user ${userId}: ${payload.title}`);
  } catch (error) {
    logger.warn('Firebase notification error:', error);
  }
};

export const getFirestore = () => firebaseApp ? getAdminFirestore(firebaseApp) : null;
