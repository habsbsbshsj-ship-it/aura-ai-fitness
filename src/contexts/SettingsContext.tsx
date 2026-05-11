import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSettings, UserProfile } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import i18n from '../lib/i18n';

const LANGUAGE_MAP: Record<string, string> = {
  'English': 'en',
  'Hindi': 'hi',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it'
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: UserSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  loading: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    waterReminder: true,
    mealReminder: true,
    workoutReminder: true,
    aiCoachTips: true,
    reminderTime: '08:00'
  },
  privacy: {
    marketingEmails: false,
    analytics: true
  },
  app: {
    units: 'metric',
    theme: 'dark',
    language: 'English',
    aiStyle: 'technical'
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children, profile }: { children: React.ReactNode, profile: UserProfile | null }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const langCode = LANGUAGE_MAP[settings.app.language] || 'en';
    if (i18n.language !== langCode) {
      i18n.changeLanguage(langCode);
    }
  }, [settings.app.language]);

  useEffect(() => {
    if (profile) {
      loadSettings();
    }
  }, [profile?.uid]);

  const loadSettings = async () => {
    if (!profile) return;
    setLoading(true);

    if (auth.currentUser && !profile.isAnonymous) {
      const path = `settings/${profile.uid}`;
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', profile.uid));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as UserSettings);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    } else {
      const local = localStorage.getItem(`aura_settings_${profile.uid}`);
      if (local) {
        setSettings(JSON.parse(local));
      }
    }
    setLoading(false);
  };

  const updateSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (!profile) return;

    if (auth.currentUser && !profile.isAnonymous) {
      const path = `settings/${profile.uid}`;
      try {
        await updateDoc(doc(db, 'settings', profile.uid), newSettings as any);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    } else {
      localStorage.setItem(`aura_settings_${profile.uid}`, JSON.stringify(newSettings));
    }
  };

  const resetSettings = async () => {
    await updateSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
