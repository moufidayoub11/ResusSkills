"use client";
// Adapted from React Bits AnimatedList; semantic list with reduced motion.
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
export default function AnimatedList({
  items,
}: {
  items: { id: string; content: ReactNode }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ul>
      {items.map((item) => (
        <motion.li
          key={item.id}
          initial={reduce ? false : { opacity: 0, y: 3 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.18 }}
          className="p-quality-row"
        >
          {item.content}
        </motion.li>
      ))}
    </ul>
  );
}
