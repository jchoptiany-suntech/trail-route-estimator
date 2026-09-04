const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export type AuthErrorCode =
  | "missing_email"
  | "invalid_email"
  | "missing_password"
  | "weak_password"
  | "missing_confirm_password"
  | "password_mismatch"
  | "invalid_credentials"
  | "email_already_registered"
  | "email_not_confirmed"
  | "supabase_not_configured"
  | "signup_disabled"
  | "rate_limited"
  | "unexpected_error";

type AuthField = "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<AuthField, string>>;

export interface AuthFormError {
  code: AuthErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: AuthFormError };

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  confirmPassword: string;
}

function getStringValue(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function buildValidationError(fieldErrors: FieldErrors): AuthFormError {
  const firstMessage = Object.values(fieldErrors).find((value) => typeof value === "string");
  return {
    code: "unexpected_error",
    message: firstMessage ?? "Please correct the highlighted fields and try again.",
    fieldErrors,
  };
}

export function validateSignInForm(formData: FormData): ValidationResult<SignInInput> {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const fieldErrors: FieldErrors = {};

  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: buildValidationError(fieldErrors) };
  }

  return {
    ok: true,
    data: {
      email,
      password,
    },
  };
}

export function validateSignUpForm(formData: FormData): ValidationResult<SignUpInput> {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const confirmPassword = getStringValue(formData, "confirmPassword");
  const fieldErrors: FieldErrors = {};

  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: buildValidationError(fieldErrors) };
  }

  return {
    ok: true,
    data: {
      email,
      password,
      confirmPassword,
    },
  };
}
