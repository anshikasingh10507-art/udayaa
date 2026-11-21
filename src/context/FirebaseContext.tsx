import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  ensureUserProfileDoc,
  saveEquipmentToFirestore,
  removeEquipmentFromFirestore,
  createSiteNoteInFirestore,
  deleteSiteNoteInFirestore,
  handleFirestoreError,
  OperationType,
  type SavedEquipmentRecord,
  type SiteNoteRecord,
} from '../lib/firebase';
import { useLanguage } from './LanguageContext';

interface FirebaseContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  signingIn: boolean;
  firebaseError: string;
  savedEquipment: SavedEquipmentRecord[];
  siteNotes: SiteNoteRecord[];
  signInWithGoogle: () => Promise<User | null>;
  signOutFirebase: () => Promise<void>;
  isBookmarked: (equipmentId: number) => boolean;
  toggleBookmark: (item: {
    equipmentId: number;
    title: string;
    categoryName: string;
    locationCity: string;
    dailyRate: number;
    imageUrl: string;
    isVerified: boolean;
  }) => Promise<boolean>;
  addSiteNote: (input: {
    equipmentId: number;
    equipmentTitle: string;
    note: string;
    locationLabel: string;
  }) => Promise<void>;
  deleteSiteNote: (noteId: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');
  const [savedEquipment, setSavedEquipment] = useState<SavedEquipmentRecord[]>([]);
  const [siteNotes, setSiteNotes] = useState<SiteNoteRecord[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user && user.email) {
        try {
          await ensureUserProfileDoc({
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            preferredLanguage: lang,
          });
        } catch (err) {
          console.error('Failed to sync Firestore profile:', err);
        }
      } else {
        setSavedEquipment([]);
        setSiteNotes([]);
      }
    });
    return () => unsub();
  }, [lang]);

  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setSavedEquipment([]);
      setSiteNotes([]);
      return;
    }

    const uid = firebaseUser.uid;
    const savedPath = `users/${uid}/savedEquipment`;
    const notesPath = `users/${uid}/siteNotes`;

    const savedQ = query(collection(db, 'users', uid, 'savedEquipment'), where('userId', '==', uid));
    const notesQ = query(collection(db, 'users', uid, 'siteNotes'), where('userId', '==', uid));

    const unsubSaved = onSnapshot(
      savedQ,
      (snap) => {
        const list: SavedEquipmentRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SavedEquipmentRecord, 'id'>),
        }));
        setSavedEquipment(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, savedPath);
        } catch (e) {
          setFirebaseError(e instanceof Error ? e.message : 'Unable to sync saved equipment.');
        }
      }
    );

    const unsubNotes = onSnapshot(
      notesQ,
      (snap) => {
        const list: SiteNoteRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SiteNoteRecord, 'id'>),
        }));
        setSiteNotes(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, notesPath);
        } catch (e) {
          setFirebaseError(e instanceof Error ? e.message : 'Unable to sync site notes.');
        }
      }
    );

    return () => {
      unsubSaved();
      unsubNotes();
    };
  }, [authReady, firebaseUser]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setFirebaseError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user?.email) {
        await ensureUserProfileDoc({
          uid: result.user.uid,
          displayName: result.user.displayName || result.user.email.split('@')[0],
          email: result.user.email,
          photoURL: result.user.photoURL,
          preferredLanguage: lang,
        });
      }
      return result.user;
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Google sign-in popup was closed before completing.'
          : err instanceof Error
            ? err.message
            : 'Google Sign-In failed.';
      setFirebaseError(message);
      return null;
    } finally {
      setSigningIn(false);
    }
  }, [lang]);

  const signOutFirebase = useCallback(async () => {
    setFirebaseError('');
    await signOut(auth);
  }, []);

  const isBookmarked = useCallback(
    (equipmentId: number) => savedEquipment.some((s) => s.equipmentId === equipmentId),
    [savedEquipment]
  );

  const toggleBookmark = useCallback(
    async (item: {
      equipmentId: number;
      title: string;
      categoryName: string;
      locationCity: string;
      dailyRate: number;
      imageUrl: string;
      isVerified: boolean;
    }) => {
      if (!firebaseUser) {
        const signed = await signInWithGoogle();
        if (!signed) return false;
        await saveEquipmentToFirestore(signed.uid, item);
        return true;
      }
      const exists = savedEquipment.some((s) => s.equipmentId === item.equipmentId);
      if (exists) {
        await removeEquipmentFromFirestore(firebaseUser.uid, item.equipmentId);
        return false;
      }
      await saveEquipmentToFirestore(firebaseUser.uid, item);
      return true;
    },
    [firebaseUser, savedEquipment, signInWithGoogle]
  );

  const addSiteNote = useCallback(
    async (input: { equipmentId: number; equipmentTitle: string; note: string; locationLabel: string }) => {
      if (!firebaseUser) {
        throw new Error('Sign in with Google to save cloud site notes.');
      }
      await createSiteNoteInFirestore(firebaseUser.uid, input);
    },
    [firebaseUser]
  );

  const deleteSiteNote = useCallback(
    async (noteId: string) => {
      if (!firebaseUser) return;
      await deleteSiteNoteInFirestore(firebaseUser.uid, noteId);
    },
    [firebaseUser]
  );

  return (
    <FirebaseContext.Provider
      value={{
        firebaseUser,
        authReady,
        signingIn,
        firebaseError,
        savedEquipment,
        siteNotes,
        signInWithGoogle,
        signOutFirebase,
        isBookmarked,
        toggleBookmark,
        addSiteNote,
        deleteSiteNote,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
