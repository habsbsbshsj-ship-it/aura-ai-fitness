import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, ChevronLeft, Trash2, ExternalLink, 
  AlertTriangle, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { UserSettings, UserProfile } from '../../types';
import { deleteUserData } from '@/lib/dataManagement';

interface PrivacySettingsProps {
  settings: UserSettings['privacy'];
  profile: UserProfile;
  onSave: (settings: UserSettings['privacy']) => void;
  onBack: () => void;
  onDeleted: () => void;
}

export default function PrivacySettings({ settings, profile, onSave, onBack, onDeleted }: PrivacySettingsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle');

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsProcessing(true);
    setStatus('deleting');
    try {
      await deleteUserData(profile);
      setShowDeleteModal(false);
      onDeleted();
    } catch (e) {
      console.error(e);
      setStatus('error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">Privacy & Safety</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        <div className="glass p-5 rounded-3xl border-white/5 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <p className="font-bold text-white">Marketing Protocols</p>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">AI optimization tips via encrypted email</p>
          </div>
          <Switch 
            checked={settings.marketingEmails}
            onCheckedChange={(checked) => onSave({ ...settings, marketingEmails: checked })}
          />
        </div>

        <div className="glass p-5 rounded-3xl border-white/5 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-electric-blue opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <p className="font-bold text-white">Neural Analytics</p>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Autonomous data pooling for model training</p>
          </div>
          <Switch 
            checked={settings.analytics}
            onCheckedChange={(checked) => onSave({ ...settings, analytics: checked })}
          />
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">GDPR / Data Sovereignty</p>
          <div className="h-px flex-1 bg-white/5 ml-4" />
        </div>
        
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="w-full h-16 glass rounded-2xl px-5 flex items-center justify-between group hover:border-red-500/30 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-red-500/5 group-hover:bg-red-500/10 flex items-center justify-center mr-4 transition-colors">
              <Trash2 size={18} className="text-red-500/60 group-hover:text-red-500 transition-colors" />
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-red-500/80 group-hover:text-red-500 transition-colors">Invoke Data Erasure</span>
              <span className="text-[8px] text-red-500/40 uppercase font-bold">Permanent deletion of all neural records</span>
            </div>
          </div>
        </button>
      </div>

      <div className="pt-8 space-y-3">
        <a href="#" className="flex items-center justify-between px-5 h-12 bg-white/5 rounded-xl text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
          <span>Security Whitepaper</span>
          <ExternalLink size={12} />
        </a>
        <a href="#" className="flex items-center justify-between px-5 h-12 bg-white/5 rounded-xl text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
          <span>Terms of Synthesis</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="glass-card w-full max-w-sm rounded-[2.5rem] p-8 border border-red-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px]" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
                  <AlertTriangle size={32} />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter">PERMANENT ERASURE</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    This protocol will permanently purge your profile, logs, and biometric matrices from the Aura AI core. This cannot be reversed.
                  </p>
                </div>

                <div className="w-full space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Type "DELETE" to confirm</label>
                    <Input 
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="DELETE"
                      className="h-12 bg-red-500/5 border-red-500/20 text-red-500 font-bold text-center tracking-[0.4em] focus:border-red-500 rounded-xl"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => setShowDeleteModal(false)}
                      variant="outline"
                      disabled={isProcessing}
                      className="flex-1 h-14 rounded-2xl border-white/10 text-gray-400 font-bold"
                    >
                      Abort
                    </Button>
                    <Button 
                      onClick={handleDelete}
                      disabled={isProcessing || deleteConfirmText !== 'DELETE'}
                      className="flex-1 h-14 rounded-2xl bg-red-500 text-white hover:bg-red-600 font-black uppercase tracking-[0.2em] text-[10px] disabled:opacity-20"
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Confirm Purge"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
