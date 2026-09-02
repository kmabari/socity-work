import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Support external deployment (Vercel, Netlify, custom domain, etc.) with robust fallback merging
const cleanStr = (val?: string | null): string => {
  if (!val) return '';
  return String(val).trim().replace(/^["']+|["']+$/g, '').trim();
};

const getFirebaseConfig = () => {
  const metaObj = import.meta as any;
  const env = metaObj.env || {};

  const apiKey = cleanStr(env.VITE_FIREBASE_API_KEY) || cleanStr((firebaseConfig as any).apiKey);
  const projectId = cleanStr(env.VITE_FIREBASE_PROJECT_ID) || cleanStr((firebaseConfig as any).projectId) || 'hcrs-membership';
  
  // Intelligent authDomain resolution:
  // 1. env.VITE_FIREBASE_AUTH_DOMAIN
  // 2. firebaseConfig.authDomain
  // 3. Derived from projectId: `${projectId}.firebaseapp.com`
  let authDomain = cleanStr(env.VITE_FIREBASE_AUTH_DOMAIN) || cleanStr((firebaseConfig as any).authDomain);
  // Strip http:// or https:// and any trailing slashes if accidentally provided in Vercel env settings
  authDomain = authDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
  if (!authDomain && projectId) {
    authDomain = `${projectId}.firebaseapp.com`;
  }

  let storageBucket = cleanStr(env.VITE_FIREBASE_STORAGE_BUCKET) || cleanStr((firebaseConfig as any).storageBucket);
  storageBucket = storageBucket.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
  if (!storageBucket && projectId) {
    storageBucket = `${projectId}.firebasestorage.app`;
  }

  const messagingSenderId = cleanStr(env.VITE_FIREBASE_MESSAGING_SENDER_ID) || cleanStr((firebaseConfig as any).messagingSenderId);
  const appId = cleanStr(env.VITE_FIREBASE_APP_ID) || cleanStr((firebaseConfig as any).appId);
  const databaseURL = cleanStr(env.VITE_FIREBASE_DATABASE_URL) || cleanStr((firebaseConfig as any).databaseURL);
  const measurementId = cleanStr(env.VITE_FIREBASE_MEASUREMENT_ID) || cleanStr((firebaseConfig as any).measurementId);
  const firestoreDatabaseId = cleanStr(env.VITE_FIREBASE_DATABASE_ID) || cleanStr((firebaseConfig as any).firestoreDatabaseId) || '(default)';

  const final = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    databaseURL: databaseURL || undefined,
    measurementId: measurementId || undefined,
    firestoreDatabaseId: firestoreDatabaseId || '(default)'
  };

  if (typeof window !== 'undefined') {
    const isCustomEnv = !!(env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_AUTH_DOMAIN);
    console.log(`[Firebase Auth Init] Loaded ${isCustomEnv ? 'Environment Variables' : 'Default JSON'} Config:`, {
      projectId: final.projectId,
      authDomain: final.authDomain,
      hasApiKey: !!final.apiKey,
      hasAppId: !!final.appId,
      currentHostname: window.location.hostname,
      currentOrigin: window.location.origin,
      inIframe: window.self !== window.top
    });
  }

  return final;
};

const finalConfig = getFirebaseConfig();

export const app = initializeApp(finalConfig);
export const secondaryApp = initializeApp(finalConfig, 'Secondary');

// Gracefully determine which local cache configuration is safe to use.
// In iframe/sandbox/cloud-run environments, WebChannel stream connections and IndexedDB 
// tab synchronizations can be blocked or cause connection errors.
const getSafeFirestoreSettings = () => {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return { 
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true
      };
    }

    const isDevHost = window.location.hostname.includes('ais-dev') || 
                      window.location.hostname.includes('ais-pre') || 
                      window.location.hostname.includes('run.app') || 
                      window.location.hostname.includes('localhost') || 
                      window.location.hostname.includes('127.0.0.1') || 
                      window.location.hostname.includes('google.com');
                      
    const inIframe = window.self !== window.top;
    
    if (inIframe || isDevHost) {
      return { 
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true
      };
    }

    // Proactively verify we can access IndexedDB
    // Often merely accessing window.indexedDB throws a SecurityError in sandboxed iframes.
    const _ = window.indexedDB;

    return {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true
    };
  } catch (e) {
    console.warn("IndexedDB access is restricted or threw an error. Falling back to memory cache.", e);
    return { 
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true
    };
  }
};

const databaseId = finalConfig.firestoreDatabaseId && finalConfig.firestoreDatabaseId !== '(default)' 
  ? finalConfig.firestoreDatabaseId 
  : undefined;

export const db = initializeFirestore(app, getSafeFirestoreSettings(), databaseId);
export const secondaryDb = db;
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('exhausted');

  if (isQuota && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Only throw if it is a mutation/write operation, to prevent uncaught exceptions on listeners/reads while still reporting errors.
  if (operationType === OperationType.CREATE || operationType === OperationType.UPDATE || operationType === OperationType.DELETE || operationType === OperationType.WRITE) {
    throw new Error(JSON.stringify(errInfo));
  }
}

async function testConnection() {
  try {
    // Attempt to read a dummy document to wake up connection
    await getDoc(doc(db, 'system', 'ping'));
    console.log("Firestore connection initialized.");
  } catch (error) {
    if (error instanceof Error) {
       console.log("Firestore initialization status:", error.message);
       if (error.message.includes('unavailable') || error.message.includes('offline')) {
         console.warn("Firestore is running in offline mode. Local queries will serve cached state.");
       }
    }
  }
}

testConnection();
