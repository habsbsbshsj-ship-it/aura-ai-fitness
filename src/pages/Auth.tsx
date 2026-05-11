import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { LogIn, UserCircle, Mail, Key, ChevronLeft, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type AuthView = 'initial' | 'email';
type EmailMode = 'login' | 'signup' | 'reset';

export default function Auth({ onGuestLogin }: { onGuestLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<AuthView>('initial');
  const [mode, setMode] = useState<EmailMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in with Google');
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Just log it, user knows they closed it
        console.log("User closed the auth popup");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Multiple popups or cancelled
        console.log("Auth popup request cancelled");
      } else {
        toast.error(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (mode !== 'reset' && !password)) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully!');
      } else {
        await sendPasswordResetEmail(auth, email);
        toast.success('Password reset email sent!');
        setMode('login');
      }
    } catch (error: any) {
      console.error("Email auth error:", error);
      let message = 'Authentication failed';
      if (error.code === 'auth/user-not-found') message = 'User not found';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password';
      else if (error.code === 'auth/invalid-credential') message = 'Invalid email or password';
      else if (error.code === 'auth/email-already-in-use') message = 'Email already in use';
      else if (error.code === 'auth/weak-password') message = 'Password is too weak';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      else if (error.code === 'auth/operation-not-allowed') message = 'Email login is disabled in Firebase Console';
      else if (error.code === 'auth/configuration-not-found') message = 'Firebase configuration error';
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      // Try Firebase anonymous auth but don't block on it
      signInAnonymously(auth).catch(err => {
        console.log("Firebase anonymous auth not enabled:", err);
      });
      // Immediately trigger local guest mode for instant access
      onGuestLogin();
      toast.success('Continuing as guest');
    } catch (error) {
      console.error("Guest login error:", error);
      onGuestLogin(); // Fallback to local guest even if firebase fails
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-between bg-black p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-neon-green/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-electric-blue/10 blur-[120px] rounded-full" />

      <div className="w-full mt-20 relative z-10">
        <motion.div
          key={view}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {view === 'initial' ? (
            <>
              <h1 className="text-5xl font-bold font-display tracking-tighter leading-tight">
                UNLOCK YOUR<br/>
                <span className="gradient-text uppercase">Potential</span>
              </h1>
              <p className="text-gray-400 mt-4 text-lg max-w-xs">
                The next generation of AI-powered fitness and nutrition at your fingertips.
              </p>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setView('initial')}
                className="mb-6 -ml-3 text-gray-400 hover:text-white"
              >
                <ChevronLeft size={24} />
              </Button>
              <h1 className="text-4xl font-bold font-display tracking-tighter leading-tight">
                {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
              </h1>
              <p className="text-gray-400 mt-2 text-sm">
                {mode === 'login' ? 'Enter your credentials to continue' : mode === 'signup' ? 'Join the Aura community today' : 'Enter your email to receive a reset link'}
              </p>
            </>
          )}
        </motion.div>
      </div>

      <div className="w-full space-y-4 mb-10 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'initial' ? (
            <motion.div
              key="initial-buttons"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="space-y-4"
            >
              <Button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-white text-black hover:bg-white/90 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-white/5 border-none"
              >
                <LogIn className="mr-3 w-5 h-5" />
                {loading ? "INITIALIZING..." : "CONTINUE WITH GOOGLE"}
              </Button>

              <Button 
                onClick={() => setView('email')}
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-white/5 border border-white/20 text-white hover:bg-white/10 font-black text-xs uppercase tracking-[0.2em] transition-all backdrop-blur-xl"
              >
                <Mail className="mr-3 w-5 h-5" />
                Email & Password
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                  <span className="bg-black px-4 text-gray-500">OR</span>
                </div>
              </div>

              <Button 
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-transparent border border-white/10 text-gray-400 hover:text-white hover:border-neon-green/30 font-black text-xs uppercase tracking-[0.2em] transition-all group"
              >
                <UserCircle className="mr-3 w-5 h-5 group-hover:text-neon-green transition-colors" />
                Continue as Guest
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="email-form"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              onSubmit={handleEmailAuth}
              className="space-y-4"
            >
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    placeholder="EMAIL ADDRESS"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-neon-green/50 focus:outline-none transition-all font-bold tracking-tight"
                    required
                  />
                </div>

                {mode !== 'reset' && (
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      placeholder="PASSWORD"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-neon-green/50 focus:outline-none transition-all font-bold tracking-tight"
                      required
                    />
                  </div>
                )}
              </div>

              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-neon-green text-black hover:bg-neon-green/90 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-neon-green/20 border-none group"
              >
                {loading ? "PROCESSING..." : mode === 'login' ? "SIGN IN" : mode === 'signup' ? "CREATE ACCOUNT" : "SEND RESET LINK"}
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="flex flex-col space-y-2 pt-2">
                {mode === 'login' ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                    >
                      DON'T HAVE AN ACCOUNT? <span className="text-neon-green uppercase ml-1">SIGN UP</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-[10px] font-bold text-gray-600 hover:text-white transition-colors uppercase tracking-widest"
                    >
                      Forgot Password?
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                  >
                    ALREADY HAVE AN ACCOUNT? <span className="text-neon-green uppercase ml-1">LOGIN</span>
                  </button>
                )}
              </div>
              
              {mode === 'signup' && (
                <div className="p-4 bg-neon-green/5 border border-neon-green/10 rounded-xl flex items-start space-x-3 mt-4">
                  <Info className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-wider">
                    Note: Email login must be enabled in your Firebase project settings (Authentication {'>'} Sign-in method).
                  </p>
                </div>
              )}
            </motion.form>
          )}
        </AnimatePresence>
        
        <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest px-8 pt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
