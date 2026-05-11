import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { getCoachResponse } from '../lib/gemini';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import PullToRefresh from '../components/PullToRefresh';
import { Send, Sparkles, Zap, Utensils, Target, ShieldCheck, ChevronRight, Mic, Flame } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachProps {
  profile: UserProfile | null;
  onRefresh?: () => Promise<void>;
}

const QUICK_CHIPS = [
  { id: 'meal', label: 'What should I eat today?', icon: <Utensils size={14} /> },
  { id: 'workout', label: 'Create a workout plan', icon: <Flame size={14} /> },
  { id: 'fat_loss', label: 'How can I lose fat?', icon: <Target size={14} /> },
  { id: 'protein', label: 'Suggest high protein meals', icon: <Zap size={14} /> },
];

export default function Coach({ profile, onRefresh }: CoachProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Hey ${profile?.displayName?.split(' ')[0] || 'there'}, I’m Aura 👋\nTell me what you need today — meal advice, workout ideas, or help reaching your goal.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic: ensures user stays at the bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    // Small delay to ensure DOM has updated before scrolling
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const messageToSend = text || input.trim();
    if (!messageToSend || loading) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setLoading(true);

    try {
      const res = await getCoachResponse(messageToSend, { 
        goal: profile?.goal || 'fitness',
        weight: profile?.weight,
        height: profile?.height,
        activityLevel: profile?.activityLevel,
        dietType: profile?.dietType,
        today: new Date().toISOString(),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to my neural network. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#020202] overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-green/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-electric-blue/5 blur-[120px] rounded-full" />
      </div>

      <header className="px-6 pt-6 pb-2 flex-shrink-0 z-20">
        <div className="glass-card rounded-[2.5rem] p-4 border border-white/5 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-green to-electric-blue p-[1px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                   <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-neon-green/20 blur-md"
                   />
                   <Sparkles className="text-neon-green relative z-10" size={20} />
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neon-green rounded-full border-2 border-black animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-lg font-black text-white uppercase tracking-tight">Aura Coach</h1>
                <ShieldCheck size={14} className="text-neon-green" />
              </div>
              <div className="flex items-center space-x-2 text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">
                <span className="text-neon-green shadow-glow">Active Now</span>
                <span className="text-white/40">v2.4 Core</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <PullToRefresh onRefresh={handleRefresh}>
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto px-6 custom-scrollbar overscroll-contain"
            id="chat-scroll-view"
          >
            <div className="space-y-6 pt-4 pb-12 flex flex-col">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div className={`flex items-start max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {m.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                           <Sparkles size={12} className="text-neon-green" />
                        </div>
                      )}
                      <div className={`rounded-2xl px-5 py-4 shadow-xl break-words whitespace-pre-wrap text-sm leading-relaxed ${
                        m.role === 'user' 
                          ? 'bg-neon-green text-black font-bold ml-2 rounded-tr-none' 
                          : 'glass-card border border-white/5 text-slate-200 rounded-tl-none backdrop-blur-md'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start items-center">
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mr-2">
                    <Sparkles size={12} className="text-neon-green animate-spin-slow" />
                  </div>
                  <div className="glass-card border border-white/5 rounded-2xl px-5 py-3 flex space-x-1.5 backdrop-blur-sm">
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-glow" />
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-glow" />
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-glow" />
                  </div>
                </motion.div>
              )}

              {messages.length === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 mt-4">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => handleSend(chip.label)}
                      className="glass-card hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 group transition-all active:scale-95 text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green group-hover:bg-neon-green group-hover:text-black transition-colors">
                        {chip.icon}
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">
                        {chip.label}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={messagesEndRef} className="h-4 w-full flex-shrink-0" id="chat-bottom-anchor" />
            </div>
          </div>
        </PullToRefresh>
      </div>
      
      <div className="px-6 pb-24 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent flex-shrink-0 z-30">
        <div className="max-w-2xl mx-auto relative group">
          <div className="absolute inset-0 bg-neon-green/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-3xl" />
          
          <div className="relative flex items-center bg-[#0A0A0A] border border-white/10 rounded-3xl p-2 pl-6 shadow-2xl focus-within:border-neon-green/30 transition-all pr-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Aura anything..."
              autoComplete="off"
              className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm font-medium h-12"
            />
            
            <div className="flex items-center space-x-2">
              <button className="w-10 h-10 rounded-2xl text-gray-500 hover:text-white transition-colors flex items-center justify-center active:scale-90">
                <Mic size={20} />
              </button>
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-[1.25rem] bg-neon-green text-black flex items-center justify-center shadow-lg shadow-neon-green/20 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
