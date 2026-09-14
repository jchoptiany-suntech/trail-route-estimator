import { OPEN_METEO_BASE_URL, OPEN_METEO_TIMEOUT_MS } from "astro:env/server";

interface WeatherAtTime {
  temperatureC: number;
  asOf: string;
}

const DEFAULT_OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_OPEN_METEO_TIMEOUT_MS = 3000;

function resolveOpenMeteoBaseUrl(): string {
  return OPEN_METEO_BASE_URL?.trim() ?? DEFAULT_OPEN_METEO_BASE_URL;
}

function resolveTimeoutMs(): number {
  if (!Number.isFinite(OPEN_METEO_TIMEOUT_MS) || OPEN_METEO_TIMEOUT_MS <= 0) {
    return DEFAULT_OPEN_METEO_TIMEOUT_MS;
  }

  return OPEN_METEO_TIMEOUT_MS;
}

function toUtcDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function toUtcHourIso(iso: string): string {
  return new Date(iso).toISOString().slice(0, 13) + ":00";
}

function resolveWeatherMultiplier(temperatureC: number): number {
  if (temperatureC < 3 || temperatureC > 24) {
    return 1.01;
  }

  if (temperatureC >= 8 && temperatureC <= 14) {
    return 0.99;
  }

  return 1;
}

function pickHourlyTemperature(times: string[], temperatures: number[], plannedRunAt: string): WeatherAtTime {
  const plannedHour = toUtcHourIso(plannedRunAt);
  const exactIndex = times.findIndex((time) => time.slice(0, 16) === plannedHour);
  const index = exactIndex >= 0 ? exactIndex : 0;
  const temperature = temperatures[index];
  const asOf = times[index];

  if (!Number.isFinite(temperature) || typeof asOf !== "string") {
    throw new Error("Open-Meteo response did not include usable hourly temperature data.");
  }

  return { temperatureC: temperature, asOf };
}

export async function fetchWeatherAtRunTime(
  latitude: number,
  longitude: number,
  plannedRunAt: string,
): Promise<{ temperatureC: number; globalTimeMultiplier: number; asOf: string }> {
  const date = toUtcDate(plannedRunAt);
  const url = new URL(resolveOpenMeteoBaseUrl());
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", "temperature_2m");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  url.searchParams.set("timezone", "UTC");

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, resolveTimeoutMs());

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      hourly?: { time?: string[]; temperature_2m?: number[] };
    };
    const times = payload.hourly?.time ?? [];
    const temperatures = payload.hourly?.temperature_2m ?? [];

    if (times.length === 0 || temperatures.length === 0 || times.length !== temperatures.length) {
      throw new Error("Open-Meteo response is missing hourly weather data.");
    }

    const resolved = pickHourlyTemperature(times, temperatures, plannedRunAt);
    return {
      temperatureC: resolved.temperatureC,
      globalTimeMultiplier: resolveWeatherMultiplier(resolved.temperatureC),
      asOf: resolved.asOf,
    };
  } finally {
    clearTimeout(timeout);
  }
}
