import type { EstimationProfileInput, RouteEstimationDeduplicationKey } from "@/lib/estimation/types";
import type { RouteSnapshot } from "@/lib/route/types";

function normalizeNumber(value: number | null): string {
  return value === null ? "null" : value.toFixed(6);
}

function toRouteCanonicalSnapshot(snapshot: RouteSnapshot): string {
  return [
    "route-shape-v2",
    `pointCount=${snapshot.pointCount}`,
    `totalDistanceM=${normalizeNumber(snapshot.totalDistanceM)}`,
    `elevationGainM=${normalizeNumber(snapshot.elevationGainM)}`,
    `elevationLossM=${normalizeNumber(snapshot.elevationLossM)}`,
    `minElevationM=${normalizeNumber(snapshot.minElevationM)}`,
    `maxElevationM=${normalizeNumber(snapshot.maxElevationM)}`,
    `startLat=${normalizeNumber(snapshot.startLat)}`,
    `startLng=${normalizeNumber(snapshot.startLng)}`,
    `endLat=${normalizeNumber(snapshot.endLat)}`,
    `endLng=${normalizeNumber(snapshot.endLng)}`,
    `bounds.minLat=${normalizeNumber(snapshot.bounds.minLat)}`,
    `bounds.minLng=${normalizeNumber(snapshot.bounds.minLng)}`,
    `bounds.maxLat=${normalizeNumber(snapshot.bounds.maxLat)}`,
    `bounds.maxLng=${normalizeNumber(snapshot.bounds.maxLng)}`,
  ].join("|");
}

function toProfileCanonicalSignature(profile: EstimationProfileInput): string {
  return JSON.stringify({
    experienceLevel: profile.experienceLevel.trim().toLowerCase(),
    weightKg: normalizeNumber(profile.weightKg),
    weeklyDistanceKm: normalizeNumber(profile.weeklyDistanceKm),
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildRouteEstimationDeduplicationKey(
  snapshot: RouteSnapshot,
  profile: EstimationProfileInput,
): Promise<RouteEstimationDeduplicationKey> {
  const [routeHash, profileSignature] = await Promise.all([
    sha256Hex(toRouteCanonicalSnapshot(snapshot)),
    sha256Hex(toProfileCanonicalSignature(profile)),
  ]);

  return { routeHash, profileSignature };
}
