"use client";
import { useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("professor-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("professor-preferences", callback);
  };
};
export function usePreference(
  key: string,
  fallback: string,
): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? fallback,
    () => fallback,
  );
  return [
    value,
    (next: string) => {
      localStorage.setItem(key, next);
      window.dispatchEvent(new Event("professor-preferences"));
    },
  ];
}
