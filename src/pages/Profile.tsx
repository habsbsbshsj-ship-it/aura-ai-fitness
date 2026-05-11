import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserSettings } from '../types';
import { auth, db, storage } from '../lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Settings, LogOut, Award, Shield, Bell, ChevronRight, Share2, 
  Edit2, Camera, X, Check, Loader2, User, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import PullToRefresh from '../components/PullToRefresh';

// Settings sub-components
import NotificationsSettings from '@/components/Profile/NotificationsSettings';
import PrivacySettings from '@/components/Profile/PrivacySettings';
import AppSettings from '@/components/Profile/AppSettings';

interface ProfileProps {
  profile: UserProfile | null;
  onUpdate: (profile: UserProfile) => void;
  onRefresh?: () => Promise<void>;
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

type ActiveView = 'main' | 'notifications' | 'privacy' | 'app';

const weightData = [
  { date: '05/01', weight: 82.5 },
  { date: '05/02', weight: 82.1 },
  { date: '05/03', weight: 81.8 },
  { date: '05/04', weight: 81.9 },
  { date: '05/05', weight: 81.4 },
  { date: '05/06', weight: 81.1 },
];

export default function Profile({ profile, onUpdate, onRefresh }: ProfileProps) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const { settings, updateSettings, resetSettings } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSettings = async (newSettings: UserSettings) => {
    // Check if units changed to perform conversion
    if (newSettings.app.units !== settings.app.units && profile) {
      const isToImperial = newSettings.app.units === 'imperial';
      const updatedProfile = { ...profile };

      if (isToImperial) {
        // Metric -> Imperial
        updatedProfile.weight = profile.weight ? Math.round(profile.weight * 2.20462 * 10) / 10 : profile.weight;
        updatedProfile.height = profile.height ? Math.round(profile.height / 2.54 * 10) / 10 : profile.height;
      } else {
        // Imperial -> Metric
        updatedProfile.weight = profile.weight ? Math.round(profile.weight / 2.20462 * 10) / 10 : profile.weight;
        updatedProfile.height = profile.height ? Math.round(profile.height * 2.54 * 10) / 10 : profile.height;
      }

      onUpdate(updatedProfile);
      
      // Persist profile change
      if (auth.currentUser && !profile.isAnonymous) {
        await updateDoc(doc(db, 'users', profile.uid), {
          weight: updatedProfile.weight,
          height: updatedProfile.height,
          updatedAt: new Date()
        });
      } else {
        localStorage.setItem('aura_guest_profile', JSON.stringify(updatedProfile));
      }
    }

    await updateSettings(newSettings);
  };

  const handleResetSettings = async () => {
    await resetSettings();
    alert('Master Preferences Reset. System synchronized.');
  };

