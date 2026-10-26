import { useEffect, useRef, useState } from "react";
import type { LabelInput } from "../types/label";
import { CSV_TEMPLATE, parseLabelCsv, type CsvRowError } from "../services/csvImport";
import { saveBlob } from "../services/download";
import { getSavedCsv, listSavedCsvs, saveCsv, type SavedCsv } from "../services/savedCsv";

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
  const [savedCsvs, setSavedCsvs] = useState<SavedCsv[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [fileBusy, setFileBusy] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const currentFile = useRef<{ name: string; content: string } | null>(null);
  const operationBusy = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function mergeSaved(items: SavedCsv[]) {
    setSavedCsvs((previous) => [...new Map([...previous, ...items].map((item) => [item.id, item])).values()]
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
  }

  useEffect(() => {
    let cancelled = false;
    listSavedCsvs().then((items) => {
      if (!cancelled) mergeSaved(items);
    }).catch((error) => {
      if (!cancelled) setStorageError(error instanceof Error ? error.message : "Unable to load saved CSVs.");
    }).finally(() => { if (!cancelled) setLibraryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function importContent(name: string, content: string) {
    onActivate?.();
    setFileName(name);
    setProgress("");
    const result = parseLabelCsv(content);
    setLabels(result.labels);
    setErrors(result.errors);
    if (result.labels.length > 0) onPreviewChange?.(result.labels[0]);
  }

  async function persistCurrentFile() {
    if (!currentFile.current) return;
    try {
      const { name, content } = currentFile.current;
      mergeSaved([await saveCsv(name, content)]);
      setSaveFailed(false);
      setStorageError("");
    } catch (error) {
      setSaveFailed(true);
      setStorageError(`CSV was loaded but could not be saved: ${error instanceof Error ? error.message : "Please try again."}`);
    }
  }

  async function loadFile(file: File) {
    if (operationBusy.current || loading) return;
    operationBusy.current = true;
    setFileBusy(true);
    setStorageError("");
    setSaveFailed(false);
    try {
      const content = await file.text();
      currentFile.current = { name: file.name, content };
      importContent(file.name, content);
      await persistCurrentFile();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Unable to read CSV.");
    } finally {
      operationBusy.current = false;
      setFileBusy(false);
    }
  }

  async function useSavedFile(id: string) {
    if (operationBusy.current || loading) return;
    operationBusy.current = true;
    setFileBusy(true);
    setStorageError("");
    setSaveFailed(false);
    try {
      const file = await getSavedCsv(id);
      currentFile.current = { name: file.name, content: file.content };
      importContent(file.name, file.content);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Unable to load saved CSV.");
    } finally {
      operationBusy.current = false;
      setFileBusy(false);
    }
  }

  async function retrySave() {
    if (operationBusy.current) return;
    operationBusy.current = true;
    setFileBusy(true);
    try { await persistCurrentFile(); }
    finally { operationBusy.current = false; setFileBusy(false); }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (labels.length === 0 || fileBusy || loading) return;
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
        <code>image</code>, <code>width</code>, <code>style</code>. Only the text columns are required.
        {" "}Set <code>style</code> to <code>glue-on</code> for flat labels without ears or holes,
        or <code>pred</code> for the original mounting design (default).
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
        onClick={() => { if (!fileBusy && !loading) inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          hidden
          disabled={fileBusy || loading}
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

      <button type="submit" disabled={loading || fileBusy || labels.length === 0}>
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

      <section className="saved-csvs" aria-labelledby="saved-csv-heading">
        <h3 id="saved-csv-heading">Saved CSVs</h3>
        <p className="panel-subtitle">Imported files are saved here automatically for reuse.</p>
        {libraryLoading ? <p role="status">Loading saved CSVs...</p> : null}
        {fileBusy ? <p role="status">Loading or saving CSV...</p> : null}
        {storageError ? <p className="error" role="alert">{storageError}</p> : null}
        {saveFailed ? <button type="button" className="link-button" disabled={fileBusy} onClick={() => void retrySave()}>Retry saving CSV</button> : null}
        {!libraryLoading && savedCsvs.length === 0 && !storageError ? <p className="panel-subtitle">No saved CSVs yet.</p> : null}
        <ul>
          {savedCsvs.map((file) => (
            <li key={file.id}>
              <div>
                <strong>{file.name}</strong>
                <time dateTime={file.savedAt}>{new Date(file.savedAt).toLocaleString()}</time>
              </div>
              <button type="button" disabled={fileBusy || loading} onClick={() => void useSavedFile(file.id)} aria-label={`Use ${file.name} again`}>Use again</button>
            </li>
          ))}
        </ul>
      </section>
    </form>
  );
}
