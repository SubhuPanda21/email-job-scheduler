import { describe, it, expect } from "vitest";
import { extractEmails } from "../src/utils/leads";
import { renderBody } from "../src/utils/render";

describe("extractEmails", () => {
  it("parses a header CSV, dedupes and drops invalid rows", () => {
    const csv = "name,email\nAna,ana@x.com\nBob,BOB@x.com\nDup,ana@x.com\nBad,not-an-email";
    expect(extractEmails(csv)).toEqual(["ana@x.com", "bob@x.com"]);
  });
  it("parses a newline separated text file", () => {
    expect(extractEmails("a@b.co\nc@d.io\n")).toEqual(["a@b.co", "c@d.io"]);
  });
});

describe("renderBody", () => {
  it("personalises and preserves line breaks", () => {
    expect(renderBody("Hi {{email}}\nBye", "z@z.com")).toBe("Hi z@z.com<br>Bye");
  });
});
