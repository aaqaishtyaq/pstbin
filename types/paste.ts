/** Paste URL fragment encoding modes (v1). */
export const PASTE_VERSION = "v1" as const;
export const MODE_RAW = "r" as const;
export const MODE_ZIP = "z" as const;

export type PasteVersion = typeof PASTE_VERSION;
export type PasteMode = typeof MODE_RAW | typeof MODE_ZIP;

/** Parsed `#v1/{mode}/{payload}` fragment. */
export interface ParsedPasteFragment {
  readonly mode: PasteMode;
  readonly payload: string;
}

/** Result of choosing raw vs compressed payload. */
export interface EncodedPayload {
  readonly mode: PasteMode;
  readonly bytes: Uint8Array;
}

export type EncodeResult =
  | { readonly ok: true; readonly fragment: string }
  | { readonly ok: false; readonly error: string };

export type DecodeResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: string };
