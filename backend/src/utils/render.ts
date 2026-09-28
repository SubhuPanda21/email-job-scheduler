/** Supports {{email}} personalisation; plain text bodies get line breaks preserved. */
export function renderBody(body: string, recipient: string): string {
  const withVars = body.replace(/{{\s*email\s*}}/gi, recipient);
  return /<[a-z][\s\S]*>/i.test(withVars) ? withVars : withVars.replace(/\n/g, "<br>");
}

/** One-line plain-text preview of an HTML body (used in list rows and for search indexing). */
export function htmlToPreview(html: string, max = 140): string {
  const text = html
    .replace(/<(br|\/p|\/div|\/li|\/blockquote)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
