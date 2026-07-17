/**
 * Pull paste text from a Request (multipart form, urlencoded, or raw body).
 * Supports curl styles:
 *   curl -F 'paste=<-'
 *   curl -F 'f:1=<-'          (ix.io habit)
 *   curl --data-binary @file
 *   curl -d 'hello'
 */

const FORM_KEYS = ["paste", "f:1", "file", "content", "text", "c"] as const;
type FormKey = (typeof FORM_KEYS)[number];

async function valueToText(value: FormDataEntryValue): Promise<string | null> {
  if (typeof value === "string") {
    return value.length > 0 ? value : null;
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    const text = await value.text();
    return text.length > 0 ? text : null;
  }
  return null;
}

async function firstFormValue(
  form: FormData,
  keys: readonly FormKey[],
): Promise<string | null> {
  for (const key of keys) {
    const value = form.get(key);
    if (value == null) continue;
    const text = await valueToText(value);
    if (text != null) return text;
  }
  return null;
}

async function anyFormValue(form: FormData): Promise<string | null> {
  for (const [, value] of form.entries()) {
    const text = await valueToText(value);
    if (text != null) return text;
  }
  return null;
}

function firstSearchParam(
  params: URLSearchParams,
  keys: readonly FormKey[],
): string | null {
  for (const key of keys) {
    const value = params.get(key);
    if (value != null && value.length > 0) return value;
  }
  for (const value of params.values()) {
    if (value.length > 0) return value;
  }
  return null;
}

export async function extractPasteBody(req: Request): Promise<string> {
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return (await firstFormValue(form, FORM_KEYS)) ?? (await anyFormValue(form)) ?? "";
  }

  const raw = await req.text();
  if (!raw) return "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    // curl -d 'hello' may send urlencoded content-type without key=value.
    if (!raw.includes("=")) return raw;
    return firstSearchParam(new URLSearchParams(raw), FORM_KEYS) ?? raw;
  }

  return raw;
}
