import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Sparkles, Activity, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  consumed: number;
  goal: number;
  onClick?: () => void;
}

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = Math.floor(start + (end - start) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export default function PremiumCalorieCard({ consumed, goal, onClick }: Props) {
  const percentage = Math.min(100, Math.max(0, (consumed / goal) * 100));
  const remaining = Math.max(0, goal - consumed);
  
  // AI Status Logic
  const getStatus = () => {
    if (percentage === 0) return "Ready to fuel up?";
    if (percentage < 30) return "Great start, keep it up!";
    if (percentage < 70) return "Perfect balance achieved.";
    if (percentage < 90) return "Approaching daily target.";
    if (percentage <= 100) return "Target reached. Optimal performance.";
    return "Surplus detected. Power mode active.";
  };

  return (
    <Card 
      onClick={onClick}
      className={`relative overflow-hidden bg-[#050505] border-white/5 rounded-[2rem] p-8 glass group transition-all duration-300 ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      {/* Background Atmospheric Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-neon-green/10 blur-[100px] rounded-full group-hover:bg-neon-green/20 transition-all duration-700" />
      <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-electric-blue/5 blur-[80px] rounded-full" />
      
      {/* Floating Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-neon-green/30 rounded-full"
          animate={{
            y: [-20, -120],
            x: [0, Math.sin(i) * 30],
            opacity: [0, 0.5, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "linear"
          }}
          style={{
            left: `${20 + i * 15}%`,
            bottom: '10%'
          }}
        />
      ))}

      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Zap size={14} className="text-neon-green fill-neon-green animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Metabolic Bio-Metric</span>
            </div>
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">Daily Calories</h2>
          </div>
          
          <motion.div 
            className="relative"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />
            <div className="relative w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center neo-glow">
              <Flame size={28} className="text-neon-green fill-neon-green/20 group-hover:fill-neon-green transition-all" />
            </div>
          </motion.div>
        </div>

        {/* Main Stats with circular indicator */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
             <div className="flex items-baseline space-x-2">
                <h3 className="text-6xl font-black font-display tracking-tighter gradient-text">
                  <AnimatedCounter value={consumed} />
                </h3>
             </div>
             <div className="flex items-center space-x-2 text-gray-500 font-bold text-xs uppercase tracking-tight">
               <Activity size={12} className="text-neon-green" />
               <span className="group-hover:text-neon-green transition-colors">Goal: {goal} kcal</span>
             </div>
          </div>

          {/* Premium Circular Ring */}
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-white/5"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="text-neon-green drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white">{Math.round(percentage)}%</span>
            </div>
          </div>
        </div>

        {/* Liquid Progress Bar */}
        <div className="space-y-4">
          <div className="h-4 bg-white/5 rounded-2xl p-[3px] border border-white/5 relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full rounded-xl bg-gradient-to-r from-neon-green to-electric-blue relative shadow-[0_0_20px_rgba(57,255,20,0.3)]"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 h-1 rounded-full bg-neon-green"
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-neon-green uppercase tracking-tighter animate-pulse">
                {getStatus()}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-white uppercase flex items-center justify-end">
                {remaining} <span className="text-[8px] text-gray-500 ml-1">Kcal Left</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Corner Reflection */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
    </Card>
  );
}
