import { defineMiddleware } from "astro:middleware";
import { getProfileForUser, isProfileComplete } from "@/lib/profile/service";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard", "/profile"];
const PROFILE_REQUIRED_ROUTES = ["/dashboard"];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.profile = null;
  context.locals.profileComplete = false;

  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
    if (user) {
      const { data: profile } = await getProfileForUser(supabase, user.id);
      context.locals.profile = profile ?? null;
      context.locals.profileComplete = profile ? isProfileComplete(profile) && profile.status === "complete" : false;
    }
  } else {
    context.locals.user = null;
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  if (
    context.locals.user &&
    PROFILE_REQUIRED_ROUTES.some((route) => context.url.pathname.startsWith(route)) &&
    !context.locals.profileComplete
  ) {
    return context.redirect("/profile");
  }

  return next();
});
