import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { Droplets, Plus, RotateCcw, Trash2, Zap } from 'lucide-react';

interface WaterTrackerProps {
  userId: string;
  current: number;
  goal: number;
}

export default function WaterTracker({ userId, current, goal }: WaterTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const percentage = Math.min(100, (current / goal) * 100);
  const isGoalReached = percentage >= 100;

  const addWater = async (amount: number) => {
    setIsAdding(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    if (!auth.currentUser) {
      // Guest Mode Save
      const guestWater = JSON.parse(localStorage.getItem('aura_guest_water') || '[]');
      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        date: today,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      };
      guestWater.push(newEntry);
      localStorage.setItem('aura_guest_water', JSON.stringify(guestWater));
      window.dispatchEvent(new Event('storage'));
    } else {
      // Firebase Mode Save
      try {
        await addDoc(collection(db, 'users', userId, 'water'), {
          amount,
          timestamp: serverTimestamp(),
          date: today
        });
      } catch (e) {
        console.error("Error adding water:", e);
      }
    }

    if (isGoalReached && !showSuccess) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    
    setTimeout(() => setIsAdding(false), 500);
  };

  const undoLast = async () => {
    if (!auth.currentUser) {
      const guestWater = JSON.parse(localStorage.getItem('aura_guest_water') || '[]');
      if (guestWater.length > 0) {
        guestWater.pop();
        localStorage.setItem('aura_guest_water', JSON.stringify(guestWater));
        window.dispatchEvent(new Event('storage'));
      }
    } else {
      try {
        const waterRef = collection(db, 'users', userId, 'water');
        const q = query(waterRef, orderBy('timestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await deleteDoc(snapshot.docs[0].ref);
        }
      } catch (e) {
        console.error("Error undoing water:", e);
      }
    }
  };

  const resetToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (!auth.currentUser) {
      const guestWater = JSON.parse(localStorage.getItem('aura_guest_water') || '[]');
      const filtered = guestWater.filter((w: any) => w.date !== today);
      localStorage.setItem('aura_guest_water', JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage'));
    } else {
      try {
        const waterRef = collection(db, 'users', userId, 'water');
        const q = query(waterRef, where('date', '==', today));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } catch (e) {
        console.error("Error resetting water:", e);
      }
    }
  };

  return (
    <div className="glass rounded-[2.5rem] p-6 mt-4 relative overflow-hidden border border-white/5 shadow-2xl group">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col gap-6">
        {/* Top Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-electric-blue/20 flex items-center justify-center text-electric-blue">
              <Droplets size={18} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Hydration Hub</h3>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={undoLast}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all active:scale-95"
              title="Undo"
            >
              <RotateCcw size={14} />
            </button>
            <button 
              onClick={resetToday}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-red-500 transition-all active:scale-95"
              title="Reset"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Side: Circular Progress */}
          <div className="flex justify-center relative">
            <div className="relative w-40 h-40">
              {/* Glowing Aura */}
              <div className="absolute inset-0 rounded-full bg-electric-blue/10 blur-2xl animate-pulse" />
              
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                
                {/* Progress Ring */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="6"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * percentage) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                />

                {/* Inner Circle for Water Animation */}
                <defs>
                  <clipPath id="innerWaterClip">
                    <circle cx="50" cy="50" r="41" />
                  </clipPath>
                </defs>
                
                <g clipPath="url(#innerWaterClip)" className="rotate-90 origin-center">
                  <motion.rect
                    x="-10"
                    y={100 - percentage}
                    width="120"
                    height="120"
                    fill="url(#waterGradient)"
                    animate={{
                      y: [100 - percentage, 100 - percentage - 2, 100 - percentage],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="opacity-40"
                  />
                  <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="100%" stopColor="#008291" />
                  </linearGradient>
                </g>
              </svg>

              {/* Center Percent Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  key={current}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-black text-white tracking-tighter"
                >
                  {Math.round(percentage)}%
                </motion.span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Goal</span>
              </div>

              {/* Goal Reached Badge */}
              <AnimatePresence>
                {isGoalReached && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute -top-2 -right-2 bg-neon-green text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl shadow-neon-green/40 z-20"
                  >
                    Goal Met
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Side: Stats & Buttons */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1">Today's Intake</p>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-5xl font-black text-white tracking-tighter">{current}</h3>
                <span className="text-xs font-black text-electric-blue/60 uppercase tracking-widest">/ {goal} ML</span>
              </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => addWater(200)}
                disabled={isAdding}
                className="relative overflow-hidden h-14 rounded-2xl bg-white/5 border border-white/10 hover:border-electric-blue/50 group/btn active:scale-95 transition-all flex flex-col items-center justify-center"
              >
                <div className="absolute inset-0 bg-electric-blue/0 group-hover/btn:bg-electric-blue/10 transition-colors" />
                <Plus size={16} className="text-electric-blue mb-1" />
                <span className="text-[10px] font-black text-white uppercase tracking-tighter">200 ML</span>
              </button>

              <button
                onClick={() => addWater(500)}
                disabled={isAdding}
                className="relative overflow-hidden h-14 rounded-2xl bg-white/5 border border-white/10 hover:border-electric-blue/50 group/btn active:scale-95 transition-all flex flex-col items-center justify-center"
              >
                <div className="absolute inset-0 bg-electric-blue/0 group-hover/btn:bg-electric-blue/10 transition-colors" />
                <Plus size={16} className="text-electric-blue mb-1" />
                <span className="text-[10px] font-black text-white uppercase tracking-tighter">500 ML</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em] pt-2 border-t border-white/5">
              <Zap size={10} className="text-electric-blue" />
              <span>Auto-sync with Aura AI Core</span>
            </div>
          </div>
        </div>
      </div>

      {/* Large Subtle Icon Background */}
      <div className="absolute -right-8 -bottom-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
        <Droplets size={200} />
      </div>
    </div>
  );
}
