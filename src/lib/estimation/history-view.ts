import type { RouteEstimationHistoryEntry, SavedRouteHistoryEntry } from "@/lib/estimation/types";

export interface SavedEstimationHistoryItem {
  id: number;
  routeHash: string;
  computedAt: string;
  estimatedTimeMinutes: number;
  difficulty: RouteEstimationHistoryEntry["difficulty"];
  sourceFileName: string | null;
  totalDistanceM: number | null;
  elevationGainM: number | null;
}

export function buildSavedEstimationHistoryItems(
  estimationHistory: RouteEstimationHistoryEntry[],
  routeHistory: SavedRouteHistoryEntry[],
): SavedEstimationHistoryItem[] {
  const routeByHash = new Map(routeHistory.map((route) => [route.routeHash, route] as const));

  return estimationHistory.map((entry) => {
    const route = routeByHash.get(entry.deduplicationKey.routeHash);
    return {
      id: entry.id,
      routeHash: entry.deduplicationKey.routeHash,
      computedAt: entry.computedAt,
      estimatedTimeMinutes: entry.estimatedTimeMinutes,
      difficulty: entry.difficulty,
      sourceFileName: route?.sourceFileName ?? null,
      totalDistanceM: route?.totalDistanceM ?? null,
      elevationGainM: route?.elevationGainM ?? null,
    };
  });
}

export function resolveSavedHistoryWarning(
  queryWarning: string | null,
  estimationHistoryError: Error | null,
  routeHistoryError: Error | null,
): string | null {
  if (queryWarning) {
    return queryWarning;
  }
  if (estimationHistoryError || routeHistoryError) {
    return "Latest estimation is available, but saved history could not be fully loaded right now.";
  }
  return null;
}
