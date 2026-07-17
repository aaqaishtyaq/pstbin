/** Client-side hash routes for the man-page UI. */
export const APP_ROUTES = {
  home: "home",
  new: "new",
  view: "view",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export interface ParsedAppRoute {
  readonly route: AppRoute;
  readonly fragment: string;
}
