import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Zap, Activity, Flame, Droplets, Trash2, ShieldCheck, Info, Edit3 } from 'lucide-react';
import { MealLog } from '../../types';
import { FoodVisualizer } from './FoodVisualizer';
import { format } from 'date-fns';

interface MealDetailsModalProps {
  meal: MealLog | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (meal: MealLog) => void;
  onEdit: (meal: MealLog) => void;
}

// Optimization: Memoized sub-components to prevent unnecessary re-renders during interactions
const MacroCard = memo(({ label, value, unit, color, icon, textColor }: any) => (
  <div className="glass p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-2 transform-gpu">
    <div className={`w-8 h-8 rounded-xl ${color}/10 flex items-center justify-center ${textColor}`}>
      {icon}
    </div>
    <div className="text-center">
      <h4 className="text-xl font-black text-white leading-none">{value}</h4>
      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">{label} ({unit})</p>
    </div>
  </div>
));

MacroCard.displayName = 'MacroCard';

const MacroProgressBar = memo(({ label, value, total, color }: any) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div 
          style={{ width: `${percentage}%` }}
          className={`h-full ${color} transition-[width] duration-300 ease-out`}
        />
      </div>
    </div>
  );
});

MacroProgressBar.displayName = 'MacroProgressBar';

export default function MealDetailsModal({ meal, isOpen, onClose, onDelete, onEdit }: MealDetailsModalProps) {
  if (!meal) return null;

  const time = meal.timestamp?.seconds 
    ? format(new Date(meal.timestamp.seconds * 1000), 'HH:mm')
    : meal.timestamp?.toDate 
      ? format(meal.timestamp.toDate(), 'HH:mm')
      : 'Just now';

  const date = meal.timestamp?.seconds 
    ? format(new Date(meal.timestamp.seconds * 1000), 'MMM dd, yyyy')
    : format(new Date(), 'MMM dd, yyyy');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center overflow-hidden">
          {/* Overlay - Removed blur for maximum performance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80"
          />

          {/* Modal Content - Snappier Spring */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.5 }}
            className="relative w-full max-w-md bg-[#050505] border-t border-white/10 rounded-t-[3.5rem] flex flex-col max-h-[92vh] overflow-hidden shadow-2xl transform-gpu"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full z-30" />

            {/* Scrollable Container - Optimized Scroll Physics */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pt-4 overscroll-contain">
              {/* Header / Image Section */}
              <div className="relative h-80 w-full bg-black flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020202]/50 to-[#020202]" />
                <div className="absolute inset-0 flex items-center justify-center p-12">
                  <FoodVisualizer 
                    category={meal.category} 
                    className="w-full h-full drop-shadow-[0_0_30px_rgba(57,255,20,0.1)]"
                  />
                </div>
                
                {/* Top Controls - Removed blurs */}
                <div className="absolute top-6 left-0 right-0 px-8 flex justify-between items-center z-10">
                  <div className="px-4 py-2 bg-black/80 rounded-2xl border border-white/10 flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_#39FF14]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{meal.mealType}</span>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-12 h-12 bg-black/80 rounded-2xl border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Health Score Badge - Instant visibility */}
                {meal.healthScore && (
                  <div className="absolute bottom-6 right-8 w-16 h-16 bg-neon-green rounded-full flex flex-col items-center justify-center border-4 border-black z-10 shadow-[0_4px_15px_rgba(57,255,20,0.2)]">
                    <span className="text-[10px] font-black text-black leading-none uppercase -mb-0.5">Core</span>
                    <span className="text-xl font-black text-black leading-none tracking-tighter">{meal.healthScore}</span>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="px-8 pb-16">
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none break-words transform-gpu">
                    {meal.name}
                  </h2>
                  <div className="flex items-center space-x-6 mt-4 text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                    <div className="flex items-center">
                      <Clock size={12} className="mr-2 text-neon-green" />
                      {time}
                    </div>
                    <div className="flex items-center">
                      <Info size={12} className="mr-2 text-electric-blue" />
                      {date}
                    </div>
                  </div>
                </div>

                {/* Calories Large Display - Simplified backgrounds */}
                <div className="glass rounded-[3rem] p-8 mb-6 relative overflow-hidden group border border-white/5 shadow-xl transform-gpu">
                   <div className="flex justify-between items-center relative z-10">
                     <div>
                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.35em] mb-2">Energy Intake</p>
                       <div className="flex items-baseline space-x-2">
                         <h3 className="text-7xl font-black text-white tracking-tighter">{meal.calories ?? 0}</h3>
                         <span className="text-sm font-black text-neon-green uppercase mb-2">kcal</span>
                       </div>
                     </div>
                     <div className="w-20 h-20 rounded-[2rem] bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green neo-glow transform-gpu">
                       <Flame size={40} />
                     </div>
                   </div>
                </div>

                {/* Macro Architecture Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <MacroCard 
                    label="Protein" 
                    value={meal.protein} 
                    unit="g" 
                    color="bg-neon-green" 
                    icon={<Zap size={14} />} 
                    textColor="text-neon-green"
                  />
                  <MacroCard 
                    label="Carbs" 
                    value={meal.carbs} 
                    unit="g" 
                    color="bg-electric-blue" 
                    icon={<Activity size={14} />} 
                    textColor="text-electric-blue"
                  />
                  <MacroCard 
                    label="Fats" 
                    value={meal.fat} 
                    unit="g" 
                    color="bg-white" 
                    icon={<Droplets size={14} />} 
                    textColor="text-white"
                  />
                </div>

                {/* Macro Progress Infrastructure */}
                <div className="glass p-6 rounded-[2.5rem] mb-10 space-y-5 border border-white/5 will-change-transform transform-gpu">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] mb-3">Macro Distribution Profile</p>
                  <MacroProgressBar label="Protein" value={meal.protein} total={meal.protein + meal.carbs + meal.fat} color="bg-neon-green" />
                  <MacroProgressBar label="Carbs" value={meal.carbs} total={meal.protein + meal.carbs + meal.fat} color="bg-electric-blue" />
                  <MacroProgressBar label="Fats" value={meal.fat} total={meal.protein + meal.carbs + meal.fat} color="bg-white" />
                </div>

                {/* Analysis / Details */}
                <div className="space-y-4">
                  <div className="glass p-6 rounded-2xl border border-white/5 flex items-center justify-between group cursor-default">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Source Logic</p>
                        <p className="text-[11px] font-black text-white uppercase tracking-wider">{meal.category || 'Manual Input'}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-gray-700 font-bold uppercase leading-relaxed text-center px-4 tracking-[0.1em]">
                    Data processed via Aura AI Core. Energy estimation protocol: High Fidelity.
                  </p>
                </div>

                {/* High Priority Actions */}
                <div className="mt-10 flex flex-col gap-4">
                  <button 
                    onClick={() => onEdit(meal)}
                    className="w-full h-18 rounded-[2rem] bg-neon-green text-black flex items-center justify-center space-x-4 font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(57,255,20,0.2)] hover:shadow-[0_20px_50px_rgba(57,255,20,0.3)] active:scale-95 transition-all transform-gpu group"
                  >
                    <Edit3 size={20} className="group-hover:rotate-12 transition-transform" />
                    <span>Recalibrate Data</span>
                  </button>
                  <button 
                    onClick={() => onDelete(meal)}
                    className="w-full h-18 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center space-x-4 text-gray-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 active:scale-95 transition-all transform-gpu"
                  >
                    <Trash2 size={20} />
                    <span className="font-black uppercase tracking-[0.2em]">De-register Meal</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
