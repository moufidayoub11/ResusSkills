"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Achievement, getRarityColor, getRarityLabel } from "@/lib/achievements";

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (achievement) {
      // Small delay before showing for dramatic effect
      const showTimeout = setTimeout(() => setIsVisible(true), 100);

      // Auto dismiss after 4 seconds
      const dismissTimeout = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsLeaving(false);
          onDismiss();
        }, 300);
      }, 4000);

      return () => {
        clearTimeout(showTimeout);
        clearTimeout(dismissTimeout);
      };
    }
  }, [achievement, onDismiss]);

  if (!achievement || !isVisible) return null;

  const Icon = achievement.icon;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl shadow-2xl",
          "transform transition-all duration-300",
          isLeaving 
            ? "-translate-y-5 opacity-0 scale-95" 
            : "translate-y-0 opacity-100 scale-100"
        )}
      >
        {/* Gradient background */}
        <div className={cn(
          "absolute inset-0 bg-linear-to-r opacity-90",
          getRarityColor(achievement.rarity)
        )} />

        {/* Shine effect */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shine" />

        {/* Content */}
        <div className="relative px-6 py-4 flex items-center gap-4">
          {/* Icon with glow */}
          <div className="relative">
            <div className="absolute inset-0 blur-md bg-white/50 rounded-full scale-150" />
            <div className="relative bg-white/20 p-3 rounded-full backdrop-blur-sm">
              <Icon className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
          </div>

          {/* Text */}
          <div className="text-white">
            <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-0.5">
              🏆 {getRarityLabel(achievement.rarity)}
            </div>
            <div className="text-xl font-black">{achievement.title}</div>
            <div className="text-sm opacity-90">{achievement.description}</div>
          </div>
        </div>

        {/* Sparkle particles */}
        <div className="absolute top-2 left-4 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute bottom-3 right-8 w-1.5 h-1.5 bg-white rounded-full animate-ping delay-300" />
        <div className="absolute top-4 right-4 w-1 h-1 bg-white rounded-full animate-ping delay-500" />
      </div>
    </div>
  );
}

// Queue system for multiple achievements
interface AchievementQueueProps {
  achievements: Achievement[];
  onComplete: () => void;
}

export function AchievementQueue({ achievements, onComplete }: AchievementQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDismiss = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (achievements.length === 0) return null;

  return (
    <AchievementToast
      achievement={achievements[currentIndex]}
      onDismiss={handleDismiss}
    />
  );
}
