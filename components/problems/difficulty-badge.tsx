import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/problems";

/**
 * Difficulty is a semantic token, not a raw color: the same three hues are used
 * in the list, the workspace header, and the progress ticks.
 */
const TONE: Record<Difficulty, string> = {
  easy: "border-difficulty-easy/35 bg-difficulty-easy/10 text-difficulty-easy",
  medium:
    "border-difficulty-medium/35 bg-difficulty-medium/10 text-difficulty-medium",
  hard: "border-difficulty-hard/35 bg-difficulty-hard/10 text-difficulty-hard",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border font-mono text-[11px]", TONE[difficulty], className)}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </Badge>
  );
}
