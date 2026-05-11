import React from 'react';
import { motion } from 'motion/react';
import { 
  Apple, 
  Beef, 
  Coffee, 
  Pizza, 
  IceCream, 
  Soup, 
  Utensils, 
  Leaf,
  Zap,
  Flame,
  Activity
} from 'lucide-react';

export type FoodCategory = 
  | 'fruit' 
  | 'vegetable' 
  | 'meat' 
  | 'fastfood' 
  | 'dessert' 
  | 'beverage' 
  | 'main_dish' 
  | 'snack';

interface Props {
  category?: FoodCategory | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const FoodVisualizer: React.FC<Props> = ({ category, size = 'md', className }) => {
  const getVisualConfig = () => {
    switch (category?.toLowerCase()) {
      case 'fruit':
        return {
          icon: Apple,
          color: 'from-rose-500 to-orange-400',
          glow: 'rgba(244, 63, 94, 0.4)',
          particles: 4
        };
      case 'vegetable':
        return {
          icon: Leaf,
          color: 'from-emerald-400 to-neon-green',
          glow: 'rgba(57, 255, 20, 0.4)',
          particles: 3
        };
      case 'meat':
        return {
          icon: Beef,
          color: 'from-red-600 to-rose-700',
          glow: 'rgba(225, 29, 72, 0.4)',
          particles: 5
        };
      case 'fastfood':
        return {
          icon: Pizza,
          color: 'from-orange-500 to-yellow-400',
          glow: 'rgba(249, 115, 22, 0.4)',
          particles: 4
        };
      case 'dessert':
        return {
          icon: IceCream,
          color: 'from-pink-400 to-purple-500',
          glow: 'rgba(232, 121, 249, 0.4)',
          particles: 6
        };
      case 'beverage':
        return {
          icon: Coffee,
          color: 'from-blue-400 to-electric-blue',
          glow: 'rgba(0, 229, 255, 0.4)',
          particles: 4
        };
      case 'main_dish':
        return {
          icon: Soup,
          color: 'from-indigo-500 to-electric-blue',
          glow: 'rgba(56, 189, 248, 0.4)',
          particles: 5
        };
      case 'snack':
        return {
          icon: Activity,
          color: 'from-cyan-400 to-teal-400',
          glow: 'rgba(45, 212, 191, 0.4)',
          particles: 3
        };
      default:
        return {
          icon: Utensils,
          color: 'from-gray-400 to-gray-600',
          glow: 'rgba(156, 163, 175, 0.4)',
          particles: 2
        };
    }
  };

  const config = getVisualConfig();
  const Icon = config.icon;

  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const iconSizeMap = {
    sm: 16,
    md: 24,
    lg: 40,
    xl: 56
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Background Glow */}
      <motion.div
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 rounded-full blur-xl"
        style={{ backgroundColor: config.glow }}
      />

      {/* Main Orb */}
      <div className={`relative z-10 flex items-center justify-center rounded-3xl bg-gradient-to-br ${config.color} p-4 shadow-lg border border-white/20 transform-gpu`}>
        <Icon size={iconSizeMap[size]} className="text-white drop-shadow-md" />
      </div>

      {/* Particles - Only for larger sizes to save performance */}
      {size !== 'sm' && [...Array(config.particles)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -30 - (i * 5), 0],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.8,
          }}
          className="absolute w-1 h-1 rounded-full bg-white/30 blur-[1px] z-0"
        />
      ))}
    </div>
  );
};
