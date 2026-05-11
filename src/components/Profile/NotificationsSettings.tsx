import React from 'react';
import { motion } from 'motion/react';
import { Bell, ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { UserSettings } from '../../types';

interface NotificationsSettingsProps {
  settings: UserSettings['notifications'];
  onSave: (settings: UserSettings['notifications']) => void;
  onBack: () => void;
}

export default function NotificationsSettings({ settings, onSave, onBack }: NotificationsSettingsProps) {
  const [localSettings, setLocalSettings] = React.useState(settings);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localSettings);
    setIsSaving(false);
    onBack();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">Notifications</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        {[
          { key: 'waterReminder', label: 'Water Reminders', desc: 'Stay hydrated with smart alerts' },
          { key: 'mealReminder', label: 'Meal Reminders', desc: 'Never miss a refueling window' },
          { key: 'workoutReminder', label: 'Workout Reminders', desc: 'Keep your streak alive' },
          { key: 'aiCoachTips', label: 'AI Coach Tips', desc: 'Real-time biological insights' },
        ].map((item) => (
          <div key={item.key} className="glass p-5 rounded-3xl border-white/5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">{item.label}</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">{item.desc}</p>
            </div>
            <Switch 
              checked={localSettings[item.key as keyof typeof localSettings] as boolean}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, [item.key]: checked }))}
            />
          </div>
        ))}

        <div className="glass p-5 rounded-3xl border-white/5 space-y-4">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Default Reminder Time</p>
          <input 
            type="time" 
            value={localSettings.reminderTime}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-neon-green/50"
          />
        </div>
      </div>

      <Button 
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-16 rounded-[2rem] bg-neon-green text-black hover:bg-neon-green/90 font-black uppercase tracking-[0.2em] shadow-xl shadow-neon-green/20"
      >
        <Save size={18} className="mr-2" /> Save Preferences
      </Button>
    </div>
  );
}
