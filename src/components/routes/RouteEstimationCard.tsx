import type { DifficultyLabel, RouteEstimationSnapshot } from "@/lib/estimation/types";
import { cn } from "@/lib/utils";

interface RouteEstimationCardProps {
  estimation: RouteEstimationSnapshot;
  recomputeHistoryEntryId?: number | null;
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

function formatPace(minutesPerKm: number | null | undefined): string {
  if (minutesPerKm === null || minutesPerKm === undefined || !Number.isFinite(minutesPerKm) || minutesPerKm <= 0) {
    return "n/a";
  }

  const totalSeconds = Math.round(minutesPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
}

function formatSignalStatus(status: string | undefined): string {
  if (!status) {
    return "n/a";
  }
  return status.replaceAll("_", " ");
}

export default function RouteEstimationCard({ estimation, recomputeHistoryEntryId = null }: RouteEstimationCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Personalized estimation</h2>
        <div className="flex items-center gap-2">
          {recomputeHistoryEntryId !== null ? (
            <form method="POST" action="/api/estimations/history/recompute">
              <input type="hidden" name="historyEntryId" value={recomputeHistoryEntryId} />
              <button
                type="submit"
                className="rounded-md border border-purple-400/30 bg-purple-500/15 px-2 py-1 text-xs text-purple-100 transition-colors hover:bg-purple-500/25"
              >
                Recompute
              </button>
            </form>
          ) : null}
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
              difficultyBadgeClass(estimation.difficulty),
            )}
          >
            {formatDifficultyLabel(estimation.difficulty)}
          </span>
        </div>
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
          <span className="text-blue-100/55">Avg pace:</span>{" "}
          {formatPace(estimation.derivedMetrics.averagePaceMinPerKm)}
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
        <p>
          <span className="text-blue-100/55">ITRA signal:</span>{" "}
          {formatSignalStatus(estimation.derivedMetrics.externalSignals?.itra.status)}
        </p>
        <p>
          <span className="text-blue-100/55">Weather signal:</span>{" "}
          {formatSignalStatus(estimation.derivedMetrics.externalSignals?.weather.status)}
        </p>
      </div>
    </div>
  );
}
