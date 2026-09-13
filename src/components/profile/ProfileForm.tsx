import React, { useState } from "react";
import { Activity, CircleCheck, Save, Weight } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";

interface ProfileFormProps {
  initialExperienceLevel?: string | null;
  initialWeightKg?: number | null;
  initialWeeklyDistanceKm?: number | null;
  status?: "draft" | "complete";
  serverError?: string | null;
  serverSuccess?: string | null;
}

interface FieldErrors {
  experienceLevel?: string;
  weightKg?: string;
  weeklyDistanceKm?: string;
}

function parseNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ProfileForm({
  initialExperienceLevel,
  initialWeightKg,
  initialWeeklyDistanceKm,
  status = "draft",
  serverError,
  serverSuccess,
}: ProfileFormProps) {
  const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel ?? "");
  const [weightKg, setWeightKg] = useState(initialWeightKg?.toString() ?? "");
  const [weeklyDistanceKm, setWeeklyDistanceKm] = useState(initialWeeklyDistanceKm?.toString() ?? "");
  const [action, setAction] = useState<"saveDraft" | "saveComplete">("saveDraft");
  const [errors, setErrors] = useState<FieldErrors>({});

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validateComplete(): boolean {
    const next: FieldErrors = {};
    if (!experienceLevel.trim()) {
      next.experienceLevel = "Experience level is required.";
    }

    const weight = parseNumber(weightKg);
    if (weight === null || weight <= 0) {
      next.weightKg = "Weight must be a positive number.";
    }

    const weeklyDistance = parseNumber(weeklyDistanceKm);
    if (weeklyDistance === null || weeklyDistance <= 0) {
      next.weeklyDistanceKm = "Weekly distance must be a positive number.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    if (action === "saveComplete" && !validateComplete()) {
      event.preventDefault();
    }
  }

  return (
    <form method="POST" action="/api/profile" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="action" value={action} />

      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-blue-100/70">
        Current status: <span className="font-semibold text-white">{status}</span>
      </div>

      <FormField
        id="experienceLevel"
        label="Experience level"
        value={experienceLevel}
        onChange={(value) => {
          setExperienceLevel(value);
          clearError("experienceLevel");
        }}
        placeholder="Beginner / Intermediate / Advanced"
        error={errors.experienceLevel}
        icon={<Activity className="size-4" />}
      />

      <FormField
        id="weightKg"
        type="number"
        label="Weight (kg)"
        value={weightKg}
        onChange={(value) => {
          setWeightKg(value);
          clearError("weightKg");
        }}
        placeholder="e.g. 72"
        error={errors.weightKg}
        icon={<Weight className="size-4" />}
      />

      <FormField
        id="weeklyDistanceKm"
        type="number"
        label="Weekly running distance (km)"
        value={weeklyDistanceKm}
        onChange={(value) => {
          setWeeklyDistanceKm(value);
          clearError("weeklyDistanceKm");
        }}
        placeholder="e.g. 35"
        error={errors.weeklyDistanceKm}
        icon={<Activity className="size-4" />}
      />

      {serverSuccess ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-300">
          <CircleCheck className="size-4 shrink-0" />
          {serverSuccess}
        </p>
      ) : null}
      <ServerError message={serverError} />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          onClick={() => {
            setAction("saveDraft");
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <Save className="size-4" />
          Save draft
        </button>

        <button
          type="submit"
          onClick={() => {
            setAction("saveComplete");
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          Complete profile
        </button>
      </div>
    </form>
  );
}
