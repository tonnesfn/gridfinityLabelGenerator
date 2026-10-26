import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Mesh, MeshBasicMaterial, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { createGlueOnBase } from "../src/services/labelBase.ts";

const file = readFileSync(new URL("../public/GridfinityBinLabel.stl", import.meta.url));
const original = new STLLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
original.computeBoundingBox();
const bounds = original.boundingBox;

for (const width of [1, 2, 3]) {
  test(`${width}× glue-on STL has a flat back, no ears, and no holes`, () => {
    const extraWidth = (width - 1) * 42;
    const base = createGlueOnBase(bounds, extraWidth);
    const stl = new STLExporter().parse(new Mesh(base, new MeshBasicMaterial()), { binary: true });
    const geometry = new STLLoader().parse(stl.buffer);
    geometry.computeBoundingBox();
    const actual = geometry.boundingBox;
    assert.ok(Math.abs(actual.min.x - (bounds.min.x + 1)) < 1e-5);
    assert.ok(Math.abs(actual.max.x - (bounds.max.x - 1 + extraWidth)) < 1e-5);
    assert.ok(Math.abs(actual.min.y - bounds.min.y) < 1e-5);
    assert.ok(Math.abs(actual.max.y - bounds.max.y) < 1e-5);
    assert.ok(Math.abs(actual.min.z - bounds.min.z) < 1e-5);
    assert.ok(Math.abs(actual.max.z) < 1e-5);

    // Welding STL vertices lets us check closed edges and Euler characteristic.
    // A solid plate has Euler characteristic 2; through-holes reduce it.
    const vertices = new Set();
    const edges = new Map();
    const pos = geometry.attributes.position;
    let volume = 0;
    for (let i = 0; i < pos.count; i += 3) {
      const points = [0, 1, 2].map((j) => [pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j)]);
      const keys = points.map((p) => p.map((n) => n.toFixed(5)).join(","));
      keys.forEach((key) => vertices.add(key));
      for (let j = 0; j < 3; j++) {
        const edge = [keys[j], keys[(j + 1) % 3]].sort().join("|");
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
      const [a, b, c] = points;
      volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      for (const p of points) {
        assert.ok(Math.abs(p[2] - actual.min.z) < 1e-5 || Math.abs(p[2] - actual.max.z) < 1e-5);
      }
    }
    for (const count of edges.values()) assert.equal(count, 2, "each edge joins exactly two triangles");
    assert.equal(vertices.size - edges.size + pos.count / 3, 2, "solid plate without through-holes");
    const size = actual.getSize(new Vector3());
    const rectangularVolume = size.x * size.y * size.z;
    assert.ok(volume > rectangularVolume * 0.99 && volume < rectangularVolume, "outward normals and solid rounded plate");
    geometry.dispose();
    base.dispose();
  });
}
