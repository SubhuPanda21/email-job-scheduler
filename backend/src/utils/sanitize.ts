import sanitizeHtml from "sanitize-html";

export function sanitizeBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["b","strong","i","em","u","s","strike","br","p","div","span","ul","ol","li","blockquote","a","font","h1","h2","h3","sub","sup"],
    allowedAttributes: { a: ["href", "target", "rel"], font: ["size"], "*": ["style"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        "margin-left": [/^\d+(px|em)$/],
        "padding-left": [/^\d+(px|em)$/],
      },
    },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
  }).trim();
}