  const handleInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aura AI Fitness',
          text: 'Join me on Aura AI Fitness and track your nutrition smarter. Use my link to get a personalized bio-optimizing plan.',
          url: window.location.href,
        });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText('Join me on Aura AI Fitness: ' + window.location.href);
      alert('Invite link copied to clipboard!');
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('aura_guest_profile');
    await signOut(auth);
    window.location.href = '/'; // Hard redirect to clear all states
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, WEBP).');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveChanges = async () => {
    if (!profile) return;
    if (!editName.trim()) {
      alert('Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      let photoURL = profile.photoURL;

      // Handle file upload
      if (selectedFile) {
        if (auth.currentUser && !profile.isAnonymous) {
          // Firebase Storage Upload
          const storageRef = ref(storage, `profiles/${profile.uid}/${selectedFile.name}`);
          const snapshot = await uploadBytes(storageRef, selectedFile);
          photoURL = await getDownloadURL(snapshot.ref);
        } else {
          // Guest / Anonymous: Keep base64 preview (limited storage but works for demo)
          photoURL = previewUrl || '';
        }
      }

      const updatedProfile: UserProfile = {
        ...profile,
        displayName: editName,
        photoURL: photoURL
      };

      if (auth.currentUser && !profile.isAnonymous) {
        // Update Firebase Auth
        await updateProfile(auth.currentUser, {
          displayName: editName,
          photoURL: photoURL
        });
        // Update Firestore
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          displayName: editName,
          photoURL: photoURL,
          updatedAt: new Date()
        });
      } else {
        // Update Local Storage for Guest
        localStorage.setItem('aura_guest_profile', JSON.stringify(updatedProfile));
      }

      onUpdate(updatedProfile);
      setIsEditing(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, we might re-fetch profile from Firestore here
      if (auth.currentUser && !profile.isAnonymous) {
        const docRef = doc(db, 'users', profile.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as UserProfile);
        }
      }
    }
  };

  if (!profile) return null;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-6 pb-32 space-y-8 relative max-w-md mx-auto min-h-screen">
        <AnimatePresence mode="wait">
        {activeView === 'main' ? (
          <motion.div 
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <header className="flex flex-col items-center pt-8">
              <div className="relative group">
                <div className="w-28 h-28 rounded-[2.5rem] bg-neon-green/20 p-1 border border-neon-green/30 relative overflow-hidden">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} className="w-full h-full object-cover rounded-[2.2rem]" />
                  ) : (
                    <div className="w-full h-full bg-neon-green/10 flex items-center justify-center rounded-[2.2rem]">
                      <User size={48} className="text-neon-green/40" />
                    </div>
                  )}
                  
                  {/* Edit Overlay */}
                  <motion.div 
                    whileHover={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    onClick={() => setIsEditing(true)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 transition-opacity cursor-pointer"
                  >
                    <Camera className="text-white" size={24} />
                  </motion.div>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-black rounded-2xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon-green transition-colors z-10"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              
              <div className="text-center mt-6">
                <h1 className="text-2xl font-bold font-display">{profile.displayName}</h1>
                <p className="text-gray-500 text-sm mt-1">{profile.email || 'guest@aura.ai'}</p>
              </div>
            </header>

            {/* Stats Board */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: 'BMR', v: profile.targetCalories || 0, u: 'kcal' },
                { l: 'Level', v: 'Elite', u: 'Aura' }
              ].map(s => (
                <div key={s.l} className="glass p-4 rounded-3xl text-center border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black">{s.l}</p>
                  <p className="text-xl font-black gradient-text">{s.v} {s.u}</p>
                </div>
              ))}
            </div>

            {/* Progress Chart */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Mass Trajectory</h3>
                <span className="text-[10px] font-black text-neon-green border border-neon-green/30 bg-neon-green/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">-1.4kg / 7d</span>
              </div>
              <Card className="glass p-4 h-48 rounded-[2rem] border-white/5 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#39FF14' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#39FF14" 
                      strokeWidth={3} 
                      dot={{ fill: '#39FF14', r: 4 }}
                      activeDot={{ r: 6, stroke: '#39FF14', strokeLinecap: 'round', strokeWidth: 8, strokeOpacity: 0.2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Menu Options */}
            <div className="space-y-3">
              {[
                { i: Bell, l: t('profile.notifications'), v: 'notifications' },
                { i: Shield, l: t('profile.privacy'), v: 'privacy' },
                { i: Share2, l: 'Invite Friends', v: 'share' },
                { i: Settings, l: t('profile.app_settings'), v: 'app' }
              ].map(opt => (
                <button 
                  key={opt.l} 
                  onClick={() => {
                    if (opt.v === 'share') handleInvite();
                    else setActiveView(opt.v as ActiveView);
                  }}
                  className="w-full h-16 glass rounded-2xl px-5 flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4 group-hover:bg-white/10 transition-colors">
                      <opt.i size={20} className="text-neon-green group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-bold text-sm">{opt.l}</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              ))}
            </div>

            <Button 
              onClick={handleSignOut}
              variant="ghost"
              className="w-full h-16 rounded-2xl text-red-500 hover:text-red-400 hover:bg-red-500/5 font-bold"
            >
              <LogOut className="mr-2" size={18} /> {t('profile.sign_out')} Aura
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {activeView === 'notifications' && (
              <NotificationsSettings 
                settings={settings.notifications} 
                onBack={() => setActiveView('main')}
                onSave={(n) => saveSettings({ ...settings, notifications: n })}
              />
            )}
            {activeView === 'privacy' && (
              <PrivacySettings 
                settings={settings.privacy} 
                profile={profile}
                onBack={() => setActiveView('main')}
                onSave={(p) => saveSettings({ ...settings, privacy: p })}
                onDeleted={() => {
                  handleSignOut();
                }}
              />
            )}
            {activeView === 'app' && (
              <AppSettings 
                settings={settings.app} 
                onBack={() => setActiveView('main')}
                onSave={(a) => saveSettings({ ...settings, app: a })}
                onReset={handleResetSettings}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal (Keep separate for overlay behavior) */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsEditing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 blur-[50px]" />
              
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Edit Identity</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Photo Pick */}
                <div className="flex flex-col items-center">
                  <div className="relative group cursor-pointer" onClick={handleImagePick}>
                    <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden relative">
                      {previewUrl ? (
                        <img src={previewUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={40} className="text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-neon-green rounded-xl flex items-center justify-center text-black shadow-lg">
                      <Camera size={14} />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-4">Change Visual ID</p>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] ml-2">Display Name</label>
                  <Input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={30}
                    placeholder="Enter your name"
                    className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-neon-green/50 px-5 font-bold"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button 
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    disabled={isSaving}
                    className="flex-1 h-14 rounded-2xl border-white/10 text-gray-400 font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveChanges}
                    disabled={isSaving}
                    className="flex-1 h-14 rounded-2xl bg-neon-green text-black hover:bg-neon-green/90 font-black uppercase tracking-widest text-xs"
                  >
                    {isSaving ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={18} className="mr-2" /> Save Protocol
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}
