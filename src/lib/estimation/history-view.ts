import type { RouteEstimationHistoryEntry } from "@/lib/estimation/types";

export interface SavedEstimationHistoryItem {
  id: number;
  routeHash: string;
  historyVersion: number;
  isLegacy: boolean;
  computedAt: string;
  estimatedTimeMinutes: number;
  difficulty: RouteEstimationHistoryEntry["difficulty"];
  sourceFileName: string | null;
  totalDistanceM: number | null;
  elevationGainM: number | null;
  averagePaceMinPerKm: number | null;
  itraSignalStatus: string | null;
  weatherSignalStatus: string | null;
}

export function buildSavedEstimationHistoryItems(
  estimationHistory: RouteEstimationHistoryEntry[],
): SavedEstimationHistoryItem[] {
  return estimationHistory.map((entry) => {
    return {
      id: entry.id,
      routeHash: entry.deduplicationKey.routeHash,
      historyVersion: entry.historyVersion,
      isLegacy: entry.isLegacy,
      computedAt: entry.computedAt,
      estimatedTimeMinutes: entry.estimatedTimeMinutes,
      difficulty: entry.difficulty,
      sourceFileName: entry.sourceFileName,
      totalDistanceM: entry.totalDistanceM,
      elevationGainM: entry.elevationGainM,
      averagePaceMinPerKm: entry.derivedMetrics.averagePaceMinPerKm ?? null,
      itraSignalStatus: entry.derivedMetrics.externalSignals?.itra.status ?? null,
      weatherSignalStatus: entry.derivedMetrics.externalSignals?.weather.status ?? null,
    };
  });
}

export function resolveSavedHistoryWarning(
  queryWarning: string | null,
  estimationHistoryError: Error | null,
): string | null {
  if (queryWarning) {
    return queryWarning;
  }
  if (estimationHistoryError) {
    return "Latest estimation is available, but saved history could not be fully loaded right now.";
  }
  return null;
}

export function resolveProtectedHistoryEntryId(
  items: SavedEstimationHistoryItem[],
  currentRouteHash: string | null,
): number | null {
  if (currentRouteHash === null) {
    return null;
  }

  return items.find((item) => item.routeHash === currentRouteHash)?.id ?? null;
}
