import { GpxParseError, type GpxParseErrorCode } from "@/lib/route/gpx";

const ROUTE_ERROR_MESSAGES: Record<GpxParseErrorCode | "unauthorized" | "storage_failure" | "unknown", string> = {
  missing_file: "Please select a GPX file.",
  invalid_extension: "Only .gpx files are supported.",
  invalid_mime_type: "This file type is not supported. Upload a GPX file.",
  file_too_large: "GPX file is too large. The limit is 5 MB.",
  invalid_text_payload: "We could not read this GPX file. Please try another file.",
  invalid_xml: "This GPX file has invalid XML structure.",
  missing_track_points: "The GPX file must include a track with at least two points.",
  invalid_point: "The GPX file contains invalid track point coordinates.",
  unauthorized: "You need to sign in to upload a route.",
  storage_failure: "Unable to save route data right now. Please try again.",
  unknown: "Something went wrong while processing your GPX file.",
};

export type RouteUploadErrorCode = keyof typeof ROUTE_ERROR_MESSAGES;

export interface RouteUploadError {
  code: RouteUploadErrorCode;
  message: string;
}

export function createRouteUploadError(code: RouteUploadErrorCode): RouteUploadError {
  return {
    code,
    message: ROUTE_ERROR_MESSAGES[code],
  };
}

export function mapRouteUploadError(error: unknown): RouteUploadError {
  if (error instanceof GpxParseError) {
    return createRouteUploadError(error.code);
  }
  return createRouteUploadError("unknown");
}

export function buildRouteUploadRedirect(path: string, error: RouteUploadError): string {
  const params = new URLSearchParams();
  params.set("errorCode", error.code);
  params.set("error", error.message);
  return `${path}?${params.toString()}`;
}
