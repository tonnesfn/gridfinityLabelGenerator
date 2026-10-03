import { useRef, useState } from "react";
import type { LabelInput } from "../types/label";
import { CSV_TEMPLATE, parseLabelCsv, type CsvRowError } from "../services/csvImport";
import { saveBlob } from "../services/download";

interface CsvImportProps {
  onGenerate: (labels: LabelInput[], onProgress: (done: number, total: number) => void) => Promise<void>;
  onPreviewChange?: (label: LabelInput) => void;
  isActive?: boolean;
  onActivate?: () => void;
}

export function CsvImport({ onGenerate, onPreviewChange, isActive, onActivate }: CsvImportProps) {
  const [fileName, setFileName] = useState("");
  const [labels, setLabels] = useState<LabelInput[]>([]);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadFile(file: File) {
    onActivate?.();
    setFileName(file.name);
    setProgress("");
    const result = parseLabelCsv(await file.text());
    setLabels(result.labels);
    setErrors(result.errors);
    if (result.labels.length > 0) onPreviewChange?.(result.labels[0]);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (labels.length === 0) return;
    setLoading(true);
    setProgress(`Generating 0 / ${labels.length}...`);
    try {
      await onGenerate(labels, (done, total) => setProgress(`Generating ${done} / ${total}...`));
      setProgress(`Done, ${labels.length} label${labels.length === 1 ? "" : "s"} exported.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={`panel${isActive ? " panel-active" : ""}`}
      onSubmit={handleSubmit}
      onPointerDown={() => onActivate?.()}
    >
      <h2>Import from CSV</h2>
      <p className="panel-subtitle">
        One label per row. Columns: <code>line1</code>, <code>line2</code>, <code>icon</code>,{" "}
        <code>image</code>, <code>width</code>. Only the text columns are required.
      </p>

      <div
        className={`csv-drop${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void loadFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = ""; // allow re-selecting the same file after an edit
          }}
        />
        <span>{fileName || "Drop a .csv here, or click to choose one"}</span>
      </div>

      {labels.length > 0 ? (
        <p className="csv-summary">
          {labels.length} label{labels.length === 1 ? "" : "s"} ready
          {errors.length > 0 ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} skipped` : ""}.
        </p>
      ) : null}

      {errors.length > 0 ? (
        <ul className="csv-errors">
          {errors.slice(0, 8).map((e, i) => (
            <li key={i}>Row {e.row}: {e.message}</li>
          ))}
          {errors.length > 8 ? <li>...and {errors.length - 8} more.</li> : null}
        </ul>
      ) : null}

      {progress ? <p className="csv-summary">{progress}</p> : null}

      <button type="submit" disabled={loading || labels.length === 0}>
        {loading
          ? "Generating..."
          : labels.length > 0
            ? `Download ${labels.length} STL${labels.length === 1 ? "" : "s"}`
            : "Download STLs"}
      </button>

      <button
        type="button"
        className="link-button"
        onClick={() => saveBlob(new Blob([CSV_TEMPLATE], { type: "text/csv" }), "labels-template.csv")}
      >
        Download a template CSV
      </button>
    </form>
  );
}
