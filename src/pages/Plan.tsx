import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, DietPlan } from '../types';
import { generateDietPlan } from '../lib/gemini';
import { useTranslation } from 'react-i18next';
import { Sparkles, Calendar, Utensils, Zap, ChevronDown, Check, AlertCircle, RefreshCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PullToRefresh from '../components/PullToRefresh';

interface PlanProps {
  profile: UserProfile | null;
  onRefresh?: () => Promise<void>;
}

const FALLBACK_PLAN: DietPlan = {
  dailyCalories: 2200,
  dailyProtein: 160,
  meals: [
    { type: 'breakfast', name: 'Aura Power Protein Oats', description: 'Steel-cut oats with whey isolate, blueberries, and 1tbsp almond butter.', nutrition: { calories: 480, protein: 38 } },
    { type: 'lunch', name: 'Neural-Match Mediterranean Bowl', description: 'Double grilled chicken breast, quinoa base, spinach, and avocado.', nutrition: { calories: 620, protein: 45 } },
    { type: 'snack', name: 'Muscle Sync Recovery Bowl', description: 'Non-fat Greek yogurt with raw walnuts.', nutrition: { calories: 240, protein: 24 } },
    { type: 'dinner', name: 'Omega-Hologram Salmon', description: 'Sustainably caught salmon fillet with roasted sweet potatoes.', nutrition: { calories: 580, protein: 42 } },
    { type: 'snack', name: 'Night Shift Repair Shake', description: 'Casein protein isolate with water or almond milk.', nutrition: { calories: 140, protein: 26 } }
  ]
};

export default function Plan({ profile, onRefresh }: PlanProps) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerStatus, setTimerStatus] = useState<number>(0);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if we have a saved plan for today
    const savedPlan = localStorage.getItem(`aura_plan_${new Date().toISOString().split('T')[0]}`);
    if (savedPlan) {
      console.log("Plan: Loading saved plan from storage.");
      setPlan(JSON.parse(savedPlan));
    }
  }, []);

  const generate = async () => {
    if (!profile) {
      console.error("Plan: Cannot generate plan - Profile missing.");
      setError("User profile missing. Please complete setup.");
      return;
    }

    console.log("Plan: Starting diet plan generation for goal:", profile.goal);
    setLoading(true);
    setError(null);
    setTimerStatus(0);

    // Start 20s timeout
    loadingTimerRef.current = setInterval(() => {
      setTimerStatus(prev => {
        if (prev >= 20) {
          console.warn("Plan: Gemini request timed out (20s). Setting fallback.");
          handleTimeout();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      console.log("Plan: Calling Gemini API...");
      const data = await generateDietPlan(profile);
      
      if (data && data.meals && data.meals.length > 0) {
        console.log("Plan: Gemini response received and valid.");
        setPlan(data);
        // Save for today
        localStorage.setItem(`aura_plan_${new Date().toISOString().split('T')[0]}`, JSON.stringify(data));
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (e: any) {
      console.error("Plan: Generation failed:", e);
      setError(e?.message || "Failed to connect to Neural Network.");
      // If error happens quickly, don't auto-fallback, let user decide or wait for timer
    } finally {
      stopLoading();
    }
  };

  const handleTimeout = () => {
    stopLoading();
    setError("Connection latency high. Using bio-optimized fallback plan.");
    setPlan(FALLBACK_PLAN);
  };

  const stopLoading = () => {
    setLoading(false);
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  const clearAndRetry = () => {
    setPlan(null);
    generate();
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check for saved plan again
    const savedPlan = localStorage.getItem(`aura_plan_${new Date().toISOString().split('T')[0]}`);
    if (savedPlan) {
      setPlan(JSON.parse(savedPlan));
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-6 pb-32 space-y-8 relative max-w-md mx-auto min-h-screen">
        {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 blur-[100px] rounded-full pointer-events-none" />
      
      <header className="pt-4 relative z-10">
        <h1 className="text-3xl font-black font-display tracking-tight leading-none">
          AI DIET<br/><span className="gradient-text">ARCHITECT</span>
        </h1>
        <div className="flex items-center mt-2 space-x-2">
          <Badge variant="secondary" className="bg-neon-green/10 text-neon-green border-neon-green/20 text-[10px] py-0 px-2">V2.4 CORE</Badge>
          <p className="text-gray-500 text-[11px] font-medium uppercase tracking-widest">Molecular Nutrition AI</p>
        </div>
      </header>

      {!plan && !loading && !error && (
        <div className="flex flex-col items-center justify-center space-y-8 pt-10 relative z-10">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-neon-green/20 to-electric-blue/20 border border-white/10 flex items-center justify-center shadow-2xl"
          >
            <Sparkles className="text-neon-green" size={48} />
          </motion.div>
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-black text-white tracking-tight italic">CONSTRUCT YOUR BIO-PLAN</h3>
            <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
              Synthesize a protein-maximized, performance-aligned nutritional roadmap based on your current metrics.
            </p>
          </div>
          <Button 
            onClick={generate}
            className="w-full h-16 rounded-[2rem] bg-neon-green text-black hover:bg-neon-green/90 font-black uppercase tracking-[0.2em] shadow-xl shadow-neon-green/20 group"
          >
            <span>Initialize Architect</span>
            <Zap size={18} className="ml-2 group-hover:scale-125 transition-transform" />
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center space-y-10 pt-20 relative z-10">
          <div className="relative">
            {/* Outer Rings */}
            <div className="absolute -inset-8 border border-white/5 rounded-full animate-ping-slow" />
            <div className="absolute -inset-16 border border-white/5 rounded-full animate-ping-slow-delay" />
            
            <div className="w-32 h-32 rounded-full border-[6px] border-white/5 shadow-inner" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-[6px] border-neon-green border-t-transparent rounded-full shadow-[0_0_20px_#39FF14]"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Utensils className="text-neon-green mb-1" size={32} />
              <span className="text-[10px] font-black text-white/50">{timerStatus}s</span>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-neon-green font-black tracking-[0.3em] uppercase text-xs animate-pulse">
              Consulting Nutritional<br/>Neural Networks
            </p>
            <div className="flex justify-center space-x-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 20, 8] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1 bg-neon-green/30 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <Card className="glass-card border-red-500/30 p-6 rounded-[2rem] bg-red-500/5 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-red-500/20 rounded-xl text-red-500">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-white uppercase tracking-wider">Protocol Interrupted</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {error}
              </p>
              <div className="flex space-x-3 mt-4">
                <Button 
                  onClick={clearAndRetry}
                  className="h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase"
                >
                  <RefreshCcw size={14} className="mr-2" /> Retry Synthesis
                </Button>
                {!plan && (
                  <Button 
                    onClick={handleTimeout}
                    variant="outline"
                    className="h-10 border-white/10 text-gray-400 rounded-xl text-[10px] font-bold uppercase"
                  >
                    Use Fallback
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {plan && !loading && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="space-y-8 relative z-10"
        >
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             <Card className="glass-card p-6 rounded-[2.5rem] border-neon-green/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10">
                <Flame size={40} className="text-neon-green" />
               </div>
               <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Energy Quota</p>
               <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-white">{plan.dailyCalories}</span>
                <span className="text-[10px] font-bold text-neon-green uppercase">kcal</span>
               </div>
               <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-neon-green shadow-[0_0_10px_#39FF14]"
                />
               </div>
             </Card>

             <Card className="glass-card p-6 rounded-[2.5rem] border-electric-blue/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10">
                <Zap size={40} className="text-electric-blue" />
               </div>
               <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Protein Bank</p>
               <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-white">{plan.dailyProtein}</span>
                <span className="text-[10px] font-bold text-electric-blue uppercase">grams</span>
               </div>
               <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-electric-blue shadow-[0_0_10px_#00E5FF]"
                />
               </div>
             </Card>
          </div>

          {/* Menu Table */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-white uppercase tracking-[0.2em] flex items-center text-sm">
                <Calendar size={18} className="mr-3 text-neon-green" /> 
                Meal Manifest
              </h3>
              <div className="flex items-center text-[10px] font-bold text-neon-green uppercase tracking-widest bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20">
                Active Plan
              </div>
            </div>

            <div className="space-y-4">
              {plan.meals.map((meal, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card relative rounded-3xl p-5 flex items-start space-x-5 border border-white/5 hover:border-neon-green/30 transition-all group overflow-hidden"
                >
                  {/* Meal Glow */}
                  <div className="absolute -left-4 top-0 w-1 h-full bg-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-neon-green/10 transition-colors">
                    <span className="text-[10px] font-black text-neon-green leading-none">{meal.type.charAt(0).toUpperCase()}</span>
                    <span className="text-[8px] font-bold text-gray-600 mt-1">{i + 1}</span>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <h4 className="font-black text-white uppercase text-sm tracking-tight">{meal.name}</h4>
                      <span className="text-[10px] font-black text-neon-green uppercase tracking-tighter">{meal.type}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed italic">{meal.description}</p>
                    
                    <div className="flex items-center space-x-4 pt-3 mt-2 border-t border-white/5">
                      <div className="flex items-center space-x-1.5">
                        <Flame size={12} className="text-gray-600" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(meal.nutrition?.calories ?? 0)} <span className="text-[8px] opacity-60">KCAL</span></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Zap size={12} className="text-gray-600" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(meal.nutrition?.protein ?? 0)} <span className="text-[8px] opacity-60">G</span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="bg-white/5 rounded-3xl p-4 flex items-start space-x-3 border border-white/10">
            <Info size={16} className="text-electric-blue mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
              AI Diet Architect calculates these values based on your biological markers. Exact accuracy depends on food preparation and ingredient quality.
            </p>
          </div>

          <Button 
            onClick={clearAndRetry}
            variant="outline"
            className="w-full h-16 rounded-[2rem] border-white/10 hover:bg-white/5 text-gray-400 font-black uppercase tracking-[0.2em] transition-all"
          >
            <RefreshCcw size={16} className="mr-3" /> Reconstruct Matrix
          </Button>
        </motion.div>
      )}
    </div>
    </PullToRefresh>
  );
}

const Flame = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
