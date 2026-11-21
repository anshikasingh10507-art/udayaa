import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface SavedEquipmentRecord {
  id: string;
  userId: string;
  equipmentId: number;
  title: string;
  categoryName: string;
  locationCity: string;
  dailyRate: number;
  imageUrl: string;
  isVerified: boolean;
  savedAt?: unknown;
}

export interface SiteNoteRecord {
  id: string;
  userId: string;
  equipmentId: number;
  equipmentTitle: string;
  note: string;
  locationLabel: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatSessionRecord {
  id: string;
  userId: string;
  title: string;
  mode: 'general' | 'fast' | 'search' | 'maps';
  languageCode: string;
  messageCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessageRecord {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  mode: 'general' | 'fast' | 'search' | 'maps';
  sourcesCount: number;
  createdAt?: unknown;
}

function clampString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function sanitizeOptionalUrl(url: string | null | undefined): string {
  const clean = (url || '').trim().slice(0, 500);
  if (!clean) return '';
  if (clean.startsWith('https://') || clean.startsWith('/')) return clean;
  return '';
}

export async function ensureUserProfileDoc(params: {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  preferredLanguage?: string;
  city?: string;
}) {
  const path = `users/${params.uid}`;
  const ref = doc(db, 'users', params.uid);
  try {
    const snap = await getDoc(ref);
    const safeName = clampString(params.displayName || 'Udaya Member', 100) || 'Udaya Member';
    const safeEmail = clampString(params.email || '', 160);
    const safePhoto = sanitizeOptionalUrl(params.photoURL);
    const safeLang = clampString(params.preferredLanguage || 'en', 10) || 'en';
    const safeCity = clampString(params.city || 'Pune', 80);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: params.uid,
        displayName: safeName,
        email: safeEmail,
        photoURL: safePhoto,
        role: 'renter',
        preferredLanguage: safeLang,
        city: safeCity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: safeName,
        email: safeEmail,
        photoURL: safePhoto,
        preferredLanguage: safeLang,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveEquipmentToFirestore(
  uid: string,
  item: {
    equipmentId: number;
    title: string;
    categoryName: string;
    locationCity: string;
    dailyRate: number;
    imageUrl: string;
    isVerified: boolean;
  }
) {
  const docId = String(Math.max(1, Math.floor(item.equipmentId)));
  const path = `users/${uid}/savedEquipment/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'savedEquipment', docId), {
      userId: uid,
      equipmentId: Math.max(1, Math.floor(item.equipmentId)),
      title: clampString(item.title || 'Equipment Listing', 160),
      categoryName: clampString(item.categoryName || 'Equipment', 80),
      locationCity: clampString(item.locationCity || 'Pune', 80),
      dailyRate: Math.max(0, Math.min(10000000, Number(item.dailyRate) || 0)),
      imageUrl: sanitizeOptionalUrl(item.imageUrl),
      isVerified: Boolean(item.isVerified),
      savedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeEquipmentFromFirestore(uid: string, equipmentId: number) {
  const docId = String(Math.max(1, Math.floor(equipmentId)));
  const path = `users/${uid}/savedEquipment/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savedEquipment', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createSiteNoteInFirestore(
  uid: string,
  input: { equipmentId: number; equipmentTitle: string; note: string; locationLabel: string }
) {
  const colRef = collection(db, 'users', uid, 'siteNotes');
  const noteRef = doc(colRef);
  const path = `users/${uid}/siteNotes/${noteRef.id}`;
  try {
    await setDoc(noteRef, {
      userId: uid,
      equipmentId: Math.max(0, Math.floor(input.equipmentId || 0)),
      equipmentTitle: clampString(input.equipmentTitle || 'General Site Note', 160),
      note: clampString(input.note, 1500),
      locationLabel: clampString(input.locationLabel || '', 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return noteRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteSiteNoteInFirestore(uid: string, noteId: string) {
  const path = `users/${uid}/siteNotes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'siteNotes', noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createChatSessionInFirestore(
  uid: string,
  input: { title: string; mode: 'general' | 'fast' | 'search' | 'maps'; languageCode: string }
): Promise<string> {
  const sessionRef = doc(collection(db, 'users', uid, 'chatSessions'));
  const path = `users/${uid}/chatSessions/${sessionRef.id}`;
  try {
    await setDoc(sessionRef, {
      userId: uid,
      title: clampString(input.title || 'Equipment Consultation', 140),
      mode: input.mode,
      languageCode: clampString(input.languageCode || 'en', 10),
      messageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return sessionRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function appendChatMessageInFirestore(
  uid: string,
  sessionId: string,
  input: {
    role: 'user' | 'assistant';
    text: string;
    mode: 'general' | 'fast' | 'search' | 'maps';
    sourcesCount: number;
    nextMessageCount: number;
  }
) {
  const msgRef = doc(collection(db, 'users', uid, 'chatSessions', sessionId, 'messages'));
  const msgPath = `users/${uid}/chatSessions/${sessionId}/messages/${msgRef.id}`;
  const sessionPath = `users/${uid}/chatSessions/${sessionId}`;
  try {
    await setDoc(msgRef, {
      userId: uid,
      sessionId,
      role: input.role,
      text: clampString(input.text, 12000),
      mode: input.mode,
      sourcesCount: Math.max(0, Math.min(50, Math.floor(input.sourcesCount || 0))),
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', uid, 'chatSessions', sessionId), {
      mode: input.mode,
      messageCount: Math.max(0, Math.min(500, Math.floor(input.nextMessageCount))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgPath || sessionPath);
  }
}
