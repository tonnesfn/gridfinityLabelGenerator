import { Box3, ExtrudeGeometry, Shape } from "three";

// Remove the 1 mm mounting ear on each side, keeping the original content area.
// The 0.4 mm floor matches the original: two base layers at 0.2 mm, then text.
export function createGlueOnBase(bounds: Box3, extraWidth: number): ExtrudeGeometry {
  const x = bounds.min.x + 1;
  const y = bounds.min.y;
  const width = bounds.max.x - bounds.min.x - 2 + extraWidth;
  const height = bounds.max.y - bounds.min.y;
  const r = 0.9;
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.4,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.translate(0, 0, bounds.min.z);
  return geometry;
}
