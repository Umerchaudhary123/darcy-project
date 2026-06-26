import admin from 'firebase-admin';
import logger from './logger';

let firebaseApp: admin.app.App | null = null;

export const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    logger.info('Firebase Admin initialized');
  } catch (err) {
    logger.warn('Firebase init failed (non-critical):', err);
  }

  return firebaseApp;
};

export const sendFirebaseNotification = async (
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) => {
  if (!firebaseApp) return;
  try {
    // In production: store FCM tokens per user and send targeted notifications
    logger.info(`Firebase notification queued for user ${userId}: ${payload.title}`);
  } catch (err) {
    logger.warn('Firebase notification error:', err);
  }
};

export const getFirestore = () => {
  if (!firebaseApp) return null;
  return admin.firestore();
};
