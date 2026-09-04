import type { APIRoute } from "astro";
import { buildAuthErrorRedirect, createAuthFormError, mapAuthProviderError } from "@/lib/auth/error-mapping";
import { validateSignInForm } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const validation = validateSignInForm(form);
  if (!validation.ok) {
    return context.redirect(buildAuthErrorRedirect("/auth/signin", validation.error));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(buildAuthErrorRedirect("/auth/signin", createAuthFormError("supabase_not_configured")));
  }
  const { error } = await supabase.auth.signInWithPassword(validation.data);

  if (error) {
    return context.redirect(buildAuthErrorRedirect("/auth/signin", mapAuthProviderError(error)));
  }

  return context.redirect("/");
};
