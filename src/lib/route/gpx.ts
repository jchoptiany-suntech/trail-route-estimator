import {
  GPX_UPLOAD_ALLOWED_EXTENSIONS,
  GPX_UPLOAD_ALLOWED_MIME_TYPES,
  GPX_UPLOAD_MAX_BYTES,
  type GpxPoint,
  type RouteBounds,
  type RouteSnapshotInput,
  type RouteSnapshotMetrics,
} from "@/lib/route/types";

export type GpxParseErrorCode =
  | "missing_file"
  | "invalid_extension"
  | "invalid_mime_type"
  | "file_too_large"
  | "invalid_text_payload"
  | "invalid_xml"
  | "missing_track_points"
  | "invalid_point";

export class GpxParseError extends Error {
  code: GpxParseErrorCode;

  constructor(code: GpxParseErrorCode, message: string) {
    super(message);
    this.name = "GpxParseError";
    this.code = code;
  }
}

function hasValidExtension(fileName: string): boolean {
  return GPX_UPLOAD_ALLOWED_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
}

function hasValidMimeType(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return GPX_UPLOAD_ALLOWED_MIME_TYPES.includes(normalized as (typeof GPX_UPLOAD_ALLOWED_MIME_TYPES)[number]);
}

function parseCoordinate(value: string, code: GpxParseErrorCode): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new GpxParseError(code, "Invalid GPX point coordinate.");
  }
  return parsed;
}

function parseElevation(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineDistanceM(start: GpxPoint, end: GpxPoint): number {
  const earthRadiusM = 6371000;
  const dLat = ((end.lat - start.lat) * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function toBounds(points: GpxPoint[]): RouteBounds {
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

function toMetrics(points: GpxPoint[]): RouteSnapshotMetrics {
  let totalDistanceM = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let minElevationM: number | null = null;
  let maxElevationM: number | null = null;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    if (i > 0) {
      totalDistanceM += haversineDistanceM(points[i - 1], current);
    }

    if (current.eleM !== null) {
      minElevationM = minElevationM === null ? current.eleM : Math.min(minElevationM, current.eleM);
      maxElevationM = maxElevationM === null ? current.eleM : Math.max(maxElevationM, current.eleM);
    }

    if (i > 0) {
      const previousElevation = points[i - 1].eleM;
      if (previousElevation !== null && current.eleM !== null) {
        const delta = current.eleM - previousElevation;
        if (delta > 0) {
          elevationGainM += delta;
        } else if (delta < 0) {
          elevationLossM += Math.abs(delta);
        }
      }
    }
  }

  return {
    pointCount: points.length,
    totalDistanceM,
    elevationGainM: minElevationM === null ? null : elevationGainM,
    elevationLossM: minElevationM === null ? null : elevationLossM,
    minElevationM,
    maxElevationM,
  };
}

export interface ParsedGpxSnapshot {
  snapshot: RouteSnapshotInput;
}

export function parseGpxSnapshotFromText(fileName: string, fileSizeBytes: number, xmlText: string): ParsedGpxSnapshot {
  if (!fileName.trim()) {
    throw new GpxParseError("missing_file", "GPX file is required.");
  }

  if (!hasValidExtension(fileName)) {
    throw new GpxParseError("invalid_extension", "Only .gpx files are supported.");
  }

  if (fileSizeBytes <= 0) {
    throw new GpxParseError("missing_file", "Uploaded GPX file is empty.");
  }

  if (fileSizeBytes > GPX_UPLOAD_MAX_BYTES) {
    throw new GpxParseError("file_too_large", "Uploaded GPX file exceeds the size limit.");
  }

  if (typeof xmlText !== "string" || xmlText.trim().length === 0) {
    throw new GpxParseError("invalid_text_payload", "Unable to read uploaded GPX contents.");
  }

  if (!/<gpx[\s>]/i.test(xmlText)) {
    throw new GpxParseError("invalid_xml", "Uploaded file is not a valid GPX document.");
  }

  const pointRegex =
    /<trkpt\b[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>|<trkpt\b[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*\/>/gi;
  const points: GpxPoint[] = [];
  let match: RegExpExecArray | null;

  while ((match = pointRegex.exec(xmlText)) !== null) {
    const latRaw = match[1] || match[4];
    const lngRaw = match[2] || match[5];
    const trackPointBody = match[3];
    const eleMatch = trackPointBody ? /<ele>([^<]+)<\/ele>/i.exec(trackPointBody) : null;

    if (!latRaw || !lngRaw) {
      throw new GpxParseError("invalid_point", "Track point coordinates are missing.");
    }

    const lat = parseCoordinate(latRaw, "invalid_point");
    const lng = parseCoordinate(lngRaw, "invalid_point");
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new GpxParseError("invalid_point", "Track point coordinates are out of range.");
    }

    points.push({
      lat,
      lng,
      eleM: parseElevation(eleMatch?.[1]),
    });
  }

  if (points.length < 2) {
    throw new GpxParseError("missing_track_points", "GPX file must contain at least two track points.");
  }

  const start = points[0];
  const end = points[points.length - 1];

  return {
    snapshot: {
      sourceFileName: fileName,
      sourceFileSizeBytes: fileSizeBytes,
      startLat: start.lat,
      startLng: start.lng,
      endLat: end.lat,
      endLng: end.lng,
      bounds: toBounds(points),
      geometry: points,
      metrics: toMetrics(points),
    },
  };
}

export function validateGpxFileMetadata(fileName: string, mimeType: string, fileSizeBytes: number): void {
  if (!fileName.trim()) {
    throw new GpxParseError("missing_file", "GPX file is required.");
  }
  if (!hasValidExtension(fileName)) {
    throw new GpxParseError("invalid_extension", "Only .gpx files are supported.");
  }
  if (mimeType && !hasValidMimeType(mimeType)) {
    throw new GpxParseError("invalid_mime_type", "Uploaded file type is not supported.");
  }
  if (fileSizeBytes <= 0) {
    throw new GpxParseError("missing_file", "Uploaded GPX file is empty.");
  }
  if (fileSizeBytes > GPX_UPLOAD_MAX_BYTES) {
    throw new GpxParseError("file_too_large", "Uploaded GPX file exceeds the size limit.");
  }
}
