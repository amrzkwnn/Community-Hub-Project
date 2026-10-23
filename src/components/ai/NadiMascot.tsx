'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';

export const NADI_MASCOT_FRAMES = {
  idle: '/nadikomuniti/02_nadi_mascot/animation_frames/01-idle-eyes-open.webp',
  blinkHalf: '/nadikomuniti/02_nadi_mascot/animation_frames/02-eyes-half-closed.webp',
  blinkClosed: '/nadikomuniti/02_nadi_mascot/animation_frames/03-eyes-closed-smile.webp',
  blinkReturn: '/nadikomuniti/02_nadi_mascot/animation_frames/04-eyes-open-return.webp',
  waveStart: '/nadikomuniti/02_nadi_mascot/animation_frames/05-wave-start.webp',
  waveRaised: '/nadikomuniti/02_nadi_mascot/animation_frames/06-wave-raised.webp',
  waveReturn: '/nadikomuniti/02_nadi_mascot/animation_frames/07-wave-return.webp',
  armsOut: '/nadikomuniti/02_nadi_mascot/animation_frames/08-arms-out.webp',
} as const;

export interface NadiMascotProps {
  size?: number;
  isHovered?: boolean;
  isDragging?: boolean;
  className?: string;
  priority?: boolean;
  disableAnimations?: boolean;
}

const subscribeReducedMotion = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
};

const getReducedMotionSnapshot = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getReducedMotionServerSnapshot = () => false;

export default function NadiMascot({
  size = 54,
  isHovered = false,
  isDragging = false,
  className = '',
  priority = true,
  disableAnimations = false,
}: NadiMascotProps) {
  const [currentFrame, setCurrentFrame] = useState<string>(NADI_MASCOT_FRAMES.idle);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Animation lock refs to prevent overlapping sequences
  const isAnimatingRef = useRef(false);
  const isWavingRef = useRef(false);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Clear running timers
  const clearSequenceTimers = () => {
    sequenceTimersRef.current.forEach((t) => clearTimeout(t));
    sequenceTimersRef.current = [];
  };

  // Preload all animation frames on mount to eliminate frame flicker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    Object.values(NADI_MASCOT_FRAMES).forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  // Natural Eye-Blink Loop (triggers every 5-7 seconds)
  useEffect(() => {
    if (prefersReducedMotion || disableAnimations) return;

    const scheduleNextBlink = () => {
      const delay = Math.floor(Math.random() * 2000) + 5000; // 5.0s to 7.0s
      blinkTimerRef.current = setTimeout(() => {
        if (!isAnimatingRef.current && !isDragging && !isWavingRef.current) {
          triggerBlink();
        } else {
          scheduleNextBlink();
        }
      }, delay);
    };

    const triggerBlink = () => {
      if (isAnimatingRef.current || isDragging || isWavingRef.current) return;
      isAnimatingRef.current = true;

      // 1. Half blink (70ms)
      setCurrentFrame(NADI_MASCOT_FRAMES.blinkHalf);

      const t1 = setTimeout(() => {
        // 2. Closed eyes with smile (100ms)
        setCurrentFrame(NADI_MASCOT_FRAMES.blinkClosed);

        const t2 = setTimeout(() => {
          // 3. Re-opening half blink (70ms)
          setCurrentFrame(NADI_MASCOT_FRAMES.blinkHalf);

          const t3 = setTimeout(() => {
            // 4. Return to idle eyes open
            setCurrentFrame(NADI_MASCOT_FRAMES.idle);
            isAnimatingRef.current = false;
            scheduleNextBlink();
          }, 70);
          sequenceTimersRef.current.push(t3);
        }, 100);
        sequenceTimersRef.current.push(t2);
      }, 70);
      sequenceTimersRef.current.push(t1);
    };

    scheduleNextBlink();

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      clearSequenceTimers();
    };
  }, [prefersReducedMotion, isDragging, disableAnimations]);

  // Wave Animation (triggered on desktop hover)
  useEffect(() => {
    if (prefersReducedMotion || isDragging || disableAnimations) return;

    if (isHovered && !isWavingRef.current) {
      isWavingRef.current = true;
      isAnimatingRef.current = true;
      clearSequenceTimers();

      // 1. Wave start (140ms)
      setCurrentFrame(NADI_MASCOT_FRAMES.waveStart);

      const t1 = setTimeout(() => {
        // 2. Wave raised (320ms)
        setCurrentFrame(NADI_MASCOT_FRAMES.waveRaised);

        const t2 = setTimeout(() => {
          // 3. Wave return (150ms)
          setCurrentFrame(NADI_MASCOT_FRAMES.waveReturn);

          const t3 = setTimeout(() => {
            // 4. Back to idle
            setCurrentFrame(NADI_MASCOT_FRAMES.idle);
            isWavingRef.current = false;
            isAnimatingRef.current = false;
          }, 150);
          sequenceTimersRef.current.push(t3);
        }, 320);
        sequenceTimersRef.current.push(t2);
      }, 140);
      sequenceTimersRef.current.push(t1);
    }
  }, [isHovered, isDragging, prefersReducedMotion, disableAnimations]);

  // Derive the active frame:
  // If dragging -> armsOut
  // If reduced motion or animations disabled -> idle
  // Otherwise -> current animated frame
  const displayedFrame = prefersReducedMotion || disableAnimations
    ? NADI_MASCOT_FRAMES.idle
    : isDragging
    ? NADI_MASCOT_FRAMES.armsOut
    : currentFrame;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <div
        className={`w-full h-full relative transition-transform duration-300 ${
          !prefersReducedMotion && !isDragging && !disableAnimations ? 'animate-nadi-breathe' : ''
        }`}
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(15, 23, 42, 0.18))',
        }}
      >
        <Image
          src={displayedFrame}
          alt="Nadi Mascot"
          width={size}
          height={size}
          priority={priority}
          unoptimized
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      </div>

      <style jsx>{`
        @keyframes nadiBreathe {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        .animate-nadi-breathe {
          animation: nadiBreathe 3.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-nadi-breathe {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
