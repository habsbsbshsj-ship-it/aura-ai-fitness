import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, MealLog, WaterLog } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Activity, Flame, Droplets, Trophy, ChevronRight, Plus, Zap, Trash2, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import WaterTracker from '../components/Dashboard/WaterTracker';
import PremiumCalorieCard from '../components/Dashboard/PremiumCalorieCard';
import LogMealModal from '../components/Dashboard/LogMealModal';
import MealDetailsModal from '../components/Dashboard/MealDetailsModal';
import StartActionButton from '../components/Dashboard/StartActionButton';
import { FoodVisualizer } from '../components/Dashboard/FoodVisualizer';
import { useSettings } from '../contexts/SettingsContext';
import { units } from '../lib/utils';
import PullToRefresh from '../components/PullToRefresh';

interface DashboardProps {
  profile: UserProfile | null;
  onNavigate: (page: any) => void;
  onRefresh?: () => Promise<void>;
}

export default function Dashboard({ profile, onNavigate, onRefresh }: DashboardProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [waterToday, setWaterToday] = useState(0);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [deletingMeal, setDeletingMeal] = useState<MealLog | null>(null);
  const [undoMeal, setUndoMeal] = useState<MealLog | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
  const handleDeleteMeal = async (meal: MealLog) => {
    if (!profile) return;
    
    if (!auth.currentUser) {
      // Guest Delete
      const guestMeals = JSON.parse(localStorage.getItem('aura_guest_meals') || '[]');
      const updated = guestMeals.filter((m: any) => m.id !== meal.id);
      localStorage.setItem('aura_guest_meals', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      setDeletingMeal(null);
      setUndoMeal(meal);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
      return;
    }

    const path = `users/${profile.uid}/meals/${meal.id}`;
    try {
      // Note: Ideally we should update daily_stats here too, but for simplicity we rely on the meals list
      await deleteDoc(doc(db, path));
      setDeletingMeal(null);
      setUndoMeal(meal);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUndo = async () => {
    if (!profile || !undoMeal) return;
    
    if (!auth.currentUser) {
      // Guest Undo
      const guestMeals = JSON.parse(localStorage.getItem('aura_guest_meals') || '[]');
      guestMeals.push(undoMeal);
      localStorage.setItem('aura_guest_meals', JSON.stringify(guestMeals));
      window.dispatchEvent(new Event('storage'));
      setShowUndo(false);
      return;
    }

    const path = `users/${profile.uid}/meals`;
    try {
      const { id, ...mealData } = undoMeal;
      await addDoc(collection(db, path), {
        ...mealData,
        timestamp: serverTimestamp()
      });
      setShowUndo(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };
  
  useEffect(() => {
    // Force refresh on storage change (for guest mode)
    const handleStorageChange = () => {
      if (!auth.currentUser) {
        console.log("Dashboard: Storage change detected. Refreshing guest data.");
        const today = format(new Date(), 'yyyy-MM-dd');

        // Handle Meals
        const guestMeals = JSON.parse(localStorage.getItem('aura_guest_meals') || '[]');
        setMeals(guestMeals.filter((m: any) => m.date === today).sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));

        // Handle Water
        const guestWater = JSON.parse(localStorage.getItem('aura_guest_water') || '[]');
        const totalWater = guestWater
          .filter((w: any) => w.date === today)
          .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
        setWaterToday(totalWater);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    if (!profile) return;
    
    if (!auth.currentUser) {
      // Guest initialization
      handleStorageChange();
      return;
    }
    
    console.log("Dashboard: Setting up listeners for user:", profile.uid);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Listen to meals for today
    const mealsRef = collection(db, 'users', profile.uid, 'meals');
    const qMeals = query(mealsRef, where('date', '==', today), orderBy('timestamp', 'desc'));
    const unsubscribeMeals = onSnapshot(qMeals, (snapshot) => {
      const mealData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealLog));
      setMeals(mealData);
    }, (err) => {
      console.error("Meals Listener Error:", err);
      // Fallback if index missing
      if (err.message.includes('requires an index')) {
        onSnapshot(mealsRef, (snap) => {
           const allMeals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealLog));
           setMeals(allMeals.filter(m => m.date === today).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
        });
      }
    });

    // Listen to water for today
    const waterRef = collection(db, 'users', profile.uid, 'water');
    const qWater = query(waterRef, where('date', '==', today));
    const unsubscribeWater = onSnapshot(qWater, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (Number(doc.data().amount) || 0), 0);
      setWaterToday(total);
    }, (err) => {
      console.error("Water Listener Error:", err);
    });

    return () => {
      unsubscribeMeals();
      unsubscribeWater();
    };
  }, [profile]);

  const caloriesConsumed = meals.length > 0 ? meals.reduce((acc, m) => acc + (Number(m?.calories) || 0), 0) : 0;
  const proteinConsumed = meals.length > 0 ? meals.reduce((acc, m) => acc + (Number(m?.protein) || 0), 0) : 0;
  const calorieGoal = profile?.targetCalories || 2000;
  const proteinGoal = profile?.targetProtein || 150;
  const waterGoal = profile?.targetWater || 3000;

  const handleSignOut = async () => {
    localStorage.removeItem('aura_guest_profile');
    await auth.signOut();
    window.location.href = '/';
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!auth.currentUser) {
        window.dispatchEvent(new Event('storage'));
      }
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="p-6 space-y-8 pb-32"
      >
      {/* Header */}
      <header className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-gray-500 text-xs font-black uppercase tracking-widest">Metabolic Core</h2>
          <h1 className="text-3xl font-black font-display tracking-tight mt-1">
            {profile?.displayName?.split(' ')[0] || 'Champion'} <span className="text-neon-green">.</span>
          </h1>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 p-[2px] transition-transform hover:scale-105 active:scale-95">
          <div className="w-full h-full rounded-[14px] bg-black overflow-hidden flex items-center justify-center">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neon-green/20 to-electric-blue/20 flex items-center justify-center text-neon-green font-black text-xl">
                {profile?.displayName?.[0] || 'U'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Guest Mode Nudge */}
      {profile?.isAnonymous && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-neon-green/10 border border-neon-green/20 p-4 rounded-3xl flex items-center justify-between group cursor-pointer hover:bg-neon-green/20 transition-all"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/20 flex items-center justify-center neo-glow">
              <Zap className="text-neon-green" size={20} />
            </div>
            <div>
              <p className="text-white font-black text-[10px] uppercase tracking-widest">Guest Session Active</p>
              <p className="text-gray-400 text-[10px] uppercase font-bold">Sync progress to Aura Cloud</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="bg-neon-green text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-neon-green/20"
          >
            Upgrade
          </button>
        </motion.div>
      )}

      {/* Calories Overview - PREMIUM VERSION */}
      <PremiumCalorieCard 
        consumed={caloriesConsumed} 
        goal={calorieGoal} 
        onClick={() => setIsLogModalOpen(true)}
      />

      {/* Primary Action Section */}
      <StartActionButton onClick={() => setIsLogModalOpen(true)} />

      {/* Notification Toast (Undo) */}
      <AnimatePresence>
        {showUndo && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-6 right-6 z-[100] glass border-neon-green/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                <RotateCcw size={16} className="text-neon-green" />
              </div>
              <div>
                <p className="text-white font-black text-xs uppercase tracking-widest">Meal Removed</p>
                <p className="text-gray-500 text-[10px] uppercase font-bold">{undoMeal?.name}</p>
              </div>
            </div>
            <button 
              onClick={handleUndo}
              className="bg-neon-green text-black px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-neon-green/20"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingMeal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setDeletingMeal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass border-red-500/30 p-8 rounded-[3rem] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Trash2 size={120} className="text-red-500" />
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Critical Action</span>
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2 leading-tight uppercase">Delete this meal?</h3>
              <p className="text-gray-400 text-xs font-medium mb-8">This will remove <span className="text-white font-bold">{deletingMeal.name}</span> and its nutritional data from your core logs.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeleteMeal(deletingMeal)}
                  className="w-full py-4 bg-red-500 text-black rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Confirm Delete
                </button>
                <button 
                  onClick={() => setDeletingMeal(null)}
                  className="w-full py-4 bg-white/5 text-gray-400 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:text-white transition-all"
                >
                  Keep Meal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LogMealModal 
        isOpen={isLogModalOpen || !!editingMeal} 
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingMeal(null);
        }} 
        onScan={() => {
          setIsLogModalOpen(false);
          onNavigate('scanner');
        }}
        userId={profile?.uid || ''} 
        prefillMeal={editingMeal} 
      />

      <MealDetailsModal 
        meal={selectedMeal}
        isOpen={!!selectedMeal}
        onClose={() => setSelectedMeal(null)}
        onEdit={(meal) => {
          setSelectedMeal(null);
          setEditingMeal(meal);
          setIsLogModalOpen(true);
        }}
        onDelete={(meal) => {
          setSelectedMeal(null);
          setDeletingMeal(meal);
        }}
      />

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="glass p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-electric-blue/5 blur-2xl rounded-full" />
          <div className="w-12 h-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center mb-4 neo-glow border border-electric-blue/20">
            <Droplets className="text-electric-blue" size={24} />
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">{t('dashboard.hydration')}</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <h4 className="text-2xl font-black">
              {settings.app.units === 'metric' ? waterToday : Math.round(units.mlToOz(waterToday))}
            </h4>
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              {settings.app.units === 'metric' ? 'ml' : 'oz'}
            </span>
          </div>
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (waterToday / waterGoal) * 100)}%` }}
              className="h-full bg-electric-blue shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
              transition={{ duration: 1.5 }}
            />
          </div>
        </Card>

        <Card className="glass p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-neon-green/5 blur-2xl rounded-full" />
          <div className="w-12 h-12 rounded-2xl bg-neon-green/10 flex items-center justify-center mb-4 neo-glow border border-neon-green/20">
            <Trophy className="text-neon-green" size={24} />
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">Synthesis</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <h4 className="text-2xl font-black">{proteinConsumed}</h4>
            <span className="text-[10px] font-bold text-gray-500 uppercase">g</span>
          </div>
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (proteinConsumed / proteinGoal) * 100)}%` }}
              className="h-full bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]" 
              transition={{ duration: 1.5 }}
            />
          </div>
        </Card>
      </div>


      <WaterTracker userId={profile?.uid || ''} current={waterToday} goal={waterGoal} />

      {/* Recent Meals */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black font-display tracking-tight">{t('dashboard.daily_calories')}</h3>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Nutrient Breakdown</p>
          </div>
          <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-neon-green transition-all hover:border-neon-green group">
            <ChevronRight size={20} className="text-gray-400 group-hover:text-black transition-colors" />
          </button>
        </div>

        <div className="space-y-4">
          {meals.length === 0 ? (
            <div className="glass rounded-[2rem] p-12 text-center border-dashed border-white/10">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flame className="text-gray-700" size={32} />
              </div>
              <p className="text-gray-500 text-sm font-medium">Your metabolic engine is idle.</p>
              <button 
                onClick={() => setIsLogModalOpen(true)}
                className="text-neon-green text-xs font-black mt-4 uppercase tracking-[0.3em] hover:opacity-80 active:scale-95 transition-all"
              >
                Ignite Core +
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {meals.map((meal, index) => (
                <div key={meal.id} className="relative">
                  {/* Swipe Background Action */}
                  <div className="absolute inset-0 bg-red-500/10 rounded-3xl flex items-center justify-end px-6">
                    <Trash2 className="text-red-500" size={24} />
                  </div>

                  <motion.div 
                    layout
                    drag="x"
                    dragConstraints={{ left: -100, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -80) {
                        setDeletingMeal(meal);
                      }
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                    transition={{ 
                      duration: 0.3,
                      delay: Math.min(index * 0.05, 0.3)
                    }}
                    onClick={() => setSelectedMeal(meal)}
                    className="group relative overflow-hidden glass rounded-3xl p-4 flex items-center space-x-4 hover:bg-white/5 transition-all cursor-pointer border border-white/5 hover:border-white/10 z-10"
                  >
                    {/* Glowing Accent */}
                    <div className="absolute top-0 left-0 w-[2px] h-0 group-hover:h-full bg-neon-green transition-all duration-500 shadow-[0_0_15px_#39FF14]" />
                    
                    <div className="w-20 h-20 flex-shrink-0 relative">
                       <FoodVisualizer 
                         category={meal.category} 
                         className="w-full h-full"
                       />
                       {meal.healthScore && (
                         <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-neon-green/90 text-[8px] font-black text-black z-20">
                           {meal.healthScore}
                         </div>
                       )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">{meal.mealType}</span>
                        <span className="text-[8px] text-gray-700 font-black uppercase tracking-[0.1em]">
                          {meal.timestamp?.seconds ? format(new Date(meal.timestamp.seconds * 1000), 'HH:mm') : ''}
                        </span>
                      </div>
                      <h4 className="font-black text-lg text-white group-hover:text-neon-green transition-colors leading-tight truncate uppercase tracking-tight">{meal.name}</h4>
                      <div className="flex items-center space-x-3 mt-2">
                        <div className="flex items-center text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                          <Activity size={10} className="text-neon-green mr-1" />
                          {meal.protein}g P
                        </div>
                        <div className="flex items-center text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                          <Zap size={10} className="text-electric-blue mr-1" />
                          {meal.carbs}g C
                        </div>
                      </div>
                    </div>
    
                    <div className="pr-2 flex flex-col items-end relative group/delete">
                       <div className="text-2xl font-black tracking-tighter text-white group-hover:text-neon-green transition-colors">
                         {meal.calories ?? 0}
                       </div>
                       <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest -mt-1 mb-2">
                         KCAL
                       </div>
                       
                       {/* Elegant Delete Button */}
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setDeletingMeal(meal);
                         }}
                         className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-black transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-90"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </motion.div>
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
    </PullToRefresh>
  );
}

