"use client";

import { useEffect, useState } from "react";
import { ManHeader } from "@/components/man/ManHeader";
import { copyToClipboard, errorMessage } from "@/lib/clipboard";
import { decodePasteClient } from "@/lib/paste/client";

export function ViewPaste({ fragment }: { fragment: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState("decoding…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const decoded = await decodePasteClient(fragment);
        if (cancelled) return;
        setText(decoded);
        setMeta(
          `${decoded.length} chars · ${fragment.length} hash chars · not stored on server`,
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setMeta("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fragment]);

  async function copyText(): Promise<void> {
    if (text == null) return;
    const ok = await copyToClipboard(text);
    if (ok) setMeta("text copied.");
    else setError("copy failed");
  }

  async function copyUrl(): Promise<void> {
    const ok = await copyToClipboard(window.location.href);
    if (ok) setMeta("url copied.");
    else setError("copy failed");
  }

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
            <button type="button" onClick={() => void copyText()}>
              copy text
            </button>
            <button type="button" onClick={() => void copyUrl()}>
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
