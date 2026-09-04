import type { APIRoute } from "astro";
import { buildAuthErrorRedirect, createAuthFormError, mapAuthProviderError } from "@/lib/auth/error-mapping";
import { validateSignUpForm } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const validation = validateSignUpForm(form);
  if (!validation.ok) {
    return context.redirect(buildAuthErrorRedirect("/auth/signup", validation.error));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(buildAuthErrorRedirect("/auth/signup", createAuthFormError("supabase_not_configured")));
  }
  const { error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return context.redirect(buildAuthErrorRedirect("/auth/signup", mapAuthProviderError(error)));
  }

  return context.redirect("/auth/confirm-email");
};
