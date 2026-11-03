"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Flame, Zap, Star } from "lucide-react";

interface ComboDisplayProps {
  combo: number;
  className?: string;
}

export function ComboDisplay({ combo, className }: ComboDisplayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevComboRef = useRef(combo);

  // Trigger animation when combo increases
  useEffect(() => {
    if (combo > prevComboRef.current && combo > 0) {
      const animateTimeout = setTimeout(() => setIsAnimating(true), 0);
      const resetTimeout = setTimeout(() => setIsAnimating(false), 500);
      prevComboRef.current = combo;
      return () => {
        clearTimeout(animateTimeout);
        clearTimeout(resetTimeout);
      };
    }
    prevComboRef.current = combo;
  }, [combo]);

  if (combo === 0) return null;

  // Get multiplier based on combo
  const getMultiplier = () => {
    if (combo >= 10) return "3x";
    if (combo >= 5) return "2x";
    if (combo >= 3) return "1.5x";
    return null;
  };

  // Get color/style based on combo level
  const getComboStyle = () => {
    if (combo >= 10) {
      return {
        bg: "bg-gradient-to-r from-purple-500 to-pink-500",
        text: "text-white",
        icon: Star,
        label: "LÉGENDAIRE",
      };
    }
    if (combo >= 5) {
      return {
        bg: "bg-gradient-to-r from-orange-500 to-red-500",
        text: "text-white",
        icon: Flame,
        label: "EN FEU",
      };
    }
    if (combo >= 3) {
      return {
        bg: "bg-gradient-to-r from-yellow-400 to-orange-500",
        text: "text-white",
        icon: Zap,
        label: "COMBO",
      };
    }
    return {
      bg: "bg-blue-500",
      text: "text-white",
      icon: Zap,
      label: "SÉRIE",
    };
  };

  const style = getComboStyle();
  const multiplier = getMultiplier();
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg",
        style.bg,
        style.text,
        isAnimating && "animate-bounce scale-110",
        "transition-all duration-300",
        className
      )}
    >
      {/* Fire/Icon with animation */}
      <div className={cn("relative", combo >= 5 && "animate-pulse")}>
        <Icon className={cn("h-5 w-5", combo >= 10 && "animate-spin")} />
        {combo >= 5 && (
          <Icon 
            className="absolute inset-0 h-5 w-5 animate-ping opacity-50" 
          />
        )}
      </div>

      {/* Combo count */}
      <div className="flex flex-col items-center leading-none">
        <span className="text-xs font-medium opacity-90">{style.label}</span>
        <span className={cn(
          "text-2xl font-black tabular-nums",
          isAnimating && "scale-125"
        )}>
          {combo}
        </span>
      </div>

      {/* Multiplier badge */}
      {multiplier && (
        <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md">
          <span className="text-sm font-bold">{multiplier}</span>
        </div>
      )}
    </div>
  );
}

// Compact version for header
export function ComboDisplayCompact({ combo, className }: ComboDisplayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevComboRef = useRef(combo);

  useEffect(() => {
    if (combo > prevComboRef.current && combo > 0) {
      const animateTimeout = setTimeout(() => setIsAnimating(true), 0);
      const resetTimeout = setTimeout(() => setIsAnimating(false), 300);
      prevComboRef.current = combo;
      return () => {
        clearTimeout(animateTimeout);
        clearTimeout(resetTimeout);
      };
    }
    prevComboRef.current = combo;
  }, [combo]);

  if (combo === 0) return null;

  const getColor = () => {
    if (combo >= 10) return "text-purple-500";
    if (combo >= 5) return "text-orange-500";
    if (combo >= 3) return "text-yellow-500";
    return "text-blue-500";
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        getColor(),
        isAnimating && "scale-110",
        "transition-transform duration-200",
        className
      )}
    >
      <Flame className={cn("h-4 w-4", combo >= 5 && "animate-pulse")} />
      <span className="text-sm font-bold tabular-nums">{combo}</span>
    </div>
  );
}
