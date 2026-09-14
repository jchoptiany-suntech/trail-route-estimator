export interface ParsedPlannedRunAt {
  value: string | null;
  timezoneOffsetMinutes: number | null;
  error: string | null;
}

export function parseOptionalPlannedRunAt(formData: FormData): ParsedPlannedRunAt {
  const raw = formData.get("plannedRunAt");
  if (typeof raw !== "string" || raw.trim() === "") {
    return { value: null, timezoneOffsetMinutes: null, error: null };
  }

  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!localMatch) {
    return { value: null, timezoneOffsetMinutes: null, error: "Planned run start must be a valid date and time." };
  }

  const [_full, yearPart, monthPart, dayPart, hourPart, minutePart] = localMatch;
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);

  const offsetRaw = formData.get("plannedRunAtTimezoneOffsetMinutes");
  const offsetParsed = typeof offsetRaw === "string" ? Number.parseInt(offsetRaw, 10) : Number.NaN;
  if (!Number.isInteger(offsetParsed) || offsetParsed < -840 || offsetParsed > 840) {
    return {
      value: null,
      timezoneOffsetMinutes: null,
      error: "Planned run timezone metadata is invalid. Please pick the date again.",
    };
  }

  const utcTimestampMs = Date.UTC(year, month - 1, day, hour, minute) + offsetParsed * 60_000;
  const parsed = new Date(utcTimestampMs);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, timezoneOffsetMinutes: null, error: "Planned run start must be a valid date and time." };
  }

  return { value: parsed.toISOString(), timezoneOffsetMinutes: offsetParsed, error: null };
}
