import type { APIRoute } from "astro";
import { createRouteUploadError, mapRouteUploadError } from "@/lib/route/error-mapping";
import { parseGpxSnapshotFromText, validateGpxFileMetadata } from "@/lib/route/gpx";
import { upsertRouteSnapshotForUser } from "@/lib/route/service";
import { createClient } from "@/lib/supabase";

function dashboardErrorRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("error", message);
  return `/dashboard?${params.toString()}`;
}

function dashboardSuccessRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("success", message);
  return `/dashboard?${params.toString()}`;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const error = createRouteUploadError("storage_failure");
    return context.redirect(dashboardErrorRedirect(error.message));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const maybeFile = form.get("gpxFile");

  if (!(maybeFile instanceof File)) {
    const error = createRouteUploadError("missing_file");
    return context.redirect(dashboardErrorRedirect(error.message));
  }

  try {
    validateGpxFileMetadata(maybeFile.name, maybeFile.type, maybeFile.size);
    const fileText = await maybeFile.text();
    const parsed = parseGpxSnapshotFromText(maybeFile.name, maybeFile.size, fileText);
    const { error } = await upsertRouteSnapshotForUser(supabase, user.id, parsed.snapshot);

    if (error) {
      const mapped = createRouteUploadError("storage_failure");
      return context.redirect(dashboardErrorRedirect(mapped.message));
    }
  } catch (error) {
    const mapped = mapRouteUploadError(error);
    return context.redirect(dashboardErrorRedirect(mapped.message));
  }

  return context.redirect(dashboardSuccessRedirect("GPX uploaded successfully."));
};
