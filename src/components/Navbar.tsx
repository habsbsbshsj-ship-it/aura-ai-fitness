import React from 'react';
import { motion } from 'motion/react';
import { Home, Scan, PieChart, MessageSquare, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  active: 'dashboard' | 'scanner' | 'plan' | 'coach' | 'profile';
  onNavigate: (page: any) => void;
}

export default function Navbar({ active, onNavigate }: NavbarProps) {
  const { t } = useTranslation();
  const items = [
    { id: 'dashboard', icon: Home, label: t('nav.dashboard') },
    { id: 'plan', icon: PieChart, label: t('nav.plan') },
    { id: 'scanner', icon: Scan, label: t('nav.scan') },
    { id: 'coach', icon: MessageSquare, label: t('nav.coach') },
    { id: 'profile', icon: User, label: t('nav.profile') }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-black/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-40">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex flex-col items-center justify-center w-16 h-16 relative"
          >
            {isActive && (
              <motion.div
                layoutId="nav-glow"
                className="absolute inset-0 bg-neon-green/10 rounded-2xl blur-xl"
              />
            )}
            <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-neon-green' : 'text-gray-500'}`} />
            <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-neon-green' : 'text-gray-500'}`}>
              {item.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -bottom-1 w-1 h-1 bg-neon-green rounded-full shadow-[0_0_8px_#39FF14]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
