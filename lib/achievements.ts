import { Trophy, Zap, Flame, Target, Clock, Medal, Star, Award, Rocket, Crown } from "lucide-react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  // Combo achievements
  first_correct: {
    id: "first_correct",
    title: "Premier Pas",
    description: "Première bonne réponse",
    icon: Star,
    color: "text-blue-500",
    rarity: "common",
  },
  combo_3: {
    id: "combo_3",
    title: "En Forme",
    description: "3 bonnes réponses consécutives",
    icon: Zap,
    color: "text-yellow-500",
    rarity: "common",
  },
  combo_5: {
    id: "combo_5",
    title: "En Feu",
    description: "5 bonnes réponses consécutives",
    icon: Flame,
    color: "text-orange-500",
    rarity: "rare",
  },
  combo_10: {
    id: "combo_10",
    title: "Inarrêtable",
    description: "10 bonnes réponses consécutives",
    icon: Rocket,
    color: "text-red-500",
    rarity: "epic",
  },

  // Speed achievements
  speed_demon: {
    id: "speed_demon",
    title: "Rapide",
    description: "Répondre en moins de 10 secondes",
    icon: Clock,
    color: "text-cyan-500",
    rarity: "common",
  },
  lightning_fast: {
    id: "lightning_fast",
    title: "Éclair",
    description: "Répondre en moins de 5 secondes",
    icon: Zap,
    color: "text-purple-500",
    rarity: "rare",
  },

  // Completion achievements
  phase_complete: {
    id: "phase_complete",
    title: "Phase Terminée",
    description: "Terminer une phase du quiz",
    icon: Target,
    color: "text-green-500",
    rarity: "common",
  },
  perfect_phase: {
    id: "perfect_phase",
    title: "Phase Parfaite",
    description: "100% sur une phase",
    icon: Trophy,
    color: "text-amber-500",
    rarity: "epic",
  },
  no_skips: {
    id: "no_skips",
    title: "Déterminé",
    description: "Terminer sans passer de question",
    icon: Medal,
    color: "text-indigo-500",
    rarity: "rare",
  },

  // Final score achievements
  quiz_complete: {
    id: "quiz_complete",
    title: "Quiz Terminé",
    description: "Terminer le quiz",
    icon: Award,
    color: "text-teal-500",
    rarity: "common",
  },
  quiz_master: {
    id: "quiz_master",
    title: "Maître du Quiz",
    description: "Score de 90% ou plus",
    icon: Crown,
    color: "text-amber-500",
    rarity: "epic",
  },
  perfectionist: {
    id: "perfectionist",
    title: "Perfectionniste",
    description: "Score parfait de 100%",
    icon: Crown,
    color: "text-pink-500",
    rarity: "legendary",
  },
};

export type AchievementId = keyof typeof ACHIEVEMENTS;

// Get rarity color for background/border styling
export function getRarityColor(rarity: Achievement["rarity"]): string {
  switch (rarity) {
    case "legendary":
      return "from-pink-500 to-purple-500";
    case "epic":
      return "from-purple-500 to-indigo-500";
    case "rare":
      return "from-blue-500 to-cyan-500";
    default:
      return "from-gray-400 to-gray-500";
  }
}

export function getRarityBorder(rarity: Achievement["rarity"]): string {
  switch (rarity) {
    case "legendary":
      return "border-pink-500";
    case "epic":
      return "border-purple-500";
    case "rare":
      return "border-blue-500";
    default:
      return "border-gray-400";
  }
}

export function getRarityLabel(rarity: Achievement["rarity"]): string {
  switch (rarity) {
    case "legendary":
      return "LÉGENDAIRE";
    case "epic":
      return "ÉPIQUE";
    case "rare":
      return "RARE";
    default:
      return "COMMUN";
  }
}

// Check conditions for achievements
export function checkAchievements(
  stats: {
    combo: number;
    maxCombo: number;
    correctCount: number;
    totalAnswered: number;
    timeSpent: number; // seconds for current question
    skippedCount: number;
    phaseScore?: number; // percentage for current phase
    totalScore?: number; // final percentage
    isPhaseComplete?: boolean;
    isQuizComplete?: boolean;
  },
  existingAchievements: string[]
): string[] {
  const newAchievements: string[] = [];

  // Helper to add achievement if not already earned
  const unlock = (id: string) => {
    if (!existingAchievements.includes(id) && !newAchievements.includes(id)) {
      newAchievements.push(id);
    }
  };

  // First correct answer
  if (stats.correctCount === 1) {
    unlock("first_correct");
  }

  // Combo achievements (based on current combo)
  if (stats.combo >= 3) unlock("combo_3");
  if (stats.combo >= 5) unlock("combo_5");
  if (stats.combo >= 10) unlock("combo_10");

  // Speed achievements
  if (stats.timeSpent <= 10 && stats.timeSpent > 0) {
    unlock("speed_demon");
  }
  if (stats.timeSpent <= 5 && stats.timeSpent > 0) {
    unlock("lightning_fast");
  }

  // Phase completion
  if (stats.isPhaseComplete) {
    unlock("phase_complete");
    if (stats.phaseScore === 100) {
      unlock("perfect_phase");
    }
  }

  // Quiz completion
  if (stats.isQuizComplete) {
    unlock("quiz_complete");
    
    if (stats.skippedCount === 0) {
      unlock("no_skips");
    }
    
    if (stats.totalScore && stats.totalScore >= 90) {
      unlock("quiz_master");
    }
    
    if (stats.totalScore === 100) {
      unlock("perfectionist");
    }
  }

  return newAchievements;
}
