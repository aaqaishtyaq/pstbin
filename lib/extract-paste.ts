/**
 * Pull paste text from a Request (multipart form, urlencoded, or raw body).
 * Supports curl styles:
 *   curl -F 'paste=<-'
 *   curl -F 'f:1=<-'          (ix.io habit)
 *   curl --data-binary @file
 *   curl -d 'hello'
 */

const FORM_KEYS = ["paste", "f:1", "file", "content", "text", "c"] as const;

export async function extractPasteBody(req: Request): Promise<string> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  // Multipart must go through formData() (boundary parsing).
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const key of FORM_KEYS) {
      const v = form.get(key);
      if (v == null) continue;
      if (typeof v === "string") return v;
      if (typeof Blob !== "undefined" && v instanceof Blob) return await v.text();
    }
    for (const [, v] of form.entries()) {
      if (typeof v === "string" && v.length > 0) return v;
      if (typeof Blob !== "undefined" && v instanceof Blob) {
        const t = await v.text();
        if (t.length > 0) return t;
      }
    }
    return "";
  }

  const raw = await req.text();
  if (!raw) return "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    // curl -d 'hello' sends urlencoded content-type but body may not be key=value.
    if (!raw.includes("=")) return raw;

    const params = new URLSearchParams(raw);
    for (const key of FORM_KEYS) {
      const v = params.get(key);
      if (v != null && v.length > 0) return v;
    }
    // e.g. paste=hello+world via -d 'paste=hello'
    for (const [, v] of params) {
      if (v.length > 0) return v;
    }
  }

  return raw;
}
