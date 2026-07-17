"use client";

import { useCallback, useEffect, useState } from "react";
import { isPasteFragment } from "@/lib/paste";
import { decodePasteClient, encodePasteClient } from "@/lib/paste-client";
import { siteConfig } from "@/lib/site-config";

type Route = "home" | "new" | "view";

function baseUrl(): string {
  if (typeof window === "undefined") return "";
  return (
    window.location.origin +
    window.location.pathname.replace(/\/$/, "") +
    "/"
  ).replace(/([^:]\/)\/+/g, "$1");
}

function parseRoute(hash: string): { route: Route; fragment: string } {
  const path = hash.replace(/^#/, "");
  if (!path || path === "/") return { route: "home", fragment: "" };
  if (path === "new" || path === "/new") return { route: "new", fragment: "" };
  if (isPasteFragment(hash)) return { route: "view", fragment: hash };
  return { route: "home", fragment: "" };
}

export function PstbinApp() {
  const [route, setRoute] = useState<Route>("home");
  const [fragment, setFragment] = useState("");

  const sync = useCallback(() => {
    const { route: r, fragment: f } = parseRoute(window.location.hash || "");
    setRoute(r);
    setFragment(f);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [sync]);

  if (route === "new") return <NewView />;
  if (route === "view") return <ViewPaste fragment={fragment} />;
  return <HomeView />;
}

function manTitleLine(): string {
  const n = siteConfig.name;
  const u = siteConfig.nameUpper;
  // man(1)-style centered header
  return `${n}(1)                        ${u}                         ${n}(1)`;
}

function ManHeader({ subtitle }: { subtitle?: string }) {
  return (
    <pre>{`${manTitleLine()}

NAME
    ${siteConfig.name} — ${siteConfig.tagline}${subtitle ? `\n\n    ${subtitle}` : ""}
`}</pre>
  );
}

function HomeView() {
  const url = typeof window !== "undefined" ? baseUrl().replace(/\/$/, "") : "";
  const year = new Date().getFullYear();
  const name = siteConfig.name;
  const upper = siteConfig.nameUpper;
  const host = url || "$HOST";

  return (
    <>
      <pre>{`${manTitleLine()}

NAME
    ${name} — ${siteConfig.tagline}

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
    ${siteConfig.repoUrl}
    ix.io (RIP), 0x0.st, sprunge.us

                                ${upper}                          ${year}
`}</pre>
      <div className="row">
        <a className="btn" href="#new">
          [new paste]
        </a>
      </div>
    </>
  );
}

function NewView() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [statusErr, setStatusErr] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!text) {
      setStatus("empty paste — nothing to encode.");
      setStatusErr(true);
      return;
    }
    setBusy(true);
    setStatus("encoding…");
    setStatusErr(false);
    try {
      const frag = await encodePasteClient(text);
      const full = baseUrl().replace(/\/$/, "") + "/#" + frag;
      setUrl(full);
      setStatus(
        `ok — ${text.length} chars → ${full.length} URL chars` +
          (full.length > 8000 ? " (long URL; some apps may truncate)" : ""),
      );
      history.replaceState(null, "", "#" + frag);
    } catch (e) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
      setStatusErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ManHeader subtitle="create a new paste" />
      <div className="row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="paste text here…"
          spellCheck={false}
          autoFocus
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void create();
          }}
        />
      </div>
      <div className="row">
        <button type="button" onClick={() => void create()} disabled={busy}>
          create
        </button>
        <a className="btn" href="#">
          [home]
        </a>
      </div>
      {status ? (
        <div className={`row ${statusErr ? "err" : "meta"}`}>{status}</div>
      ) : null}
      {url ? (
        <div className="row">
          <div className="meta">share this URL (data is in the fragment):</div>
          <div id="url-out">{url}</div>
          <div className="row">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setStatus("copied.");
                  setStatusErr(false);
                } catch {
                  setStatus("copy failed — select the URL manually.");
                  setStatusErr(true);
                }
              }}
            >
              copy url
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = url.split("#")[1] || "";
              }}
            >
              open
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ViewPaste({ fragment }: { fragment: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState("decoding…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await decodePasteClient(fragment);
        if (cancelled) return;
        setText(t);
        setMeta(
          `${t.length} chars · ${fragment.length} hash chars · not stored on server`,
        );
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setMeta("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fragment]);

  return (
    <>
      <ManHeader subtitle="view paste" />
      {error ? (
        <div className="row err">error: {error}</div>
      ) : (
        <div className="row meta">{meta}</div>
      )}
      {text != null ? <div id="paste-view">{text}</div> : null}
      <div className="row">
        {text != null ? (
          <>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setMeta("text copied.");
                } catch {
                  setError("copy failed");
                }
              }}
            >
              copy text
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setMeta("url copied.");
                } catch {
                  setError("copy failed");
                }
              }}
            >
              copy url
            </button>
          </>
        ) : null}
        <a className="btn" href="#new">
          [new]
        </a>
        <a className="btn" href="#">
          [home]
        </a>
      </div>
    </>
  );
}
