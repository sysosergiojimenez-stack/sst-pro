import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';

function ensureApp() {
  if (getApps().length > 0) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  } else {
    initializeApp();
  }
}

export function getDb(): Firestore {
  ensureApp();
  return getFirestore();
}
