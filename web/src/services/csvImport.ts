import type { LabelInput } from "../types/label";
import { findClipart, findLine2Image } from "../data/cliparts";

export interface CsvRowError {
  row: number; // 1-based line number in the file, so it matches a spreadsheet
  message: string;
}

export interface CsvParseResult {
  labels: LabelInput[];
  errors: CsvRowError[];
  columns: string[];
}

// Accepted header spellings. Headers are normalised (lowercased, non-alphanumerics
// stripped) before lookup, so "Line 1", "line_1" and "LINE1" all land on "line1".
const COLUMN_ALIASES: Record<string, string> = {
  line1: "line1",
  top: "line1",
  line2: "line2",
  bottom: "line2",
  icon: "icon",
  symbol: "icon",
  image: "image",
  line2image: "image",
  width: "width",
  labelwidth: "width",
  title: "title",
  filename: "title",
  icontext: "iconText",
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Excel exports with ';' in locales that use ',' as the decimal separator, so
// guess from whichever candidate appears most often in the header line.
function detectDelimiter(headerLine: string): string {
  const counts = [",", ";", "\t"].map((d) => ({
    d,
    n: headerLine.split(d).length - 1,
  }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

// Splits CSV text into rows of fields, honouring quoted fields that contain the
// delimiter, newlines, or doubled quotes ("" for a literal quote).
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  return rows;
}

function parseWidth(value: string): 1 | 2 | 3 | undefined {
  const n = Number(value.trim().replace(/x$/i, ""));
  return n === 1 || n === 2 || n === 3 ? n : undefined;
}

export function parseLabelCsv(text: string): CsvParseResult {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split("\n", 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = splitRows(clean, delimiter);

  const labels: LabelInput[] = [];
  const errors: CsvRowError[] = [];

  const headerRow = rows.find((r) => r.some((c) => c.trim() !== ""));
  if (!headerRow) {
    return { labels, errors: [{ row: 1, message: "File is empty." }], columns: [] };
  }

  const columns = headerRow.map((h) => COLUMN_ALIASES[normalizeHeader(h)] ?? "");
  if (!columns.includes("line1") && !columns.includes("line2")) {
    return {
      labels,
      errors: [{
        row: 1,
        message: `No "line1" or "line2" column found. Header was: ${headerRow.join(delimiter)}`,
      }],
      columns: [],
    };
  }

  const headerIndex = rows.indexOf(headerRow);
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cells = rows[i];
    const rowNumber = i + 1;
    if (cells.every((c) => c.trim() === "")) continue; // blank line

    const get = (name: string): string => {
      const at = columns.indexOf(name);
      return at === -1 ? "" : (cells[at] ?? "").trim();
    };

    const line1 = get("line1");
    const line2 = get("line2");
    const iconName = get("icon");
    const imageName = get("image");
    const widthRaw = get("width");
    const iconText = get("iconText");

    if (!line1 && !line2) {
      errors.push({ row: rowNumber, message: "Needs text in line1 or line2." });
      continue;
    }

    let iconSvg = "";
    let iconViewBox: string | undefined;
    if (iconName && normalizeHeader(iconName) !== "none") {
      const clip = findClipart(iconName);
      if (!clip) {
        errors.push({ row: rowNumber, message: `Unknown icon "${iconName}".` });
        continue;
      }
      iconSvg = clip.svg;
      iconViewBox = clip.viewBox;
    }

    let line2Svg: string | undefined;
    let line2ViewBox: string | undefined;
    if (imageName) {
      const img = findLine2Image(imageName);
      if (!img) {
        errors.push({ row: rowNumber, message: `Unknown line-2 image "${imageName}".` });
        continue;
      }
      line2Svg = img.svg;
      line2ViewBox = img.viewBox;
    }

    let labelWidth: 1 | 2 | 3 = 1;
    if (widthRaw) {
      const parsed = parseWidth(widthRaw);
      if (!parsed) {
        errors.push({ row: rowNumber, message: `Width must be 1, 2 or 3 (got "${widthRaw}").` });
        continue;
      }
      labelWidth = parsed;
    }

    // An image in the line-2 box replaces line-2 text, matching the custom form
    const effectiveLine2 = line2Svg ? "" : line2;
    const title = get("title") || [line1, effectiveLine2].filter(Boolean).join(" ") || line1;

    labels.push({
      title,
      line1,
      line2: effectiveLine2,
      iconSvg,
      iconViewBox,
      ...(iconText ? { iconText } : {}),
      line2Svg,
      line2ViewBox,
      labelWidth,
    });
  }

  if (labels.length === 0 && errors.length === 0) {
    errors.push({ row: 1, message: "No data rows found below the header." });
  }

  return { labels, errors, columns };
}

export const CSV_TEMPLATE = [
  "line1,line2,icon,image,width",
  "M3x10,Screw,torx,,1",
  "M3,Washer,washer,,1",
  "M3,Hex Nut,nut,,1",
  "M4x20,,pozidriv,cyl,1",
  "M5x30 Socket Cap,Screw,hex,,2",
].join("\n");
