"use client";

import { useSyncExternalStore } from "react";
import { manTitleLine } from "@/components/man/ManHeader";
import {
  getClientSiteOrigin,
  getServerSiteOrigin,
  subscribeLocation,
} from "@/lib/routing";
import { siteConfig } from "@/lib/site-config";

export function HomeView() {
  // Hydration-safe: server + first client paint use canonical URL;
  // after hydrate, live window.origin is used if it differs.
  const url = useSyncExternalStore(
    subscribeLocation,
    getClientSiteOrigin,
    getServerSiteOrigin,
  );
  const year = new Date().getFullYear();
  const { name, nameUpper, tagline, repoUrl } = siteConfig;
  const host = url;

  return (
    <>
      <pre>{`${manTitleLine()}

NAME
    ${name} — ${tagline}

SYNOPSIS
    # browser
    open ${url}/#new

    # curl (nothing stored — response is a self-contained URL)
    <command> | curl -sF 'paste=<-' ${host}

    # local helper (no network; encodes raw base64url)
    <command> | ./${name}

DESCRIPTION
    ${name} encodes paste contents into the URL fragment (the part after #).
    The server never keeps your data. Share the full URL; anyone with the
    link can read the paste in a browser.

    curl POST hits a stateless encoder: it compresses the body and returns
    a URL. That is not storage — close the tab and the only copy is the link.

    Encoding:
      #v1/r/<base64url>   raw UTF-8
      #v1/z/<base64url>   deflate-raw compressed UTF-8

    Browsers and chat apps limit URL length (often tens of KiB). Large
    pastes may fail to open in some clients.

OPTIONS
    (none)

EXAMPLES
    Create in browser:
      ${url}/#new

    Create with curl:
      $ echo hello | curl -sF 'paste=<-' ${host}
      ${url}/#v1/z/…

      $ cat notes.txt | curl -sF 'paste=<-' ${host}/api

    Create offline (raw only):
      $ cat notes.txt | ./${name}
      ${url}/#v1/r/…

    View:
      open the printed URL in any browser

SEE ALSO
    ${repoUrl}
    ix.io (RIP), 0x0.st, sprunge.us

                                ${nameUpper}                          ${year}
`}</pre>
      <div className="row">
        <a className="btn" href="#new">
          [new paste]
        </a>
      </div>
    </>
  );
}
