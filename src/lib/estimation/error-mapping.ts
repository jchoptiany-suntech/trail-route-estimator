import { EstimationError, type EstimationErrorCode } from "@/lib/estimation/engine";

const ESTIMATION_ERROR_MESSAGES: Record<
  EstimationErrorCode | "missing_snapshot" | "storage_failure" | "history_storage_failure" | "unauthorized" | "unknown",
  string
> = {
  invalid_profile: "Your profile is incomplete for personalized estimation.",
  invalid_route: "Route data is not sufficient to compute an estimation.",
  missing_snapshot: "Upload a GPX route before running personalized estimation.",
  storage_failure: "Unable to save estimation right now. Please try again.",
  history_storage_failure: "Latest estimation was updated, but history could not be saved right now.",
  unauthorized: "You need to sign in to view personalized estimation.",
  unknown: "Something went wrong while calculating your personalized estimation.",
};

export type RouteEstimationErrorCode = keyof typeof ESTIMATION_ERROR_MESSAGES;

export interface RouteEstimationError {
  code: RouteEstimationErrorCode;
  message: string;
}

export function createRouteEstimationError(code: RouteEstimationErrorCode): RouteEstimationError {
  return {
    code,
    message: ESTIMATION_ERROR_MESSAGES[code],
  };
}

export function mapRouteEstimationError(error: unknown): RouteEstimationError {
  if (error instanceof EstimationError) {
    return createRouteEstimationError(error.code);
  }
  return createRouteEstimationError("unknown");
}
