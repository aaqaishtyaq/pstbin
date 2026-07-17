/** Read a non-empty env string, else fallback. */
export function envString(key: string, fallback: string): string {
  const value = process.env[key];
  return value != null && value.trim() !== "" ? value.trim() : fallback;
}

/** Positive integer env, else fallback. */
export function envPositiveInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Strip trailing slash from a URL/origin. */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}
