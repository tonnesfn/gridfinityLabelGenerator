import { useState } from "react";
import { CsvImport } from "./components/CsvImport";
import { LabelForm } from "./components/LabelForm";
import { LabelPreview } from "./components/LabelPreview";
import { downloadBatch, downloadSingle } from "./services/api";
import { saveBlob } from "./services/download";
import type { LabelInput } from "./types/label";

function slugifyTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "label";
}

function buildBatchZipFileName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}_batchExport.zip`;
}

export function App() {
  const [error, setError] = useState("");
  const [previewLabel, setPreviewLabel] = useState<LabelInput | null>(null);
  const [activePanel, setActivePanel] = useState<"custom" | "csv">("custom");

  const handleCustom = async (input: LabelInput) => {
    setError("");
    const blob = await downloadSingle(input);
    saveBlob(blob, `${slugifyTitle(input.title)}.stl`);
  };

  const handleCsv = async (rows: LabelInput[], onProgress: (done: number, total: number) => void) => {
    setError("");
    try {
      const result = await downloadBatch(rows, onProgress);
      if (result.isZip) {
        saveBlob(result.blob, buildBatchZipFileName());
        return;
      }
      saveBlob(result.blob, `${slugifyTitle(rows[0].title)}.stl`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate labels from the CSV");
    }
  };

  return (
    <main className="app">
      <header>
        <h1>Gridfinity Label Generator (Beta)</h1>
      </header>

      <div className="info-box">
        <p>
          Labels are designed for{" "}
          <a href="https://www.printables.com/model/592545-gridfinity-bin-with-printable-label-by-pred-parame" target="_blank" rel="noopener noreferrer">
            the Gridfinity Bin with Printable Label by Pred
          </a>
          . Print at <strong>0.2 mm layer height</strong> with a{" "}
          <strong>color change in layer 3</strong> for best contrast.{" "}
          The <strong>Arachne wall generator</strong> is recommended for sharper detail.
        </p>
        <p className="info-beta">
          ⚠️ This is a <strong>beta</strong>. Found a bug or want a new feature?{" "}
          Open an issue on{" "}
          <a href="https://github.com/tonnesfn/gridfinityLabelGenerator/issues" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel preview-panel">
        <LabelPreview label={previewLabel} />
      </section>

      <div className="layout">
        <LabelForm onGenerate={handleCustom} onPreviewChange={setPreviewLabel} isActive={activePanel === "custom"} onActivate={() => setActivePanel("custom")} />
        <CsvImport onGenerate={handleCsv} onPreviewChange={setPreviewLabel} isActive={activePanel === "csv"} onActivate={() => setActivePanel("csv")} />
      </div>

      <footer className="attribution">
        <p>
          Based on the{" "}
          <a href="https://github.com/CNCKitchen/gridfinityLabelGenerator" target="_blank" rel="noopener noreferrer">
            Gridfinity Label Generator
          </a>{" "}
          by{" "}
          <a href="https://www.cnckitchen.com/" target="_blank" rel="noopener noreferrer">CNC Kitchen</a>.
          This is an independent fork.
        </p>
      </footer>
    </main>
  );
}
