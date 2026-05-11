import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, ChevronLeft, Globe, Zap, Languages, 
  Check, X, AlertCircle, RefreshCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSettings } from '../../types';
import { useTranslation } from 'react-i18next';

interface AppSettingsProps {
  settings: UserSettings['app'];
  onSave: (settings: UserSettings['app']) => void;
  onReset: () => void;
  onBack: () => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
];

export default function AppSettings({ settings, onSave, onReset, onBack }: AppSettingsProps) {
  const { t } = useTranslation();
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('profile.app_settings')}</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-6">
        {/* Units */}
        <div className="space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] ml-2">Units of Measurement</p>
          <div className="grid grid-cols-2 gap-3">
            {['metric', 'imperial'].map((u) => (
              <button 
                key={u}
                onClick={() => onSave({ ...settings, units: u as any })}
                className={`h-14 rounded-2xl border transition-all font-bold uppercase text-[10px] tracking-widest flex items-center justify-center ${
                  settings.units === u ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {settings.units === u && <Check size={12} className="mr-2" />}
                {u}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-gray-600 px-2 leading-relaxed">
            {settings.units === 'metric' 
              ? 'KG/CM/ML: Biological standards for precision tracking.' 
              : 'LBS/FT/OZ: Traditional scaling for localized awareness.'}
          </p>
        </div>

        {/* AI Style */}
        <div className="space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] ml-2">AI Response Matrix</p>
          <div className="grid grid-cols-3 gap-2">
            {['motivational', 'technical', 'friendly'].map((s) => (
              <button 
                key={s}
                onClick={() => onSave({ ...settings, aiStyle: s as any })}
                className={`h-14 rounded-2xl border transition-all font-bold text-[8px] uppercase tracking-tighter px-1 ${
                  settings.aiStyle === s ? 'bg-electric-blue/20 border-electric-blue text-electric-blue' : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <button 
          onClick={() => setShowLanguageSheet(true)}
          className="w-full glass p-5 rounded-3xl border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4 group-hover:bg-neon-green/10 transition-colors">
              <Languages size={20} className="text-gray-400 group-hover:text-neon-green" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white uppercase text-[11px] tracking-widest">{t('profile.language')}</p>
              <p className="text-[10px] text-neon-green font-black uppercase mt-0.5">{settings.language}</p>
            </div>
          </div>
          <ChevronLeft size={16} className="rotate-180 text-gray-600" />
        </button>
      </div>

      <div className="pt-8">
        <Button 
          variant="outline"
          onClick={() => setShowResetConfirm(true)}
          className="w-full h-16 rounded-[2rem] border-red-500/20 text-red-500 hover:bg-red-500/5 font-black uppercase tracking-[0.2em]"
        >
          <RefreshCcw size={16} className="mr-2" /> Reset Master Preferences
        </Button>
      </div>

      {/* Language Bottom Sheet */}
      <AnimatePresence>
        {showLanguageSheet && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLanguageSheet(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-card w-full max-w-sm rounded-t-[3rem] p-8 border-t border-white/10 relative pb-12"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-black text-white uppercase">{t('profile.language')}</h4>
                <button onClick={() => setShowLanguageSheet(false)} className="text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSave({ ...settings, language: lang.name });
                      setShowLanguageSheet(false);
                    }}
                    className={`h-16 rounded-2xl border p-4 text-left transition-all relative overflow-hidden group ${
                      settings.language === lang.name ? 'border-neon-green bg-neon-green/5' : 'border-white/5 bg-white/5'
                    }`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-widest ${settings.language === lang.name ? 'text-neon-green' : 'text-gray-500'}`}>
                      {lang.name}
                    </p>
                    <p className="text-xs font-medium text-white/40 mt-1">{lang.native}</p>
                    {settings.language === lang.name && (
                      <div className="absolute top-2 right-2">
                        <Check size={12} className="text-neon-green" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-8 rounded-[2.5rem] border-white/10 w-full max-w-xs text-center space-y-6 relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-white uppercase tracking-tighter">Hard Reset</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Revert neural network and interface configurations to factory defaults? Your logs remain intact.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-white/5 text-gray-500 font-bold"
                >
                  Abort
                </Button>
                <Button 
                  onClick={() => {
                    onReset();
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 h-14 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
