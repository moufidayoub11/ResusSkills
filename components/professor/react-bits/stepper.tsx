"use client";
// Adapted from React Bits Stepper (MIT + Commons Clause; see LICENSE.md).
import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "../ui";
export default function Stepper({
  children,
  step,
  onChange,
  labels,
}: {
  children: ReactNode;
  step: number;
  onChange: (n: number) => void;
  labels: string[];
}) {
  const reduce = useReducedMotion(),
    steps = Children.toArray(children);
  return (
    <div>
      <ol className="p-steps" aria-label="Étapes de l’export">
        {labels.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <Button
              variant={i === step ? "primary" : "outline"}
              disabled={i > step}
              aria-label={`Étape ${i + 1} : ${label}`}
              onClick={() => onChange(i)}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </Button>
            <span>{label}</span>
            {i < labels.length - 1 && (
              <motion.div
                className="p-step-line"
                animate={{ opacity: i < step ? 1 : 0.3 }}
                transition={{ duration: reduce ? 0 : 0.16 }}
              />
            )}
          </li>
        ))}
      </ol>
      <motion.div
        key={step}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
      >
        {steps[step]}
      </motion.div>
    </div>
  );
}
export function Step({ children }: { children: ReactNode }) {
  return <section>{children}</section>;
}
