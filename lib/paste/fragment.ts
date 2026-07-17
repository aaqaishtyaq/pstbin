import {
  MODE_RAW,
  MODE_ZIP,
  PASTE_VERSION,
  type ParsedPasteFragment,
  type PasteMode,
} from "@/types";

export function isPasteMode(value: string): value is PasteMode {
  return value === MODE_RAW || value === MODE_ZIP;
}

export function isPasteFragment(fragment: string): boolean {
  const path = fragment.replace(/^#/, "");
  return path.startsWith(`${PASTE_VERSION}/`);
}

export function buildFragment(mode: PasteMode, base64url: string): string {
  return `${PASTE_VERSION}/${mode}/${base64url}`;
}

export function parseFragment(fragment: string): ParsedPasteFragment {
  const path = fragment.replace(/^#/, "");
  const parts = path.split("/");
  const version = parts[0];
  const mode = parts[1];

  if (parts.length < 3 || version !== PASTE_VERSION) {
    throw new Error("Unrecognized paste format");
  }
  if (!mode || !isPasteMode(mode)) {
    throw new Error(`Unknown encoding mode: ${mode ?? "(missing)"}`);
  }

  const payload = parts.slice(2).join("/");
  if (!payload) {
    throw new Error("Empty paste payload");
  }

  return { mode, payload };
}
