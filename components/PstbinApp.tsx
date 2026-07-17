"use client";

import { useMemo, useSyncExternalStore } from "react";
import { HomeView } from "@/components/man/HomeView";
import { NewView } from "@/components/man/NewView";
import { ViewPaste } from "@/components/man/ViewPaste";
import {
  getClientHash,
  getServerHash,
  parseAppRoute,
  subscribeLocation,
} from "@/lib/routing";
import { APP_ROUTES } from "@/types";

export function PstbinApp() {
  // Server snapshot is always ""; client re-reads after hydrate if hash present.
  const hash = useSyncExternalStore(
    subscribeLocation,
    getClientHash,
    getServerHash,
  );

  const { route, fragment } = useMemo(() => parseAppRoute(hash), [hash]);

  switch (route) {
    case APP_ROUTES.new:
      return <NewView />;
    case APP_ROUTES.view:
      return <ViewPaste fragment={fragment} />;
    case APP_ROUTES.home:
    default:
      return <HomeView />;
  }
}
