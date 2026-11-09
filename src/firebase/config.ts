import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: The app will break without passing the specific firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export default app;
