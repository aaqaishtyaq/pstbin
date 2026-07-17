/**
 * Site branding & limits — override via environment variables.
 * NEXT_PUBLIC_* values are inlined at build time for the browser.
 *
 * Defaults match the reference instance (paste.aaqa.dev).
 */

import type { ServerConfig, SiteConfig } from "@/types";
import { envPositiveInt, envString, stripTrailingSlash } from "@/lib/env";

const defaultName = envString("NEXT_PUBLIC_SITE_NAME", "pstbin");

/** Public site config (safe for client bundles). */
export const siteConfig: SiteConfig = {
  name: defaultName,
  nameUpper: envString("NEXT_PUBLIC_SITE_NAME_UPPER", defaultName.toUpperCase()),
  title: envString("NEXT_PUBLIC_SITE_TITLE", "pstbin(1)"),
  description: envString(
    "NEXT_PUBLIC_SITE_DESCRIPTION",
    "Client-side pastebin. Data lives in the URL. curl POST supported — nothing stored on the server.",
  ),
  tagline: envString(
    "NEXT_PUBLIC_SITE_TAGLINE",
    "client-side pastebin. data lives in the URL.",
  ),
  repoUrl: envString("NEXT_PUBLIC_REPO_URL", "https://github.com/aaqaishtyaq/pstbin"),
  canonicalUrl: stripTrailingSlash(
    envString("NEXT_PUBLIC_CANONICAL_URL", "https://paste.aaqa.dev"),
  ),
};

/** Server-only limits & URL overrides. */
export const serverConfig: ServerConfig = {
  maxPasteBytes: envPositiveInt("PSTBIN_MAX_PASTE_BYTES", 1_500_000),
  publicUrl: (() => {
    const value = process.env.PSTBIN_PUBLIC_URL?.trim();
    return value ? stripTrailingSlash(value) : "";
  })(),
};
