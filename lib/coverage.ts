/** Pure geometry for the page gate: how much of a photo the detected boxes cover. */

export interface Box { left: number; top: number; width: number; height: number }

/** Share of the frame covered by the boxes, 0–1. Counted on a grid, so overlaps count once. */
export function coverageOf(boxes: Box[], imageWidth: number, imageHeight: number, grid = 64): number {
  if (imageWidth <= 0 || imageHeight <= 0 || boxes.length === 0) return 0;
  let covered = 0;
  for (let gy = 0; gy < grid; gy++) {
    const y = ((gy + 0.5) / grid) * imageHeight;
    for (let gx = 0; gx < grid; gx++) {
      const x = ((gx + 0.5) / grid) * imageWidth;
      if (boxes.some((b) => x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height)) {
        covered++;
      }
    }
  }
  return covered / (grid * grid);
}
