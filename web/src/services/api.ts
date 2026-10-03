import { zipSync } from "fflate";
import type { LabelInput } from "../types/label";
import { generateLabelStl } from "./labelGenerator";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "label";
}

export async function downloadSingle(label: LabelInput): Promise<Blob> {
  const stl = await generateLabelStl(label);
  return new Blob([stl], { type: "model/stl" });
}

export async function downloadBatch(
  labels: LabelInput[],
  onProgress?: (done: number, total: number) => void
): Promise<{ blob: Blob; isZip: boolean }> {
  if (labels.length === 1) {
    return { blob: await downloadSingle(labels[0]), isZip: false };
  }

  const files: Record<string, Uint8Array> = {};
  const used = new Map<string, number>();
  for (const label of labels) {
    if (onProgress) {
      // Hand the thread back so React can repaint the progress text; generating
      // a large batch otherwise locks the tab with no sign of life.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const stl = await generateLabelStl(label);
    // Two labels can slugify to the same name (easily so when rows come from a
    // CSV), and identical keys would silently drop all but the last one.
    const base = slugify(label.title);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    files[(seen === 0 ? base : `${base}-${seen + 1}`) + ".stl"] = new Uint8Array(stl);
    onProgress?.(Object.keys(files).length, labels.length);
  }
  const zipped = zipSync(files, { level: 9 });
  const zipBuf = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
  return { blob: new Blob([zipBuf], { type: "application/zip" }), isZip: true };
}
