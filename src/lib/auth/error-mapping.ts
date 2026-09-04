import type { AuthErrorCode, AuthFormError } from "@/lib/auth/validation";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  missing_email: "Email is required.",
  invalid_email: "Enter a valid email address.",
  missing_password: "Password is required.",
  weak_password: "Password is too short.",
  missing_confirm_password: "Please confirm your password.",
  password_mismatch: "Passwords do not match.",
  invalid_credentials: "Invalid email or password.",
  email_already_registered: "An account with this email already exists.",
  email_not_confirmed: "Please confirm your email before signing in.",
  supabase_not_configured: "Authentication is temporarily unavailable. Please try again later.",
  signup_disabled: "Sign up is currently disabled.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  unexpected_error: "Something went wrong. Please try again.",
};

function getUnknownErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

function mapCodeToMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code];
}

export function mapAuthProviderError(error: unknown): AuthFormError {
  const rawMessage = getUnknownErrorMessage(error).toLowerCase();

  if (rawMessage.includes("invalid login credentials")) {
    return { code: "invalid_credentials", message: mapCodeToMessage("invalid_credentials") };
  }

  if (rawMessage.includes("email not confirmed")) {
    return { code: "email_not_confirmed", message: mapCodeToMessage("email_not_confirmed") };
  }

  if (rawMessage.includes("user already registered") || rawMessage.includes("already registered")) {
    return { code: "email_already_registered", message: mapCodeToMessage("email_already_registered") };
  }

  if (rawMessage.includes("signup is disabled")) {
    return { code: "signup_disabled", message: mapCodeToMessage("signup_disabled") };
  }

  if (rawMessage.includes("rate limit")) {
    return { code: "rate_limited", message: mapCodeToMessage("rate_limited") };
  }

  return { code: "unexpected_error", message: mapCodeToMessage("unexpected_error") };
}

export function buildAuthErrorRedirect(path: string, error: AuthFormError): string {
  const params = new URLSearchParams();
  params.set("errorCode", error.code);
  params.set("error", error.message);
  return `${path}?${params.toString()}`;
}

export function getAuthErrorMessageFromParams(params: URLSearchParams): string | null {
  const explicitError = params.get("error");
  if (explicitError) {
    return explicitError;
  }

  const code = params.get("errorCode");
  if (!code) {
    return null;
  }

  if (!(code in AUTH_ERROR_MESSAGES)) {
    return mapCodeToMessage("unexpected_error");
  }

  return mapCodeToMessage(code as AuthErrorCode);
}

export function createAuthFormError(code: AuthErrorCode): AuthFormError {
  return {
    code,
    message: mapCodeToMessage(code),
  };
}
