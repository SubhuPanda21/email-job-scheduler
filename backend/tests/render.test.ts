import { describe, it, expect } from "vitest";
import { sanitizeBody } from "../src/utils/sanitize";
import { htmlToPreview } from "../src/utils/render";

describe("sanitizeBody", () => {
  it("keeps formatting, strips scripts / handlers / js: links", () => {
    const out = sanitizeBody('<p onclick="x()">Hi <b>{{email}}</b><script>alert(1)</script><a href="javascript:alert(1)">x</a></p>');
    expect(out).toContain("<b>{{email}}</b>");
    expect(out).not.toMatch(/script|onclick|javascript:/i);
  });
});

describe("htmlToPreview", () => {
  it("flattens html and truncates", () => {
    expect(htmlToPreview("<p>Hello&nbsp;<b>world</b></p><p>bye</p>")).toBe("Hello world bye");
    expect(htmlToPreview("x".repeat(300), 10)).toHaveLength(10);
  });
});
