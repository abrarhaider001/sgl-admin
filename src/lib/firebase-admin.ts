/**
 * Firebase Admin SDK initialization for server-side operations (FCM, Firestore, Auth).
 *
 * Supports multiple credential provisioning strategies:
 * - Base64-encoded full service account JSON in FIREBASE_SERVICE_ACCOUNT_KEY
 * - Raw JSON string via FIREBASE_SERVICE_ACCOUNT_JSON
 * - Service account fields via env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 * - Application Default Credentials (ADC) when GOOGLE_APPLICATION_CREDENTIALS or gcloud context is present
 *
 * This module should only be imported in server-side code.
 */
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function initAdminApp() {
  if (getApps().length) {
    return;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Try base64-encoded service account JSON first
  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (base64Key) {
    try {
      const jsonStr = Buffer.from(base64Key, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(jsonStr);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      return;
    } catch (err) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to other credential methods.');
    }
  }

  // Try raw JSON string directly from env
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      const serviceAccount = JSON.parse(rawJson);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      return;
    } catch (err) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to other credential methods.');
    }
  }

  // Try explicit env fields
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    return;
  }

  // Fall back to application default credentials only when ADC context is present
  const hasADCEnv = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GCLOUD_PROJECT || !!process.env.GOOGLE_CLOUD_PROJECT;
  if (hasADCEnv) {
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      return;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin with Application Default Credentials:', err);
      throw err;
    }
  }

  const message = 'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY (base64 JSON) or FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY (with \\n), or GOOGLE_APPLICATION_CREDENTIALS for ADC.';
  console.error(message);
  throw new Error(message);
}

initAdminApp();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
