import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { ServerError } from "@/components/auth/ServerError";

interface RouteUploadFormProps {
  serverError?: string | null;
  serverSuccess?: string | null;
  hasSnapshot?: boolean;
}

export default function RouteUploadForm({ serverError, serverSuccess, hasSnapshot = false }: RouteUploadFormProps) {
  const [plannedRunAt, setPlannedRunAt] = useState("");
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
    <form method="POST" action="/api/routes/upload" encType="multipart/form-data" className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-blue-100/75">
        Upload a GPX file to update your latest route context for analysis.
      </div>

      <div className="space-y-2">
        <label htmlFor="plannedRunAt" className="block text-sm font-medium text-white">
          Planned run start (date & time)
        </label>
        <input
          id="plannedRunAt"
          name="plannedRunAt"
          type="datetime-local"
          value={plannedRunAt}
          onChange={(event) => {
            setPlannedRunAt(event.currentTarget.value);
          }}
          className="block w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
        />
        <input type="hidden" name="plannedRunAtTimezoneOffsetMinutes" value={plannedRunAtTimezoneOffsetMinutes} />
        <p className="text-xs text-blue-100/70">Optional. Used for weather-aware estimation context.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="gpxFile" className="block text-sm font-medium text-white">
          GPX file
        </label>
        <input
          id="gpxFile"
          name="gpxFile"
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          required
          className="block w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-purple-600 file:px-3 file:py-1 file:text-white hover:file:bg-purple-500"
        />
        <p className="text-xs text-blue-100/70">Supported type: .gpx (max 5 MB)</p>
      </div>

      {serverSuccess ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-300">
          {serverSuccess}
        </p>
      ) : null}

      <ServerError message={serverError} />

      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-500"
      >
        <Upload className="size-4" />
        {hasSnapshot ? "Replace latest route" : "Upload route"}
      </button>
    </form>
  );
}
