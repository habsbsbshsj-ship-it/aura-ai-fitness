import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { AnimatePresence, motion } from 'motion/react';

// Pages
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Plan from './pages/Plan';
import Coach from './pages/Coach';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Splash from './pages/Splash';

// Components
import Navbar from './components/Navbar';
import { UserProfile } from './types';
import { SettingsProvider } from './contexts/SettingsContext';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'scanner' | 'plan' | 'coach' | 'profile'>('dashboard');

  useEffect(() => {
    // Safety timeout: Ensure loading finishes even if Firebase hangs
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log("App: Safety timeout reached. Forcing loading false.");
        setLoading(false);
      }
    }, 5000);

    // Check for local guest session
    const guestData = localStorage.getItem('aura_guest_profile');
    if (guestData) {
      console.log("App: Local guest profile found.");
      setProfile(JSON.parse(guestData));
      setIsGuest(true);
      setLoading(false);
    }

    console.log("App: Initializing auth listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("App: Auth state changed. User:", user?.uid);
      setUser(user);
      if (user) {
        setIsGuest(false); // Auth user takes precedence
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log("App: Profile found in Firestore.");
            const data = docSnap.data() as UserProfile;
            setProfile(data);
          } else {
            console.log("App: No Firestore profile found. Setting default.");
            setProfile({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || (user.isAnonymous ? 'Guest' : 'Hero'),
              photoURL: user.photoURL || '',
              isAnonymous: user.isAnonymous
            });
          }
        } catch (error) {
          console.error("App: Error fetching profile:", error);
          // Fallback to minimal profile if Firestore fails
          setProfile({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Hero',
            photoURL: '',
            isAnonymous: user.isAnonymous
          });
        }
      } else {
        const guestData = localStorage.getItem('aura_guest_profile');
        if (guestData) {
          setProfile(JSON.parse(guestData));
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
    });
    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const refreshProfile = async () => {
    if (!profile) return;
    try {
      if (auth.currentUser && !profile.isAnonymous) {
        const docRef = doc(db, 'users', profile.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        const guestData = localStorage.getItem('aura_guest_profile');
        if (guestData) {
          setProfile(JSON.parse(guestData));
        }
      }
      // Force a storage event to refresh other local listeners
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error("App: Manual refresh failed:", error);
      throw error; // Let PullToRefresh handle the toast error
    }
  };

  if (loading) return <Splash />;

  if (!user && !isGuest) return <Auth onGuestLogin={() => setIsGuest(true)} />;

  if (!profile || !profile.age) {
    console.log("App: Showing onboarding (No profile age).");
    return <Onboarding onComplete={(p) => {
      console.log("App: Onboarding complete callback received.", p);
      setProfile(p);
    }} />;
  }

  console.log("App: Rendering main app shell.");

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-black overflow-hidden relative dark">
      <SettingsProvider profile={profile}>
        <Toaster position="top-center" />
        <main id="main-scroll-root" className={`flex-1 relative ${
          (currentPage === 'coach' || currentPage === 'scanner') 
            ? 'overflow-hidden' 
            : 'overflow-y-auto pb-20'
        }`}>
          <AnimatePresence mode="wait">
            {currentPage === 'dashboard' && <Dashboard key="dashboard" profile={profile} onNavigate={setCurrentPage} onRefresh={refreshProfile} />}
            {currentPage === 'scanner' && <Scanner key="scanner" onClose={() => setCurrentPage('dashboard')} />}
            {currentPage === 'plan' && <Plan key="plan" profile={profile} onRefresh={refreshProfile} />}
            {currentPage === 'coach' && <Coach key="coach" profile={profile} onRefresh={refreshProfile} />}
            {currentPage === 'profile' && <Profile key="profile" profile={profile} onUpdate={setProfile} onRefresh={refreshProfile} />}
          </AnimatePresence>
        </main>
        
        <Navbar active={currentPage} onNavigate={setCurrentPage} />
      </SettingsProvider>
      
      {/* Floating Action Button for AI Scanner */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setCurrentPage('scanner')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-neon-green rounded-full shadow-lg shadow-neon-green/30 flex items-center justify-center z-50 pulse-glow"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-black fill-current">
          <path d="M12 9V15M9 12H15M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    </div>
  );
}
