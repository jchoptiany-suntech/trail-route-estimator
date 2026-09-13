import type { GpxPoint, RouteBounds } from "@/lib/route/types";

interface RouteMiniMapProps {
  geometry: GpxPoint[];
  bounds: RouteBounds;
}

function toPolylinePoints(geometry: GpxPoint[], bounds: RouteBounds, width: number, height: number): string {
  const padding = 12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.000001);

  return geometry
    .map((point) => {
      const x = padding + ((point.lng - bounds.minLng) / lngRange) * innerWidth;
      const y = padding + (1 - (point.lat - bounds.minLat) / latRange) * innerHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function toCirclePosition(point: GpxPoint, bounds: RouteBounds, width: number, height: number) {
  const padding = 12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.000001);

  return {
    cx: padding + ((point.lng - bounds.minLng) / lngRange) * innerWidth,
    cy: padding + (1 - (point.lat - bounds.minLat) / latRange) * innerHeight,
  };
}

export default function RouteMiniMap({ geometry, bounds }: RouteMiniMapProps) {
  if (geometry.length < 2) {
    return null;
  }

  const width = 320;
  const height = 200;
  const start = geometry[0];
  const end = geometry[geometry.length - 1];
  const polylinePoints = toPolylinePoints(geometry, bounds, width, height);
  const startPos = toCirclePosition(start, bounds, width, height);
  const endPos = toCirclePosition(end, bounds, width, height);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <p className="mb-2 text-xs tracking-wide text-blue-100/60 uppercase">Route preview</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full rounded-lg bg-slate-950/70">
        <polyline fill="none" stroke="#8B5CF6" strokeWidth="2.5" points={polylinePoints} />
        <circle cx={startPos.cx} cy={startPos.cy} r="4" fill="#22C55E" />
        <circle cx={endPos.cx} cy={endPos.cy} r="4" fill="#F97316" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-blue-100/70">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}
