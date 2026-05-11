import React from 'react';
import { motion } from 'motion/react';
import { Plus, Zap, Sparkles } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export default function StartActionButton({ onClick }: Props) {
  return (
    <div className="relative flex flex-col items-center justify-center py-12">
      {/* Background Aura */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-64 h-64 bg-neon-green/20 rounded-full blur-[80px]"
        />
      </div>

      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-neon-green/40 rounded-full"
          animate={{
            y: [-20, -100],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
          style={{
            left: `${40 + Math.random() * 20}%`,
            top: '50%'
          }}
        />
      ))}

      {/* Main Button Container */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="relative group"
      >
        {/* Animated Outer Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 border border-neon-green/10 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-8 border border-neon-green/5 rounded-full border-dashed"
        />

        {/* Pulsing Glow Base */}
        <motion.div
          animate={{
            boxShadow: [
              "0 0 15px rgba(57, 255, 20, 0.2)",
              "0 0 35px rgba(57, 255, 20, 0.4)",
              "0 0 15px rgba(57, 255, 20, 0.2)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative w-24 h-24 bg-neon-green rounded-full flex flex-col items-center justify-center overflow-hidden shadow-2xl shadow-neon-green/50"
        >
          <span className="text-black font-black text-xl tracking-[0.1em] mb-0.5 z-10">START</span>
          <div className="flex items-center space-x-1 z-10">
            <Zap size={10} className="text-black fill-black" />
            <span className="text-black/60 font-black text-[7px] uppercase tracking-widest">Aura Syncing</span>
          </div>
        </motion.div>
      </motion.button>

      {/* Label */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-center"
      >
        <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-1">Fuel Your Body</p>
        <div className="flex items-center justify-center space-x-2">
          <Sparkles size={12} className="text-gray-500" />
          <p className="text-xs text-gray-500 font-bold">Tap to Log Metabolism Activity</p>
        </div>
      </motion.div>
    </div>
  );
}
