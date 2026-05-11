import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export default function Splash() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-3xl bg-neon-green/20 border border-neon-green/30 flex items-center justify-center neo-glow">
          <div className="w-12 h-12 rounded-full border-4 border-neon-green border-t-transparent animate-spin" />
        </div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <h1 className="text-4xl font-bold font-display tracking-tighter gradient-text">AURA AI</h1>
          <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase">Elite Fitness</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
