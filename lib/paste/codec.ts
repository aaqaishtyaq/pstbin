import { MODE_RAW, MODE_ZIP, type EncodedPayload, type PasteMode } from "@/types";
import { base64UrlToBytes, bytesToBase64Url } from "@/lib/bytes";
import { buildFragment, parseFragment } from "@/lib/paste/fragment";

/**
 * Prefer compressed payload when strictly smaller than raw.
 * Shared by browser (async) and Node (sync) encoders.
 */
export function selectPayload(
  raw: Uint8Array,
  compressed: Uint8Array | null,
): EncodedPayload {
  if (compressed != null && compressed.length < raw.length) {
    return { mode: MODE_ZIP, bytes: compressed };
  }
  return { mode: MODE_RAW, bytes: raw };
}

export function fragmentFromPayload(payload: EncodedPayload): string {
  return buildFragment(payload.mode, bytesToBase64Url(payload.bytes));
}

/** Decode fragment payload bytes; inflate handled by caller when mode is zip. */
export function readFragmentPayload(fragment: string): {
  mode: PasteMode;
  bytes: Uint8Array;
} {
  const { mode, payload } = parseFragment(fragment);
  return { mode, bytes: base64UrlToBytes(payload) };
}

export function textToUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function utf8ToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
