/**
 * Site branding & limits — override via environment variables.
 * NEXT_PUBLIC_* values are inlined at build time for the browser.
 *
 * Defaults match the reference instance (paste.aaqa.dev). Forks should
 * set these in .env / host dashboard (see .env.example).
 */

function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v != null && v.trim() !== "" ? v.trim() : fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v == null || v.trim() === "") return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Public site config (safe for client bundles). */
export const siteConfig = {
  /** Short name shown in man page headers, e.g. "pstbin" */
  name: env("NEXT_PUBLIC_SITE_NAME", "pstbin"),

  /** Uppercase man-page banner, e.g. "PSTBIN" */
  nameUpper: env(
    "NEXT_PUBLIC_SITE_NAME_UPPER",
    env("NEXT_PUBLIC_SITE_NAME", "pstbin").toUpperCase(),
  ),

  /** Document title */
  title: env("NEXT_PUBLIC_SITE_TITLE", "pstbin(1)"),

  /** <meta description> and one-line tagline */
  description: env(
    "NEXT_PUBLIC_SITE_DESCRIPTION",
    "Client-side pastebin. Data lives in the URL. curl POST supported — nothing stored on the server.",
  ),

  /** One-line NAME section blurb */
  tagline: env(
    "NEXT_PUBLIC_SITE_TAGLINE",
    "client-side pastebin. data lives in the URL.",
  ),

  /** Source / SEE ALSO link */
  repoUrl: env(
    "NEXT_PUBLIC_REPO_URL",
    "https://github.com/aaqaishtyaq/pstbin",
  ),

  /**
   * Canonical public origin (no trailing slash), e.g. https://paste.aaqa.dev
   * Used as a hint in docs; runtime UI uses window.location.
   * Server may use this for curl responses when PSTBIN_PUBLIC_URL is unset
   * and request Host is not trustworthy (optional).
   */
  canonicalUrl: env(
    "NEXT_PUBLIC_CANONICAL_URL",
    "https://paste.aaqa.dev",
  ).replace(/\/$/, ""),
} as const;

/** Server-only limits & URL overrides */
export const serverConfig = {
  /** Max paste body size for POST /api (bytes) */
  maxPasteBytes: envInt("PSTBIN_MAX_PASTE_BYTES", 1_500_000),

  /**
   * Force public origin in API responses (no trailing slash).
   * Useful behind reverse proxies. Falls back to request Host headers,
   * then NEXT_PUBLIC_CANONICAL_URL.
   */
  publicUrl: (() => {
    const v = process.env.PSTBIN_PUBLIC_URL?.trim();
    return v ? v.replace(/\/$/, "") : "";
  })(),
} as const;

export type SiteConfig = typeof siteConfig;
