import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'motion/react';
import { RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const controls = useAnimation();
  const pullY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);

  const pullProgress = useTransform(pullY, [0, PULL_THRESHOLD], [0, 1]);
  const pullRotate = useTransform(pullY, [0, PULL_THRESHOLD], [0, 360]);
  const pullScale = useTransform(pullY, [0, PULL_THRESHOLD], [0.5, 1]);
  const pullOpacity = useTransform(pullY, [0, 10, PULL_THRESHOLD], [0, 0, 1]);

  const getScrollElement = useCallback(() => {
    const internal = containerRef.current?.querySelector('.overflow-y-auto');
    if (internal) return internal;

    const root = document.getElementById('main-scroll-root');
    const style = root ? window.getComputedStyle(root) : null;
    const isScrollable = style && (style.overflowY === 'auto' || style.overflowY === 'scroll');

    if (root && isScrollable) return root;
    
    return containerRef.current?.closest('.overflow-y-auto') || containerRef.current;
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const scrollEl = getScrollElement();
    if (scrollEl && scrollEl.scrollTop <= 5) {
      touchStartRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
      touchStartRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing || touchStartRef.current === null) return;

    const currentY = e.touches[0].clientY;
    const pullDistance = currentY - touchStartRef.current;
    
    if (pullDistance > 0) {
      const scrollEl = getScrollElement();
      if (scrollEl && scrollEl.scrollTop <= 5) {
        // Logarithm-like damping for that premium feel
        const dampenedY = Math.pow(pullDistance, 0.75);
        pullY.set(dampenedY);
        controls.set({ y: dampenedY });
        
        // Prevent browser native behaviors if we are vertically pulling
        if (pullDistance > 5 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        isPullingRef.current = false;
        pullY.set(0);
        controls.set({ y: 0 });
      }
    } else if (pullDistance < -5) {
      // Swiping up should stop the pull attempt immediately
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || isRefreshing) {
      isPullingRef.current = false;
      return;
    }
    
    isPullingRef.current = false;
    const currentY = pullY.get();

    if (currentY >= PULL_THRESHOLD - 15) {
      try {
        setIsRefreshing(true);
        // Haptic feedback simulation
        if ('vibrate' in navigator) navigator.vibrate(10);

        await Promise.all([
          controls.start({ y: 60, transition: { type: 'spring', stiffness: 400, damping: 30 } }),
          pullY.set(PULL_THRESHOLD)
        ]);

        await onRefresh();
        
        toast.success('Updated', {
          icon: '✨',
          style: {
            background: '#000',
            color: '#fff',
            border: '1px solid rgba(57, 255, 20, 0.2)',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          },
        });
      } catch (error) {
        toast.error('Refresh failed. Try again.', {
          style: {
            background: '#000',
            color: '#ff4444',
            border: '1px solid rgba(255, 68, 68, 0.2)',
            fontSize: '12px'
          }
        });
      } finally {
        setIsRefreshing(false);
        pullY.set(0);
        controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
      }
    } else {
      pullY.set(0);
      controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      className="relative h-full w-full flex flex-col overflow-visible" 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-[100] overflow-hidden"
        style={{ height: '100px' }}
      >
        <motion.div
          style={{ 
            y: -40,
            opacity: isRefreshing ? 1 : pullOpacity,
            scale: isRefreshing ? 1 : pullScale,
          }}
          animate={isRefreshing ? { y: 20 } : {}}
          className="flex flex-col items-center"
        >
          <motion.div
            style={{ rotate: isRefreshing ? 0 : pullRotate }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
            className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-3xl border border-neon-green/40 flex items-center justify-center shadow-[0_0_25px_rgba(57,255,20,0.4)]"
          >
            <RefreshCcw className="text-neon-green" size={22} />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={!isRefreshing && pullY.get() > PULL_THRESHOLD - 20 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            className="text-[8px] font-black text-neon-green uppercase tracking-[0.3em] mt-3 drop-shadow-[0_0_8px_#39FF14]"
          >
            Release to Sync
          </motion.p>
        </motion.div>
      </div>

      <motion.div
        animate={controls}
        className="flex-1 bg-transparent min-h-0"
      >
        {children}
      </motion.div>
    </div>
  );
}
