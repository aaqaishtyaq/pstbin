import { deflateRawSync, inflateRawSync } from "zlib";
import {
  MODE_RAW,
  MODE_ZIP,
  type PasteMode,
  buildFragment,
  bytesToBase64Url,
  base64UrlToBytes,
  parseFragment,
} from "./paste";

/** Encode text into a URL fragment (prefer compressed when smaller). */
export function encodePasteServer(text: string): string {
  const raw = Buffer.from(text, "utf8");
  const zipped = deflateRawSync(raw);
  const useZip = zipped.length < raw.length;
  const payload = useZip ? zipped : raw;
  const mode: PasteMode = useZip ? MODE_ZIP : MODE_RAW;
  return buildFragment(mode, bytesToBase64Url(new Uint8Array(payload)));
}

/** Decode a URL fragment back to text (Node). */
export function decodePasteServer(fragment: string): string {
  const { mode, payload } = parseFragment(fragment);
  let bytes = Buffer.from(base64UrlToBytes(payload));
  if (mode === MODE_ZIP) {
    bytes = inflateRawSync(bytes);
  }
  return bytes.toString("utf8");
}
