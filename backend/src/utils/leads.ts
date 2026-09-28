import { parse } from "csv-parse/sync";

const EMAIL_REGEX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Extracts unique, valid, lower-cased email addresses from CSV or plain text. */
export function extractEmails(text: string): string[] {
  let cells: string[] = [];
  try {
    const records: string[][] = parse(text, { relax_column_count: true, skip_empty_lines: true });
    cells = records.flat();
  } catch {
    cells = text.split(/[\r\n,;]+/);
  }
  const valid = cells.map((c) => c.trim().toLowerCase()).filter((c) => EMAIL_REGEX.test(c));
  return [...new Set(valid)];
}
