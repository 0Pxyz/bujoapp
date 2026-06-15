import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, BuJoEntry, Collection, BulletType, TaskState, LogType, Habit, HabitLog, AppSettings } from '../types';
import { generateId } from '../lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';

interface BuJoContextType extends AppState {
  user: User | null;
  isLoadingAuth: boolean;
  firestoreError: string | null;
  addEntry: (
    text: string, 
    type: BulletType, 
    logType: LogType, 
    date: string, 
    signifiers?: { priority: boolean; idea: boolean; explore: boolean }, 
    collectionId?: string
  ) => void;
  updateEntryState: (id: string, state: TaskState) => void;
  updateEntrySignifier: (id: string, signifiers: { priority: boolean; idea: boolean; explore: boolean }) => void;
  updateEntryText: (id: string, text: string) => void;
  deleteEntry: (id: string) => void;
  migrateEntry: (id: string, newDate: string, newLogType: LogType) => void;
  createCollection: (title: string) => string;
  deleteCollection: (id: string) => void;
  performMonthlyMigration: (entriesToMigrate: string[], newLogDate: string, entriesToCancel: string[]) => void;
  reorderEntries: (reorderedIds: string[]) => void;
  addHabit: (name: string, frequencyType?: 'daily' | 'specific_days' | 'interval', specificDays?: number[], timesPerWeek?: number) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (habitId: string, date: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const BuJoContext = createContext<BuJoContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  fontFamily: 'sans',
  layoutDensity: 'comfortable',
  shortcuts: { globalSearch: 'meta+k', focusNewEntry: 'n' },
  notifications: { dailyReminder: false, habitReminder: false, weeklyDigest: false }
};

export const BuJoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setFirestoreError(msg);
    setTimeout(() => setFirestoreError(null), 6000);
  };

  const [state, setState] = useState<AppState>({
    entries: [], collections: [], habits: [], habitLogs: [], settings: defaultSettings
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoadingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const unsubEntries = onSnapshot(collection(db, 'users', uid, 'entries'), (snap) => {
      setState(s => ({ ...s, entries: snap.docs.map(d => ({ ...d.data(), id: d.id }) as BuJoEntry) }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'entries'));

    const unsubCollections = onSnapshot(collection(db, 'users', uid, 'collections'), (snap) => {
      setState(s => ({ ...s, collections: snap.docs.map(d => ({ ...d.data(), id: d.id }) as Collection) }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'collections'));

    const unsubHabits = onSnapshot(collection(db, 'users', uid, 'habits'), (snap) => {
      setState(s => ({ ...s, habits: snap.docs.map(d => ({ ...d.data(), id: d.id }) as Habit) }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'habits'));

    const unsubHabitLogs = onSnapshot(collection(db, 'users', uid, 'habitLogs'), (snap) => {
      setState(s => ({ ...s, habitLogs: snap.docs.map(d => ({ ...d.data(), id: d.id }) as HabitLog) }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'habitLogs'));

    const unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'default'), (snap) => {
      if (snap.exists()) {
        setState(s => ({ ...s, settings: { ...defaultSettings, ...(snap.data() as AppSettings) } }));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings'));

    return () => {
      unsubEntries();
      unsubCollections();
      unsubHabits();
      unsubHabitLogs();
      unsubSettings();
    };
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const s = state.settings;

    root.classList.remove('light', 'dark');
    if (s.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.add(mq.matches ? 'dark' : 'light');
    } else {
      root.classList.add(s.theme);
    }

    root.classList.remove('text-sm', 'text-base', 'text-lg', 'font-sans', 'font-serif', 'density-comfortable', 'density-compact');
    root.classList.add(s.fontFamily === 'serif' ? 'font-serif' : 'font-sans');
    root.classList.add(s.fontSize === 'small' ? 'text-sm' : s.fontSize === 'large' ? 'text-lg' : 'text-base');
    root.classList.add(s.layoutDensity === 'compact' ? 'density-compact' : 'density-comfortable');
    root.style.setProperty('--accent', s.accentColor || 'neutral');
  }, [state.settings]);

  const addEntry = async (text: string, type: BulletType, logType: LogType, date: string, signifiers = { priority: false, idea: false, explore: false }, collectionId?: string) => {
    if (!user) return;
    const id = generateId();
    const newEntry: BuJoEntry = {
      id, type, state: 'open', signifiers, text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date, logType, collectionId: collectionId || null,
      order: state.entries.filter(e => e.date === date && e.logType === logType).length,
    };
    try {
      await setDoc(doc(db, 'users', user.uid, 'entries', id), newEntry);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'entries'); showError('Failed to save entry.'); }
  };

  const updateEntryState = async (id: string, taskState: TaskState) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'entries', id), { state: taskState, updatedAt: new Date().toISOString() });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'entries'); showError('Failed to update entry.'); }
  };

  const updateEntrySignifier = async (id: string, signifiers: { priority: boolean; idea: boolean; explore: boolean }) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'entries', id), { signifiers, updatedAt: new Date().toISOString() });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'entries'); showError('Failed to update entry.'); }
  };

  const updateEntryText = async (id: string, text: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'entries', id), { text, updatedAt: new Date().toISOString() });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'entries'); showError('Failed to update entry.'); }
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'entries'); showError('Failed to delete entry.'); }
  };

  const migrateEntry = async (id: string, newDate: string, newLogType: LogType) => {
    if (!user) return;
    const entry = state.entries.find(e => e.id === id);
    if (!entry) return;

    try {
      const batch = writeBatch(db);
      
      const newEntryId = generateId();
      const newEntry: BuJoEntry = {
        ...entry,
        id: newEntryId,
        state: 'open',
        date: newDate,
        logType: newLogType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: state.entries.filter(e => e.date === newDate && e.logType === newLogType).length,
      };
      
      batch.update(doc(db, 'users', user.uid, 'entries', id), { 
        state: newLogType === 'future' ? 'scheduled' : 'migrated',
        updatedAt: new Date().toISOString()
      });
      batch.set(doc(db, 'users', user.uid, 'entries', newEntryId), newEntry);
      
      await batch.commit();
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'entries'); showError('Failed to migrate entry.'); }
  };

  const createCollection = async (title: string) => {
    if (!user) return '';
    const id = generateId();
    const newCollection: Collection = { id, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'users', user.uid, 'collections', id), newCollection);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'collections'); showError('Failed to create collection.'); }
    return id;
  };

  const deleteCollection = async (id: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid, 'collections', id));
      const collectionEntries = state.entries.filter(e => e.collectionId === id);
      collectionEntries.forEach(entry => {
        batch.delete(doc(db, 'users', user.uid, 'entries', entry.id));
      });
      await batch.commit();
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'collections'); showError('Failed to delete collection.'); }
  }

  const reorderEntries = async (reorderedIds: string[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      reorderedIds.forEach((id, index) => {
        batch.update(doc(db, 'users', user.uid, 'entries', id), { order: index, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'entries'); showError('Failed to reorder entries.'); }
  };

  const performMonthlyMigration = async (entriesToMigrate: string[], newLogDate: string, entriesToCancel: string[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      entriesToMigrate.forEach((id, index) => {
        const entry = state.entries.find(e => e.id === id);
        if (entry) {
          batch.update(doc(db, 'users', user.uid, 'entries', id), { state: 'migrated', updatedAt: new Date().toISOString() });
          const newEntryId = generateId();
          const newEntry: BuJoEntry = {
            ...entry,
            id: newEntryId,
            state: 'open',
            date: newLogDate,
            logType: 'monthly',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: index
          };
          batch.set(doc(db, 'users', user.uid, 'entries', newEntryId), newEntry);
        }
      });

      entriesToCancel.forEach(id => {
         batch.update(doc(db, 'users', user.uid, 'entries', id), { state: 'canceled', updatedAt: new Date().toISOString() });
      });

      await batch.commit();
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'entries'); showError('Failed to migrate entries.'); }
  };

  const addHabit = async (name: string, frequencyType: 'daily' | 'specific_days' | 'interval' = 'daily', specificDays: number[] = [], timesPerWeek: number = 3) => {
    if (!user) return;
    const id = generateId();
    const newHabit: Habit = { id, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), frequencyType, specificDays, timesPerWeek };
    try {
      await setDoc(doc(db, 'users', user.uid, 'habits', id), newHabit);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'habits'); showError('Failed to create habit.'); }
  };

  const deleteHabit = async (id: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid, 'habits', id));
      const logs = state.habitLogs.filter(l => l.habitId === id);
      logs.forEach(log => batch.delete(doc(db, 'users', user.uid, 'habitLogs', log.id)));
      await batch.commit();
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'habits'); showError('Failed to delete habit.'); }
  };

  const toggleHabit = async (habitId: string, date: string) => {
    if (!user) return;
    const existing = state.habitLogs.find(log => log.habitId === habitId && log.date === date);
    try {
      if (existing) {
        await updateDoc(doc(db, 'users', user.uid, 'habitLogs', existing.id), { completed: !existing.completed, updatedAt: new Date().toISOString() });
      } else {
        const id = generateId();
        const newLog: HabitLog = { id, habitId, date, completed: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await setDoc(doc(db, 'users', user.uid, 'habitLogs', id), newLog);
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'habitLogs'); showError('Failed to update habit.'); }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user) return;
    const sanitized = JSON.parse(JSON.stringify(newSettings));
    const updated = { ...state.settings, ...sanitized };
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'default'), updated, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'settings'); showError('Failed to save settings.'); }
  };

  return (
    <BuJoContext.Provider value={{ ...state, user, isLoadingAuth, firestoreError, addEntry, updateEntryState, updateEntrySignifier, updateEntryText, deleteEntry, migrateEntry, createCollection, deleteCollection, performMonthlyMigration, reorderEntries, addHabit, deleteHabit, toggleHabit, updateSettings }}>
      {children}
    </BuJoContext.Provider>
  );
};

export const useBuJo = () => {
  const context = useContext(BuJoContext);
  if (context === undefined) {
    throw new Error('useBuJo must be used within a BuJoProvider');
  }
  return context;
};
