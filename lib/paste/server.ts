import { deflateRawSync, inflateRawSync } from "node:zlib";
import { MODE_ZIP } from "@/types";
import {
  fragmentFromPayload,
  readFragmentPayload,
  selectPayload,
} from "@/lib/paste/codec";

/** Encode paste text into a URL fragment (Node). */
export function encodePasteServer(text: string): string {
  const raw = Buffer.from(text, "utf8");
  const compressed = deflateRawSync(raw);
  return fragmentFromPayload(
    selectPayload(new Uint8Array(raw), new Uint8Array(compressed)),
  );
}

/** Decode a URL fragment back to text (Node). */
export function decodePasteServer(fragment: string): string {
  const { mode, bytes } = readFragmentPayload(fragment);
  const plain =
    mode === MODE_ZIP ? inflateRawSync(Buffer.from(bytes)) : Buffer.from(bytes);
  return plain.toString("utf8");
}
