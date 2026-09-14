export const GPX_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const GPX_UPLOAD_ALLOWED_MIME_TYPES = [
  "application/gpx+xml",
  "application/xml",
  "text/xml",
  "application/octet-stream",
  "text/plain",
] as const;

export const GPX_UPLOAD_ALLOWED_EXTENSIONS = [".gpx"] as const;

export interface RouteUploadConstraints {
  maxBytes: number;
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
}

export const ROUTE_UPLOAD_CONSTRAINTS: RouteUploadConstraints = {
  maxBytes: GPX_UPLOAD_MAX_BYTES,
  allowedMimeTypes: GPX_UPLOAD_ALLOWED_MIME_TYPES,
  allowedExtensions: GPX_UPLOAD_ALLOWED_EXTENSIONS,
};

export interface GpxPoint {
  lat: number;
  lng: number;
  eleM: number | null;
}

export interface RouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface RouteSnapshotMetrics {
  pointCount: number;
  totalDistanceM: number;
  elevationGainM: number | null;
  elevationLossM: number | null;
  minElevationM: number | null;
  maxElevationM: number | null;
}

export interface RouteSnapshotInput {
  sourceFileName: string;
  sourceFileSizeBytes: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  bounds: RouteBounds;
  geometry: GpxPoint[];
  metrics: RouteSnapshotMetrics;
  plannedRunAt?: string | null;
  plannedRunTimezoneOffsetMinutes?: number | null;
}

export interface RouteSnapshotRow {
  user_id: string;
  source_file_name: string;
  source_file_size_bytes: number;
  point_count: number;
  total_distance_m: number;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  min_elevation_m: number | null;
  max_elevation_m: number | null;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  bounds: RouteBounds;
  geometry: GpxPoint[];
  planned_run_at: string | null;
  planned_run_timezone_offset_minutes: number | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface RouteSnapshot {
  userId: string;
  sourceFileName: string;
  sourceFileSizeBytes: number;
  pointCount: number;
  totalDistanceM: number;
  elevationGainM: number | null;
  elevationLossM: number | null;
  minElevationM: number | null;
  maxElevationM: number | null;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  bounds: RouteBounds;
  geometry: GpxPoint[];
  plannedRunAt?: string | null;
  plannedRunTimezoneOffsetMinutes?: number | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}
