import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Camera, Plus, Flame, Activity, Zap, CheckCircle2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { searchFoodAI, getSuggestionsAI } from '../../lib/gemini';
import { useDebounce } from '../../hooks/useDebounce';
import { FoodVisualizer } from './FoodVisualizer';
import { MealLog } from '../../types';
import { Image as ImageIcon } from 'lucide-react';

import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: () => void;
  userId: string;
  prefillMeal?: MealLog | null;
}

export default function LogMealModal({ isOpen, onClose, onScan, userId, prefillMeal }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [servingSize, setServingSize] = useState(1);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [view, setView] = useState<'search' | 'confirm' | 'manual'>('search');
  const [manualData, setManualData] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '', visualQuery: '', category: '' });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  React.useEffect(() => {
    if (prefillMeal && isOpen) {
      setManualData({
        name: prefillMeal.name || '',
        calories: (prefillMeal.calories ?? 0).toString(),
        protein: (prefillMeal.protein ?? 0).toString(),
        carbs: (prefillMeal.carbs ?? 0).toString(),
        fats: (prefillMeal.fat || 0).toString(),
        visualQuery: '',
        category: prefillMeal.category || ''
      });
      setMealType(prefillMeal.mealType);
      setView('manual');
    } else if (!isOpen) {
      // Reset when closing
      setQuery('');
      setResult(null);
      setView('search');
      setManualData({ name: '', calories: '', protein: '', carbs: '', fats: '', visualQuery: '', category: '' });
    }
  }, [prefillMeal, isOpen]);

  const debouncedQuery = useDebounce(query, 500);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length > 2 && view === 'search') {
        const results = await getSuggestionsAI(debouncedQuery);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [debouncedQuery]);

  const handleAiSuggestManual = async () => {
    if (!manualData.name.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const data = await searchFoodAI(manualData.name);
      if (data) {
        setManualData({
          name: data.name || '',
          calories: (data.calories ?? 0).toString(),
          protein: (data.protein ?? 0).toString(),
          carbs: (data.carbs ?? 0).toString(),
          fats: (data.fat || data.fats || 0).toString(),
          visualQuery: data.visualQuery || '',
          category: data.category || ''
        });
      }
    } catch (e) {
      console.error(e);
      setError("AI suggestions failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchFoodAI(query);
      setResult(data);
      setView('confirm');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveManualMeal = async () => {
    if (!manualData.name || !manualData.calories) return;
    
    setLoading(true);
    setError(null);
    
    const mealData = {
      name: manualData.name,
      calories: Number(manualData.calories),
      protein: Number(manualData.protein) || 0,
      carbs: Number(manualData.carbs) || 0,
      fat: Number(manualData.fats) || 0,
      mealType,
      imageUrl: '',
      category: manualData.category,
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const today = format(new Date(), 'yyyy-MM-dd');
        
        if (prefillMeal) {
          // Update Mode
          const mealRef = doc(db, 'users', userId, 'meals', prefillMeal.id);
          const { writeBatch, doc: firestoreDoc, increment } = await import('firebase/firestore');
          const batch = writeBatch(db);

          // Calculate diff for stats
          const calDiff = mealData.calories - (prefillMeal.calories ?? 0);
          const proteinDiff = mealData.protein - (prefillMeal.protein ?? 0);
          const carbsDiff = mealData.carbs - (prefillMeal.carbs ?? 0);
          const fatDiff = mealData.fat - (prefillMeal.fat ?? 0);

          batch.update(mealRef, {
            ...mealData,
            updatedAt: serverTimestamp()
          });

          const statsRef = firestoreDoc(db, 'users', userId, 'daily_stats', today);
          batch.set(statsRef, {
            consumedCalories: increment(calDiff),
            protein: increment(proteinDiff),
            carbs: increment(carbsDiff),
            fat: increment(fatDiff),
            updatedAt: serverTimestamp()
          }, { merge: true });

          await batch.commit();
        } else {
          // Create Mode
          const mealPath = `users/${userId}/meals`;
          const statsPath = `users/${userId}/daily_stats/${today}`;
          
          const { writeBatch, doc: firestoreDoc, increment } = await import('firebase/firestore');
          const batch = writeBatch(db);
          
          // Add Meal
          const newMealRef = firestoreDoc(collection(db, mealPath));
          batch.set(newMealRef, {
            ...mealData,
            timestamp: serverTimestamp()
          });
          
          // Update Daily Stats
          const statsRef = firestoreDoc(db, statsPath);
          batch.set(statsRef, {
            consumedCalories: increment(mealData.calories),
            protein: increment(mealData.protein),
            carbs: increment(mealData.carbs),
            fat: increment(mealData.fat),
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          await batch.commit();
        }
      } else {
        // Guest Mode
        const guestMeals = JSON.parse(localStorage.getItem('aura_guest_meals') || '[]');
        if (prefillMeal) {
          const index = guestMeals.findIndex((m: any) => m.id === prefillMeal.id);
          if (index !== -1) {
            guestMeals[index] = { ...prefillMeal, ...mealData };
          }
        } else {
          guestMeals.push({
            ...mealData,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: { seconds: Math.floor(Date.now() / 1000) }
          });
        }
        localStorage.setItem('aura_guest_meals', JSON.stringify(guestMeals));
        window.dispatchEvent(new Event('storage'));
      }
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#39FF14', '#00E5FF', '#FFFFFF']
      });
    } catch (e) {
      setError("Failed to save meal core.");
      handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser?.uid}/meals`);
    } finally {
      setLoading(false);
    }
  };

  const saveMeal = async () => {
    if (!result) return;
    
    setLoading(true);
    setError(null);

    const mealData = {
      name: result.name || 'Unknown',
      calories: Math.round((result.calories ?? 0) * servingSize),
      protein: Math.round((result.protein ?? 0) * servingSize),
      carbs: Math.round((result.carbs ?? 0) * servingSize),
      fat: Math.round((result.fat || result.fats || 0) * servingSize),
      mealType,
      imageUrl: '',
      healthScore: result.healthScore || 50,
      category: result.category || 'snack',
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const today = format(new Date(), 'yyyy-MM-dd');
        const mealPath = `users/${userId}/meals`;
        const statsPath = `users/${userId}/daily_stats/${today}`;
        
        const { writeBatch, doc, increment } = await import('firebase/firestore');
        const batch = writeBatch(db);
        
        // Add Meal
        const newMealRef = doc(collection(db, mealPath));
        batch.set(newMealRef, {
          ...mealData,
          timestamp: serverTimestamp()
        });
        
        // Update Daily Stats
        const statsRef = doc(db, statsPath);
        batch.set(statsRef, {
          consumedCalories: increment(mealData.calories),
          protein: increment(mealData.protein),
          carbs: increment(mealData.carbs),
          fat: increment(mealData.fat),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        await batch.commit();
      } else {
        // Guest Mode
        const guestMeals = JSON.parse(localStorage.getItem('aura_guest_meals') || '[]');
        guestMeals.push({
          ...mealData,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });
        localStorage.setItem('aura_guest_meals', JSON.stringify(guestMeals));
        window.dispatchEvent(new Event('storage'));
      }
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setQuery('');
        setResult(null);
        setView('search');
      }, 1500);

       confetti({
         particleCount: 150,
         spread: 80,
         origin: { y: 0.8 },
         colors: ['#39FF14', '#00E5FF', '#FFFFFF']
       });
    } catch (e) {
      setError("Failed to push meal data.");
      handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser?.uid}/meals`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-[#0A0A0A] rounded-t-[3rem] p-8 pb-12 overflow-y-auto max-h-[95vh] relative border-t border-white/10 custom-scrollbar"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em]">Log Nutrition</p>
              <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight">Fuel Intake</h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="text-gray-400" size={20} />
            </button>
          </div>

          {view === 'search' ? (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <Input
                  autoFocus
                  placeholder="What did you eat?"
                  className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-neon-green/50 transition-all text-lg"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-neon-green border-t-transparent animate-spin rounded-full" />
                  </div>
                )}

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQuery(s);
                            setSuggestions([]);
                            handleSearch();
                          }}
                          className="w-full px-6 py-4 text-left text-sm text-white/70 hover:bg-neon-green/10 hover:text-neon-green transition-all border-b border-white/5 last:border-0 flex items-center justify-between group"
                        >
                          <span className="font-bold">{s}</span>
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card 
                  onClick={onScan}
                  className="p-4 bg-white/5 border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-2 group hover:bg-neon-green/10 hover:border-neon-green/20 cursor-pointer transition-all"
                >
                  <Camera size={24} className="text-neon-green" />
                  <span className="text-[10px] font-black text-gray-500 group-hover:text-neon-green">SCAN MEAL</span>
                </Card>
                <Card 
                  onClick={() => setView('manual')}
                  className="p-4 bg-white/5 border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-2 group hover:bg-neon-green/10 hover:border-neon-green/20 cursor-pointer transition-all"
                >
                  <Zap size={24} className="text-neon-green" />
                  <span className="text-[10px] font-black text-gray-500 group-hover:text-neon-green">MANUAL ENTRY</span>
                </Card>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Cuisines</p>
                <div className="flex flex-wrap gap-2">
                  {['Tikka Masala', 'Sushi Box', 'Pasta Carbonara', 'Falafel Wrap', 'Bento', 'Moussaka'].map(food => (
                    <button 
                      key={food} 
                      onClick={() => { setQuery(food); }} 
                      className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 hover:border-neon-green/30 text-[10px] font-bold text-gray-400 hover:text-neon-green transition-all uppercase tracking-tighter"
                    >
                      {food}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Fuel</p>
                {['Protein Shake', 'Chicken Breast', 'Avocado Toast'].map(food => (
                  <button key={food} onClick={() => { setQuery(food); }} className="w-full h-12 flex items-center justify-between px-4 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 text-left transition-all">
                    <span className="font-bold text-sm text-white/50">{food}</span>
                    <Plus size={14} className="text-gray-600" />
                  </button>
                ))}
              </div>

              <Button 
                onClick={handleSearch}
                disabled={!query.trim() || loading}
                className="w-full h-14 rounded-2xl bg-neon-green text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Search with Aura AI'}
              </Button>
            </div>
          ) : view === 'manual' ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              {manualData.name && (
                <div className="relative h-40 flex items-center justify-center p-4">
                  <FoodVisualizer 
                    category={manualData.category} 
                    size="lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 py-2 bg-gradient-to-t from-black to-transparent text-center">
                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">AI Bio-Hologram</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Meal Name / Global Search</p>
                  <div className="relative">
                    <Input 
                      placeholder="e.g. Pizza Margherita"
                      className="h-14 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-gray-600 pr-12"
                      value={manualData.name}
                      onChange={e => setManualData({...manualData, name: e.target.value})}
                    />
                    <button 
                      onClick={handleAiSuggestManual}
                      disabled={!manualData.name.trim() || aiLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-neon-green/20 rounded-lg flex items-center justify-center group active:scale-90 transition-all disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <div className="w-4 h-4 border-2 border-neon-green border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <Sparkles size={16} className="text-neon-green group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                  <p className="text-[8px] text-gray-600 mt-2 font-bold uppercase tracking-widest">
                    Tap Sparkles for Aura AI Global Intelligence Autofill
                  </p>
                </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Calories (kcal)</p>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-12 bg-white/5 border-white/10 rounded-xl text-white"
                        value={manualData.calories}
                        onChange={e => setManualData({...manualData, calories: e.target.value})}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Protein (g)</p>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-12 bg-white/5 border-white/10 rounded-xl text-white"
                        value={manualData.protein}
                        onChange={e => setManualData({...manualData, protein: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Carbs (g)</p>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-12 bg-white/5 border-white/10 rounded-xl text-white"
                        value={manualData.carbs}
                        onChange={e => setManualData({...manualData, carbs: e.target.value})}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Fats (g)</p>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-12 bg-white/5 border-white/10 rounded-xl text-white"
                        value={manualData.fats}
                        onChange={e => setManualData({...manualData, fats: e.target.value})}
                      />
                    </div>
                  </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button variant="outline" onClick={() => setView('search')} className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black uppercase tracking-widest">
                  Cancel
                </Button>
                <Button 
                  onClick={saveManualMeal}
                  disabled={!manualData.name || !manualData.calories || loading || success}
                  className={`flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest transition-all ${success ? 'bg-white text-black' : 'bg-neon-green text-black'}`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                  ) : success ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={18} />
                      <span>{prefillMeal ? 'Core Synced' : 'Core Logged'}</span>
                    </div>
                  ) : (
                    prefillMeal ? 'Update Bio-Core' : 'Add Meal'
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               <div className="bg-white/5 rounded-[3rem] border border-neon-green/20 relative overflow-hidden group p-8">
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                     <FoodVisualizer 
                       category={result?.category} 
                       size="xl"
                     />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-4">
                      <Sparkles size={14} className="text-neon-green" />
                      <span className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em]">AI Verified Intelligence</span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight leading-tight">{result?.name}</h3>
                    <div className="grid grid-cols-3 gap-4 mb-2">
                       <div className="bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                          <p className="text-2xl font-black text-neon-green">{Math.round(result?.calories * servingSize)}</p>
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Kcal</p>
                       </div>
                       <div className="bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                          <p className="text-2xl font-black text-electric-blue">{Math.round(result?.protein * servingSize)}<span className="text-xs ml-0.5">g</span></p>
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Protein</p>
                       </div>
                       <div className="bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                          <p className="text-2xl font-black text-orange-400">{Math.round(result?.carbs * servingSize)}<span className="text-xs ml-0.5">g</span></p>
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Carbs</p>
                       </div>
                    </div>
                  </div>
               </div>

               {result?.suitability && (
                 <div className="grid grid-cols-2 gap-3">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-neon-green uppercase mb-1">Energy Optimization</p>
                     <p className="text-[10px] text-gray-400 leading-tight">{result.suitability.weightLoss}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-electric-blue uppercase mb-1">Anabolic Potential</p>
                     <p className="text-[10px] text-gray-400 leading-tight">{result.suitability.muscleGain}</p>
                   </div>
                 </div>
               )}

               <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Servings</p>
                    <div className="flex space-x-2">
                       {[0.5, 1, 1.5, 2].map(s => (
                         <button 
                           key={s} 
                           onClick={() => setServingSize(s)}
                           className={`flex-1 h-10 rounded-xl font-black text-xs transition-all ${servingSize === s ? 'bg-neon-green text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                         >
                           {s}x
                         </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Meal Type</p>
                    <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                       {['breakfast', 'lunch', 'dinner', 'snack'].map((type: any) => (
                         <button 
                           key={type} 
                           onClick={() => setMealType(type)}
                           className={`px-4 h-10 rounded-xl font-black text-[10px] uppercase transition-all flex-shrink-0 ${mealType === type ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                 </div>
               </div>

               <div className="flex space-x-4 pt-4">
                  <Button variant="outline" onClick={() => setView('search')} className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10">
                    Back
                  </Button>
                  <Button 
                    onClick={saveMeal} 
                    disabled={loading || success}
                    className={`flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest transition-all ${success ? 'bg-white text-black' : 'bg-neon-green text-black hover:scale-[1.02] active:scale-[0.98]'}`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                    ) : success ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 size={18} />
                        <span>Core Updated</span>
                      </div>
                    ) : (
                      'Add Meal'
                    )}
                  </Button>
               </div>
               {error && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center space-x-2 text-red-500 text-[10px] font-bold uppercase">
                   <AlertCircle size={14} />
                   <span>{error}</span>
                 </motion.div>
               )}
               <div className="pt-6 flex items-center justify-center space-x-2 opacity-30">
                 <Activity size={10} className="text-gray-500" />
                 <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.4em]">Global Nutrition Intelligence (USDA, Nutritionix, OpenFoodFacts)</p>
               </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
