"use client";

import { MODE_ZIP } from "@/types";
import { asBlobPart } from "@/lib/bytes";
import {
  fragmentFromPayload,
  readFragmentPayload,
  selectPayload,
  textToUtf8,
  utf8ToText,
} from "@/lib/paste/codec";

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([asBlobPart(bytes)])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream is not supported in this browser");
  }
  const stream = new Blob([asBlobPart(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Encode paste text into a URL fragment (browser). */
export async function encodePasteClient(text: string): Promise<string> {
  const raw = textToUtf8(text);
  let compressed: Uint8Array | null = null;
  try {
    compressed = await deflateRaw(raw);
  } catch {
    compressed = null;
  }
  return fragmentFromPayload(selectPayload(raw, compressed));
}

/** Decode a URL fragment back to text (browser). */
export async function decodePasteClient(fragment: string): Promise<string> {
  const { mode, bytes } = readFragmentPayload(fragment);
  const plain = mode === MODE_ZIP ? await inflateRaw(bytes) : bytes;
  return utf8ToText(plain);
}
