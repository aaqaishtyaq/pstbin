"use client";

import {
  MODE_RAW,
  MODE_ZIP,
  type PasteMode,
  buildFragment,
  bytesToBase64Url,
  base64UrlToBytes,
  parseFragment,
} from "./paste";

function asBlobPart(bytes: Uint8Array): BlobPart {
  // TS DOM typings: Uint8Array<ArrayBufferLike> vs ArrayBuffer-backed view
  return bytes as unknown as BlobPart;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([asBlobPart(bytes)])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream is not supported in this browser");
  }
  const stream = new Blob([asBlobPart(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodePasteClient(text: string): Promise<string> {
  const raw = new TextEncoder().encode(text);
  let mode: PasteMode = MODE_RAW;
  let payload: Uint8Array = raw;

  try {
    const zipped = await deflate(raw);
    if (zipped && zipped.length < raw.length) {
      mode = MODE_ZIP;
      payload = zipped;
    }
  } catch {
    // raw fallback
  }

  return buildFragment(mode, bytesToBase64Url(payload));
}

export async function decodePasteClient(fragment: string): Promise<string> {
  const { mode, payload } = parseFragment(fragment);
  let bytes = base64UrlToBytes(payload);
  if (mode === MODE_ZIP) {
    bytes = await inflate(bytes);
  }
  return new TextDecoder().decode(bytes);
}
