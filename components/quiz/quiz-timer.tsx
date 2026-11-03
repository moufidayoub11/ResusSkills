"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  duration: number; // seconds
  onTimeout: () => void;
  isPaused: boolean;
  onTick?: (remaining: number) => void;
  className?: string;
}

export function QuizTimer({ duration, onTimeout, isPaused, onTick, className }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [lastDuration, setLastDuration] = useState(duration);

  // Reset timer when duration changes (new question)
  if (duration !== lastDuration) {
    setTimeLeft(duration);
    setHasTimedOut(false);
    setLastDuration(duration);
  }

  // Timer countdown
  useEffect(() => {
    if (isPaused || hasTimedOut) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        if (onTick && newTime > 0) {
          onTick(newTime);
        }
        
        if (newTime <= 0 && !hasTimedOut) {
          setHasTimedOut(true);
          onTimeout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, hasTimedOut, onTick, onTimeout]);

  // Calculate percentage for visual
  const percentage = (timeLeft / duration) * 100;

  // Determine color based on time remaining
  const getColor = () => {
    if (timeLeft <= 10) return "text-red-500";
    if (timeLeft <= 30) return "text-yellow-500";
    return "text-green-500";
  };

  const getStrokeColor = () => {
    if (timeLeft <= 10) return "#ef4444"; // red-500
    if (timeLeft <= 30) return "#eab308"; // yellow-500
    return "#22c55e"; // green-500
  };

  const getBgColor = () => {
    if (timeLeft <= 10) return "bg-red-500/10";
    if (timeLeft <= 30) return "bg-yellow-500/10";
    return "bg-green-500/10";
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  // SVG circle parameters
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Circular progress */}
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-1000 ease-linear",
            timeLeft <= 10 && "animate-pulse"
          )}
        />
      </svg>

      {/* Time display in center */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full",
          getBgColor(),
          timeLeft <= 10 && "animate-pulse"
        )}
      >
        <span className={cn("text-lg font-bold tabular-nums", getColor())}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
}

// Compact horizontal timer bar variant
export function QuizTimerBar({ duration, onTimeout, isPaused, onTick, className }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [lastDuration, setLastDuration] = useState(duration);

  if (duration !== lastDuration) {
    setTimeLeft(duration);
    setHasTimedOut(false);
    setLastDuration(duration);
  }

  useEffect(() => {
    if (isPaused || hasTimedOut) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        if (onTick) {
          onTick(newTime);
        }

        if (newTime <= 0) {
          setHasTimedOut(true);
          onTimeout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, hasTimedOut, onTimeout, onTick]);

  const percentage = (timeLeft / duration) * 100;

  const getBarColor = () => {
    if (timeLeft <= 10) return "bg-red-500";
    if (timeLeft <= 30) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-linear",
            getBarColor(),
            timeLeft <= 10 && "animate-pulse"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span
        className={cn(
          "text-sm font-bold tabular-nums min-w-10 text-right",
          timeLeft <= 10 && "text-red-500 animate-pulse",
          timeLeft <= 30 && timeLeft > 10 && "text-yellow-500",
          timeLeft > 30 && "text-green-500"
        )}
      >
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
