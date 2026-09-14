import { useMemo, useState } from "react";

interface RouteActionsPanelProps {
  recomputeHistoryEntryId: number | null;
  initialPlannedRunAt?: string | null;
}

function toLocalDatetimeInputValue(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

export default function RouteActionsPanel({
  recomputeHistoryEntryId,
  initialPlannedRunAt = null,
}: RouteActionsPanelProps) {
  const [plannedRunAt, setPlannedRunAt] = useState(toLocalDatetimeInputValue(initialPlannedRunAt));
  const plannedRunAtTimezoneOffsetMinutes = useMemo(() => {
    if (!plannedRunAt) {
      return "";
    }

    const localDate = new Date(plannedRunAt);
    if (Number.isNaN(localDate.getTime())) {
      return "";
    }

    return String(localDate.getTimezoneOffset());
  }, [plannedRunAt]);

  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-lg font-semibold text-white">Route actions</h2>
      <div className="grid gap-4">
        <div className="space-y-2">
          <label htmlFor="plannedRunAt" className="block text-sm font-medium text-white">
            Planned run start (date & time)
          </label>
          <input
            id="plannedRunAt"
            name="plannedRunAt"
            type="datetime-local"
            form="route-upload-form"
            value={plannedRunAt}
            onChange={(event) => {
              setPlannedRunAt(event.currentTarget.value);
            }}
            className="block w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            type="hidden"
            name="plannedRunAtTimezoneOffsetMinutes"
            form="route-upload-form"
            value={plannedRunAtTimezoneOffsetMinutes}
          />
          <p className="text-xs text-blue-100/70">Optional. Used for weather-aware estimation context.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a
            href="/profile"
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Edit profile
          </a>

          {recomputeHistoryEntryId !== null ? (
            <form method="POST" action="/api/estimations/history/recompute" className="w-full">
              <input type="hidden" name="historyEntryId" value={recomputeHistoryEntryId} />
              <input type="hidden" name="plannedRunAt" value={plannedRunAt} />
              <input type="hidden" name="plannedRunAtTimezoneOffsetMinutes" value={plannedRunAtTimezoneOffsetMinutes} />
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-500"
              >
                Recompute
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-blue-100/45"
            >
              Recompute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
