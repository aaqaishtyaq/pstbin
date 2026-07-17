import { APP_ROUTES, type ParsedAppRoute } from "@/types";
import { isPasteFragment } from "@/lib/paste/fragment";
import { siteConfig } from "@/lib/site-config";

/** Parse location.hash into a typed app route. */
export function parseAppRoute(hash: string): ParsedAppRoute {
  const path = hash.replace(/^#/, "");
  if (!path || path === "/") {
    return { route: APP_ROUTES.home, fragment: "" };
  }
  if (path === "new" || path === "/new") {
    return { route: APP_ROUTES.new, fragment: "" };
  }
  if (isPasteFragment(hash)) {
    return { route: APP_ROUTES.view, fragment: hash };
  }
  return { route: APP_ROUTES.home, fragment: "" };
}

/**
 * Stable public origin for SSR + first client paint (must match for hydration).
 * Prefer env canonical URL so man-page text is consistent.
 */
export function canonicalSiteOrigin(): string {
  return siteConfig.canonicalUrl;
}

/** Live browser origin + path (client only). Falls back to canonical. */
export function siteBaseUrl(): string {
  if (typeof window === "undefined") {
    return `${canonicalSiteOrigin()}/`;
  }
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/$/, "");
  return `${origin}${path}/`.replace(/([^:]\/)\/+/g, "$1");
}

export function siteOrigin(): string {
  return siteBaseUrl().replace(/\/$/, "");
}

export function pasteUrlFromFragment(fragment: string): string {
  const clean = fragment.replace(/^#/, "");
  return `${siteOrigin()}/#${clean}`;
}

/** Subscribe helpers for useSyncExternalStore (location-derived values). */
export function subscribeLocation(onStoreChange: () => void): () => void {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

export function getClientHash(): string {
  return window.location.hash || "";
}

export function getServerHash(): string {
  // Hash is never available on the server; empty keeps home as SSR default.
  return "";
}

/**
 * Client snapshot of public origin. During hydration React uses
 * getServerSiteOrigin so SSR HTML matches the first client render.
 */
export function getClientSiteOrigin(): string {
  return siteOrigin();
}

export function getServerSiteOrigin(): string {
  return canonicalSiteOrigin();
}
