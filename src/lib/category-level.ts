export type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success"
  | "warning"
  | "info";

export function getCategoryLevelLabel(level?: number): string {
  if (level === 0) return "Cat";
  if (level === 1) return "S-Cat";
  if (level === 2) return "SS-Cat";
  if (level === 3) return "SSS-Cat";
  if (typeof level === "number") return `Level ${level}`;
  return "Level";
}

export function getCategoryLevelBadgeVariant(level?: number): BadgeVariant {
  // Keep level 3 emphasized as default, others secondary
  return level === 3 ? "default" : "secondary";
}


