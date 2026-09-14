import { OPEN_METEO_BASE_URL, OPEN_METEO_TIMEOUT_MS, SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

export interface ConfigStatus {
  name: string;
  configured: boolean;
  message: string;
  docsUrl?: string;
  docsLabel?: string;
}

export const configStatuses: ConfigStatus[] = [
  {
    name: "Supabase",
    configured: Boolean(SUPABASE_URL && SUPABASE_KEY),
    message: "Supabase nie jest skonfigurowany — funkcje uwierzytelniania są wyłączone.",
    docsUrl: "https://github.com/przeprogramowani/10x-astro-starter#supabase-configuration",
    docsLabel: "Zobacz instrukcję konfiguracji",
  },
  {
    name: "Open-Meteo",
    configured: true,
    message:
      OPEN_METEO_BASE_URL || OPEN_METEO_TIMEOUT_MS
        ? "Open-Meteo używa niestandardowej konfiguracji środowiskowej."
        : "Open-Meteo używa domyślnej konfiguracji runtime.",
    docsUrl: "https://open-meteo.com/en/docs",
    docsLabel: "Dokumentacja Open-Meteo",
  },
];

export const missingConfigs = configStatuses.filter((s) => !s.configured);
