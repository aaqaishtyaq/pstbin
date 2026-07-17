/** Public branding (safe for client bundles; NEXT_PUBLIC_*). */
export interface SiteConfig {
  readonly name: string;
  readonly nameUpper: string;
  readonly title: string;
  readonly description: string;
  readonly tagline: string;
  readonly repoUrl: string;
  /** Canonical origin without trailing slash. */
  readonly canonicalUrl: string;
}

/** Server-only limits and overrides. */
export interface ServerConfig {
  /** Max POST body size in UTF-8 bytes. */
  readonly maxPasteBytes: number;
  /**
   * Forced public origin for API URL responses (no trailing slash).
   * Empty string means derive from request headers.
   */
  readonly publicUrl: string;
}
