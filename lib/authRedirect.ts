/** Used for signup and resend-confirmation so the email link finishes auth on `/auth/callback` and lands on the dashboard. */
export function getEmailConfirmationRedirectTo(): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
}
