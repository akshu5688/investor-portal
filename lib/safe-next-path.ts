export function getSafeNextPath(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== "string") {
    return "/dashboard";
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }
  if (trimmed.includes("\\") || trimmed.includes("://")) {
    return "/dashboard";
  }
  return trimmed;
}
