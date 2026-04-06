/** Used for signup and resend-confirmation so the email link finishes auth on `/auth/callback` and lands on the dashboard. */
export function getEmailConfirmationRedirectTo(): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
}

/** Password recovery emails send users through `/auth/callback`, then to the page where they set a new password. */
export function getPasswordResetRedirectTo(): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
}
