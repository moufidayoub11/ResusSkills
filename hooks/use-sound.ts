"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundType = "correct" | "wrong" | "skip" | "combo" | "tick" | "achievement" | "victory" | "click";

// Sound frequencies and patterns using Web Audio API
const SOUND_CONFIGS: Record<SoundType, { frequencies: number[]; durations: number[]; type: OscillatorType; gain: number }> = {
  correct: {
    frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 - Major chord arpeggio
    durations: [0.1, 0.1, 0.15],
    type: "sine",
    gain: 0.3,
  },
  wrong: {
    frequencies: [200, 150], // Low descending
    durations: [0.15, 0.2],
    type: "square",
    gain: 0.15,
  },
  skip: {
    frequencies: [400, 300, 200], // Descending whoosh
    durations: [0.05, 0.05, 0.1],
    type: "sine",
    gain: 0.2,
  },
  combo: {
    frequencies: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 - Rising arpeggio
    durations: [0.08, 0.08, 0.08, 0.15],
    type: "sine",
    gain: 0.35,
  },
  tick: {
    frequencies: [800],
    durations: [0.05],
    type: "square",
    gain: 0.1,
  },
  achievement: {
    frequencies: [392, 523.25, 659.25, 783.99, 1046.5], // G4 to C6 fanfare
    durations: [0.1, 0.1, 0.1, 0.1, 0.25],
    type: "sine",
    gain: 0.3,
  },
  victory: {
    frequencies: [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5], // Victory fanfare
    durations: [0.15, 0.15, 0.15, 0.3, 0.15, 0.15, 0.4],
    type: "sine",
    gain: 0.35,
  },
  click: {
    frequencies: [600],
    durations: [0.03],
    type: "square",
    gain: 0.1,
  },
};

export function useSound() {
  const [enabled, setEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    // Check localStorage for sound preference
    const savedPreference = localStorage.getItem("quiz-sound-enabled");
    if (savedPreference !== null) {
      queueMicrotask(() => setEnabled(savedPreference === "true"));
    }
  }, []);

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem("quiz-sound-enabled", String(enabled));
  }, [enabled]);

  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      if (!enabled) return;

      // Initialize on first play (needs user interaction)
      if (!audioContextRef.current) {
        initializeAudio();
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      const config = SOUND_CONFIGS[type];
      let startTime = ctx.currentTime;

      config.frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(freq, startTime);

        // Envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(config.gain, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + config.durations[index]);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + config.durations[index] + 0.01);

        startTime += config.durations[index];
      });
    },
    [enabled, initializeAudio]
  );

  const toggleSound = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playSound,
    enabled,
    toggleSound,
    initializeAudio,
  };
}

export type { SoundType };
