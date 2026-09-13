import type { DifficultyLabel, RouteEstimationSnapshot } from "@/lib/estimation/types";
import { cn } from "@/lib/utils";

interface RouteEstimationCardProps {
  estimation: RouteEstimationSnapshot;
}

function difficultyBadgeClass(difficulty: DifficultyLabel): string {
  if (difficulty === "easy") {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  }
  if (difficulty === "medium") {
    return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  }
  return "border-rose-400/40 bg-rose-500/15 text-rose-200";
}

function formatDifficultyLabel(difficulty: DifficultyLabel): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function formatEstimatedTime(minutes: number): string {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${roundedMinutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

export default function RouteEstimationCard({ estimation }: RouteEstimationCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Personalized estimation</h2>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
            difficultyBadgeClass(estimation.difficulty),
          )}
        >
          {formatDifficultyLabel(estimation.difficulty)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-blue-100/75">
        <p>
          <span className="text-blue-100/55">Estimated time:</span>{" "}
          {formatEstimatedTime(estimation.estimatedTimeMinutes)}
        </p>
        <p>
          <span className="text-blue-100/55">Effort score:</span> {estimation.derivedMetrics.effortScore.toFixed(1)}
        </p>
        <p>
          <span className="text-blue-100/55">Avg slope:</span>{" "}
          {estimation.derivedMetrics.averageSlopePercent !== null
            ? `${estimation.derivedMetrics.averageSlopePercent.toFixed(2)}%`
            : "n/a"}
        </p>
        <p>
          <span className="text-blue-100/55">Elevation / km:</span>{" "}
          {estimation.derivedMetrics.elevationPerKmM !== null
            ? `${estimation.derivedMetrics.elevationPerKmM.toFixed(1)} m`
            : "n/a"}
        </p>
      </div>
    </div>
  );
}
