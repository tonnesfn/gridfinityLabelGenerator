import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCsvServer } from "../csv-server.mjs";

test("saved CSV API persists imports and safely reloads them", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "label-csv-test-"));
  let server;
  let base;
  async function start() {
    server = createCsvServer(dir).listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}/api/csvs`;
  }
  async function stop() {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  await start();
  const post = (name, content) => fetch(base, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, content }),
  });
  const content = "line1,line2,style\nM3,Screw,glue-on\n";
  let saved;

  await t.test("saves the original filename and content", async () => {
    assert.deepEqual(await (await fetch(base)).json(), []);
    const response = await post("screws.csv", content);
    assert.equal(response.status, 200);
    saved = await response.json();
    assert.equal(saved.name, "screws.csv");
    assert.match(saved.id, /^[a-f0-9]{64}$/);
    const read = await (await fetch(`${base}/${saved.id}`)).json();
    assert.equal(read.content, content);
    const list = await (await fetch(base)).json();
    assert.equal(list.length, 1);
    assert.equal(list[0].content, undefined);
  });

  await t.test("survives server restart", async () => {
    await stop();
    await start();
    assert.equal((await (await fetch(base)).json())[0].id, saved.id);
    assert.equal((await (await fetch(`${base}/${saved.id}`)).json()).content, content);
  });

  await t.test("deduplicates concurrent identical imports and keeps changed files", async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => post("screws.csv", content)));
    for (const response of responses) assert.equal(response.status, 200);
    assert.equal((await (await fetch(base)).json()).length, 1);
    await post("screws.csv", content.replace("M3", "M4"));
    assert.equal((await (await fetch(base)).json()).length, 2);
    assert.ok((await readdir(dir)).every((file) => /^[a-f0-9]{64}\.json$/.test(file)));
  });

  await t.test("rejects invalid and oversized uploads and missing files", async () => {
    assert.equal((await post("empty.csv", "")).status, 400);
    assert.equal((await post("empty.csv", null)).status, 400);
    assert.equal((await fetch(base, { method: "POST", body: "not JSON" })).status, 400);
    assert.equal((await post("huge.csv", "x".repeat(2 * 1024 * 1024))).status, 413);
    assert.equal((await fetch(`${base}/${"a".repeat(64)}`)).status, 404);
    assert.equal((await fetch(`${base}/not-an-id`)).status, 404);
    const response = await post("../../other.csv", content);
    assert.equal((await response.json()).name, "other.csv");
    assert.ok((await readdir(dir)).every((file) => /^[a-f0-9]{64}\.json$/.test(file)));
  });
});
