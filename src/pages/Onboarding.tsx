import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserProfile, UserSettings } from '../types';
import { ChevronRight, Sparkles, Zap } from 'lucide-react';

export default function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Partial<UserProfile>>({
    goal: 'maintenance',
    activityLevel: 'moderate',
    dietType: 'anything',
    weight: 70,
    height: 170,
    age: 25
  });

  const [unit, setUnit] = useState<{ weight: 'kg' | 'lbs', height: 'cm' | 'ft' }>({ weight: 'kg', height: 'cm' });

  const calculateTargets = () => {
    const weight = form.weight || 70;
    const height = form.height || 170;
    const age = form.age || 25;
    
    // Mifflin-St Jeor
    let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    let multiplier = 1.2;
    if (form.activityLevel === 'light') multiplier = 1.375;
    if (form.activityLevel === 'moderate') multiplier = 1.55;
    if (form.activityLevel === 'active') multiplier = 1.725;
    if (form.activityLevel === 'very_active') multiplier = 1.9;
    
    let tdee = Math.round(bmr * multiplier);
    let targetCals = tdee;
    if (form.goal === 'fat_loss') targetCals -= 500;
    if (form.goal === 'muscle_gain') targetCals += 300;

    return {
      targetCalories: targetCals,
      targetProtein: Math.round(weight * 2),
      targetWater: 3000
    };
  };

  const next = () => setStep(s => s + 1);

  const save = async () => {
    if (loading || success) return;
    
    console.log("Onboarding: Starting save process...");
    setLoading(true);
    setError(null);

    const targets = calculateTargets();
    const finalProfile: UserProfile = {
      uid: auth.currentUser?.uid || 'guest_' + Math.random().toString(36).substr(2, 9),
      email: auth.currentUser?.email || 'guest@aura.ai',
      displayName: auth.currentUser?.displayName || 'Guest Hero',
      photoURL: auth.currentUser?.photoURL || '',
      isAnonymous: !auth.currentUser || auth.currentUser.isAnonymous,
      ...form,
      ...targets
    } as UserProfile;

    const initialSettings: UserSettings = {
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
        units: unit.weight === 'lbs' ? 'imperial' : 'metric',
        theme: 'dark',
        language: 'English',
        aiStyle: 'technical'
      }
    };

    // Timeout protection
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Connection timeout. Saving locally...");
        localStorage.setItem('aura_guest_profile', JSON.stringify(finalProfile));
        localStorage.setItem(`aura_settings_${finalProfile.uid}`, JSON.stringify(initialSettings));
        setTimeout(() => onComplete(finalProfile), 1000);
      }
    }, 10000);
    
    try {
      console.log("Onboarding: Processing profile...", finalProfile);
      
      if (auth.currentUser) {
        // Try saving to Firebase but don't let it block completion forever
        try {
          await setDoc(doc(db, 'users', finalProfile.uid), finalProfile);
          await setDoc(doc(db, 'settings', finalProfile.uid), initialSettings);
          console.log("Onboarding: Saved to Firebase.");
        } catch (fbErr) {
          console.warn("Onboarding: Firebase save error, using local fallback:", fbErr);
          localStorage.setItem('aura_guest_profile', JSON.stringify(finalProfile));
          localStorage.setItem(`aura_settings_${finalProfile.uid}`, JSON.stringify(initialSettings));
        }
      } else {
        localStorage.setItem('aura_guest_profile', JSON.stringify(finalProfile));
        localStorage.setItem(`aura_settings_${finalProfile.uid}`, JSON.stringify(initialSettings));
        console.log("Onboarding: Saved to local storage.");
      }
      
      clearTimeout(timeout);
      setSuccess(true);
      setLoading(false);
      
      // Artificial delay to show success state
      setTimeout(() => {
        console.log("Onboarding: Calling onComplete...");
        onComplete(finalProfile);
      }, 1000);

    } catch (err: any) {
      clearTimeout(timeout);
      console.error("Onboarding: Radical failure, emergency local save:", err);
      localStorage.setItem('aura_guest_profile', JSON.stringify(finalProfile));
      localStorage.setItem(`aura_settings_${finalProfile.uid}`, JSON.stringify(initialSettings));
      setSuccess(true);
      setLoading(false);
      setTimeout(() => onComplete(finalProfile), 1000);
    }
  };

  const calculatedCals = calculateTargets().targetCalories;

  return (
    <div className="h-screen w-full bg-black flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] bg-neon-green/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[50%] bg-electric-blue/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <div className="flex-1 overflow-y-auto pt-14 px-8 pb-32 z-10 custom-scrollbar">
        <div className="flex space-x-2 mb-10 text-white">
          {[1,2,3,4].map(s => (
            <div key={s} className="h-1 flex-1 relative bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: s <= step ? '100%' : '0%' }}
                className={`absolute inset-0 ${s <= step ? 'bg-neon-green shadow-[0_0_15px_#39FF14]' : ''}`}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} key="s1">
              <h2 className="text-4xl font-black font-display tracking-tighter italic leading-none mb-2 lowercase">
                SELECT<br/><span className="text-neon-green uppercase not-italic">MISSION</span>
              </h2>
              <p className="text-gray-500 text-[9px] uppercase font-black tracking-[0.4em] mb-8 flex items-center">
                <span className="w-2 h-[1px] bg-neon-green mr-2" />
                Baseline Calibrator v1.0
              </p>
              
              <div className="space-y-3">
                {[
                  { id: 'fat_loss', label: 'SHRED', desc: 'Accelerated Lipolysis focus' },
                  { id: 'maintenance', label: 'BALANCE', desc: 'Homeostasis preservation' },
                  { id: 'muscle_gain', label: 'HYPERTROPHY', desc: 'Lean tissue synthesis' }
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setForm({ ...form, goal: g.id as any })}
                    className={`w-full p-5 rounded-3xl border text-left flex justify-between items-center group transition-all duration-500 ${form.goal === g.id ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_20px_rgba(57,255,20,0.05)]' : 'bg-white/5 border-white/5'}`}
                  >
                    <div>
                      <span className={`block font-black text-lg tracking-tight transition-colors ${form.goal === g.id ? 'text-neon-green' : 'text-white'}`}>{g.label}</span>
                      <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">{g.desc}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${form.goal === g.id ? 'bg-neon-green border-neon-green text-black' : 'border-white/10 text-white/40'}`}>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              className="space-y-4"
              key="s2"
            >
              <div className="text-center mb-6 relative">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-32 bg-neon-green/5 blur-2xl rounded-full"
                />
                <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1">
                  METRICS <span className="text-neon-green">CALIBRATION</span>
                </h2>
                <p className="text-gray-500 text-[8px] uppercase font-black tracking-[0.3em] flex items-center justify-center space-x-2">
                  <span className="w-1 h-1 rounded-full bg-neon-green animate-pulse" />
                  <span>AI Body Analysis Protocol</span>
                </p>
              </div>

              {/* Weight Card */}
              <div className="glass-card p-4 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-1 h-3 bg-neon-green rounded-full" />
                    <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Weight</h3>
                  </div>
                  <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button 
                      onClick={() => setUnit(prev => ({ ...prev, weight: 'kg' }))}
                      className={`px-3 py-1 rounded-md text-[8px] font-black transition-all ${unit.weight === 'kg' ? 'bg-neon-green text-black' : 'text-gray-500'}`}
                    >KG</button>
                    <button 
                      onClick={() => setUnit(prev => ({ ...prev, weight: 'lbs' }))}
                      className={`px-3 py-1 rounded-md text-[8px] font-black transition-all ${unit.weight === 'lbs' ? 'bg-neon-green text-black' : 'text-gray-500'}`}
                    >LBS</button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center py-2">
                  <div className="flex items-baseline space-x-1 mb-4">
                    <motion.span 
                      key={form.weight}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-black text-white tracking-tighter"
                    >
                      {unit.weight === 'kg' ? form.weight : Math.round(form.weight! * 2.20462)}
                    </motion.span>
                    <span className="text-neon-green text-[10px] font-black uppercase tracking-widest">{unit.weight}</span>
                  </div>
                  
                  <div className="w-full h-10 relative flex items-center px-4">
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-neon-green/30 z-0" />
                    <input 
                      type="range"
                      min={unit.weight === 'kg' ? 30 : 66}
                      max={unit.weight === 'kg' ? 250 : 550}
                      step="1"
                      value={unit.weight === 'kg' ? form.weight : Math.round(form.weight! * 2.20462)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setForm({ ...form, weight: unit.weight === 'kg' ? val : Math.round(val / 2.20462) });
                      }}
                      className="w-full text-neon-green"
                    />
                  </div>
                </div>
              </div>

              {/* Height Card */}
              <div className="glass-card p-4 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-1 h-3 bg-electric-blue rounded-full" />
                    <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Height</h3>
                  </div>
                  <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button 
                      onClick={() => setUnit(prev => ({ ...prev, height: 'cm' }))}
                      className={`px-3 py-1 rounded-md text-[8px] font-black transition-all ${unit.height === 'cm' ? 'bg-electric-blue text-black' : 'text-gray-500'}`}
                    >CM</button>
                    <button 
                      onClick={() => setUnit(prev => ({ ...prev, height: 'ft' }))}
                      className={`px-3 py-1 rounded-md text-[8px] font-black transition-all ${unit.height === 'ft' ? 'bg-electric-blue text-black' : 'text-gray-500'}`}
                    >FT/IN</button>
                  </div>
                </div>

                <div className="flex items-center space-x-6 py-2">
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="flex items-baseline space-x-1">
                      {unit.height === 'cm' ? (
                        <span className="text-4xl font-black text-white tracking-tighter">{form.height}</span>
                      ) : (
                        <div className="flex items-baseline space-x-0.5">
                          <span className="text-4xl font-black text-white tracking-tighter">{Math.floor(form.height! / 30.48)}</span>
                          <span className="text-[8px] font-black text-electric-blue mr-1">FT</span>
                          <span className="text-4xl font-black text-white tracking-tighter">{Math.round((form.height! % 30.48) / 2.54)}</span>
                          <span className="text-[8px] font-black text-electric-blue ml-0.5">IN</span>
                        </div>
                      )}
                      {unit.height === 'cm' && (
                        <span className="text-electric-blue text-[10px] font-black uppercase tracking-widest ml-1">
                          CM
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-12 h-32 flex flex-col justify-center items-center bg-white/5 rounded-2xl relative overflow-hidden border border-white/5">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-electric-blue/20 pointer-events-none" />
                    <input 
                      type="range"
                      min={120}
                      max={250}
                      step="1"
                      value={form.height}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setForm({ ...form, height: val });
                      }}
                      className="w-32 rotate-270 text-electric-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Age Card */}
              <div className="glass-card p-4 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="w-1 h-3 bg-orange-500 rounded-full" />
                  <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Age</h3>
                </div>

                <div className="flex items-center justify-between px-6">
                  <button 
                    onClick={() => setForm({ ...form, age: Math.max(13, (form.age || 25) - 1) })}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white active:scale-95 transition-all hover:bg-white/10 text-xl font-bold"
                  >-</button>
                  <div className="text-center group">
                    <motion.div 
                      key={form.age}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-4xl font-black text-white tracking-tighter"
                    >
                      {form.age}
                    </motion.div>
                    <span className="text-gray-500 text-[7px] font-black uppercase tracking-[0.4em]">Years</span>
                  </div>
                  <button 
                    onClick={() => setForm({ ...form, age: Math.min(100, (form.age || 25) + 1) })}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white active:scale-95 transition-all hover:bg-white/10 text-xl font-bold"
                  >+</button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} key="s3">
              <h2 className="text-4xl font-black font-display tracking-tighter leading-none italic mb-2 lowercase">
                ACTIVITY<br/><span className="text-neon-green uppercase not-italic">LIFESTYLE</span>
              </h2>
              <p className="text-gray-500 text-[9px] uppercase font-black tracking-[0.4em] mb-8 flex items-center">
                <span className="w-2 h-[1px] bg-neon-green mr-2" />
                Kinetic Energy Assessment
              </p>
              
              <div className="space-y-3">
                {[
                  { id: 'sedentary', label: 'Low Activity', desc: 'Mostly sitting or little movement' },
                  { id: 'light', label: 'Moderate Activity', desc: 'Light exercise or walking' },
                  { id: 'moderate', label: 'Active', desc: 'Regular workouts or physical work' },
                  { id: 'active', label: 'Very Active', desc: 'Intense workouts most days' },
                  { id: 'very_active', label: 'Professional Athlete', desc: 'High performance training lifestyle' }
                ].map(a => (
                  <button
                    key={a.id}
                    onClick={() => setForm({ ...form, activityLevel: a.id as any })}
                    className={`w-full p-5 rounded-3xl border text-left transition-all duration-300 ${form.activityLevel === a.id ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_20px_rgba(57,255,20,0.05)]' : 'bg-white/5 border-white/5'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`block font-black text-lg tracking-tight transition-colors ${form.activityLevel === a.id ? 'text-neon-green' : 'text-white'}`}>{a.label}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider leading-relaxed">{a.desc}</span>
                      </div>
                      {form.activityLevel === a.id && <div className="w-6 h-6 rounded-full bg-neon-green flex items-center justify-center text-black shadow-glow"><ChevronRight size={14} /></div>}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key="s4" className="text-center flex flex-col items-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-neon-green/20 blur-[40px] rounded-full animate-pulse" />
                <div className={`w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-700 ${success ? 'bg-neon-green rotate-[360deg]' : 'bg-white/5 border border-white/10'} shadow-[0_0_30px_rgba(57,255,20,0.15)]`}>
                  {success ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <svg viewBox="0 0 24 24" className="w-12 h-12 text-black fill-none stroke-current" strokeWidth="4">
                        <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  ) : (
                    <Sparkles className="text-neon-green" size={40} />
                  )}
                </div>
              </div>

              <h2 className="text-4xl font-black font-display tracking-tighter leading-[0.9] mb-3 uppercase">
                {success ? "MISSION\nSTART" : (loading ? "CALIBRATING\nBIOMETRICS" : "AURA AI\nREADY")}
              </h2>
              
              <div className="mt-8 mb-8 relative w-full">
                <div className="glass-card p-6 rounded-[2rem] border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={60} className="text-neon-green" />
                  </div>
                  
                  <div className="text-left">
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.3em] mb-1 font-display">Target Calibration</p>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-4xl font-black text-white italic tracking-tighter mb-4"
                    >
                      {calculatedCals} <span className="text-neon-green text-xs uppercase not-italic tracking-widest pl-2">Kcal / Day</span>
                    </motion.div>
                    
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2 }}
                        className="h-full bg-gradient-to-r from-neon-green to-electric-blue"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-[9px] font-black uppercase tracking-widest">
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-10 px-12 z-20 bg-gradient-to-t from-black via-black/90 to-transparent">
        {step < 4 ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={next}
            className="w-full h-16 rounded-3xl bg-white text-black font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center shadow-[0_15px_40px_rgba(255,255,255,0.05)] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-green via-transparent to-electric-blue opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="relative z-10">{step === 3 ? "FINALIZE PROTOCOL" : "NEXT PHASE"}</span>
            <ChevronRight size={14} className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={save}
            disabled={loading || success}
            className={`w-full h-16 rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center transition-all duration-500 relative overflow-hidden ${success ? 'bg-neon-green text-black' : 'bg-white text-black'}`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              success ? "ENTERING SYSTEM..." : "INITIALIZE AURA"
            )}
          </motion.button>
        )}
        
        {step > 1 && step < 4 && (
          <button 
            onClick={() => setStep(s => s - 1)}
            className="w-full text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mt-4 hover:text-white transition-colors"
          >
            Previous Phase
          </button>
        )}
      </div>
    </div>
  );
}
