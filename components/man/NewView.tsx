"use client";

import { useState } from "react";
import { ManHeader } from "@/components/man/ManHeader";
import { copyToClipboard, errorMessage } from "@/lib/clipboard";
import { encodePasteClient } from "@/lib/paste/client";
import { pasteUrlFromFragment } from "@/lib/routing";

const LONG_URL_WARN = 8000;

export function NewView() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [statusErr, setStatusErr] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(): Promise<void> {
    if (!text) {
      setStatus("empty paste — nothing to encode.");
      setStatusErr(true);
      return;
    }

    setBusy(true);
    setStatus("encoding…");
    setStatusErr(false);

    try {
      const fragment = await encodePasteClient(text);
      const full = pasteUrlFromFragment(fragment);
      setUrl(full);
      const warn =
        full.length > LONG_URL_WARN ? " (long URL; some apps may truncate)" : "";
      setStatus(`ok — ${text.length} chars → ${full.length} URL chars${warn}`);
      history.replaceState(null, "", `#${fragment}`);
    } catch (error) {
      setStatus(`error: ${errorMessage(error)}`);
      setStatusErr(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl(): Promise<void> {
    const ok = await copyToClipboard(url);
    setStatus(ok ? "copied." : "copy failed — select the URL manually.");
    setStatusErr(!ok);
  }

  function openPaste(): void {
    const hash = url.split("#")[1] ?? "";
    window.location.hash = hash;
  }

  return (
    <>
      <ManHeader subtitle="create a new paste" />
      <div className="row">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="paste text here…"
          spellCheck={false}
          autoFocus
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              void create();
            }
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
            <button type="button" onClick={() => void copyUrl()}>
              copy url
            </button>
            <button type="button" onClick={openPaste}>
              open
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
