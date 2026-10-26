import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_BYTES = 2 * 1024 * 1024;
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        chunks.length = 0;
        reject(new HttpError(413, "CSV uploads must be smaller than 2 MB."));
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      if (size > MAX_BYTES) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new HttpError(400, "Invalid upload data.")); }
    });
    req.on("error", reject);
  });
}

export function createCsvServer(dataDir) {
  return createServer(async (req, res) => {
    const send = (status, value) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(value));
    };
    try {
      const pathname = new URL(req.url, "http://localhost").pathname;
      await mkdir(dataDir, { recursive: true });
      if (pathname === "/api/csvs" && req.method === "GET") {
        const files = (await readdir(dataDir)).filter((f) => /^[a-f0-9]{64}\.json$/.test(f));
        const records = await Promise.all(files.map(async (file) => {
          const { id, name, savedAt } = JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
          return { id, name, savedAt };
        }));
        send(200, records.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
      } else if (pathname === "/api/csvs" && req.method === "POST") {
        const input = await readBody(req);
        if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.length > 255 ||
            typeof input.content !== "string" || !input.content.trim() || input.content.includes("\0")) {
          throw new HttpError(400, "A filename and non-empty CSV content are required.");
        }
        const name = input.name.replace(/\\/g, "/").split("/").pop().trim();
        if (!name) throw new HttpError(400, "A filename is required.");
        const id = createHash("sha256").update(JSON.stringify([name, input.content])).digest("hex");
        const record = { id, name, content: input.content, savedAt: new Date().toISOString() };
        const temporary = path.join(dataDir, `${id}.${randomUUID()}.tmp`);
        await writeFile(temporary, JSON.stringify(record), { mode: 0o600 });
        await rename(temporary, path.join(dataDir, `${id}.json`));
        send(200, { id, name, savedAt: record.savedAt });
      } else if (/^\/api\/csvs\/[a-f0-9]{64}$/.test(pathname) && req.method === "GET") {
        const id = pathname.split("/").pop();
        send(200, JSON.parse(await readFile(path.join(dataDir, `${id}.json`), "utf8")));
      } else {
        send(404, { error: "Saved CSV not found." });
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : error.code === "ENOENT" ? 404 : 500;
      if (status === 500) console.error("Saved CSV request failed:", error);
      send(status, { error: status === 500 ? "Unable to access saved CSVs. Please try again." : status === 404 ? "Saved CSV not found." : error.message });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4000);
  createCsvServer(process.env.CSV_DATA_DIR || path.resolve("data/csvs")).listen(port, "0.0.0.0", () => {
    console.log(`Saved CSV server listening on port ${port}`);
  });
}
