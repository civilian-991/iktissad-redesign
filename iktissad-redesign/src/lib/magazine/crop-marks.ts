/**
 * Detects printer crop marks on a rendered magazine page.
 *
 * Print-ready PDFs often carry the bleed and crop marks inside the page box
 * (their TrimBox is wrong), so a straight render shows thin black ticks and a
 * strip of bleed around every page. The marks sit in the blank outer margin:
 * a vertical tick near each top/bottom corner and a horizontal tick near each
 * left/right corner, each pointing at the true trim line.
 *
 * We scan a few rows along the top and bottom edges and a few columns along
 * the left and right edges for a single short dark tick in an otherwise white
 * margin. Only when all four trim lines are found and agree do we return a
 * crop; any page with content running to the edge returns null and is left
 * untouched.
 */

export interface TrimRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pixels darker than this belong to a mark (or to page content). */
const INK = 200;
/** A mark's core must be at least this dark. */
const MARK_CORE = 128;
/** Widest a single tick may be, in px, including anti-aliasing. */
const MAX_TICK_WIDTH = 7;
/** How far into the page (fraction of the side) a corner tick may sit. */
const CORNER_ZONE = 0.12;
/** Outer rows/columns scanned for ticks. */
const SCAN_LINES = [1, 2, 3, 4, 5, 6];

type Sampler = (k: number) => number;

function lumaAt(data: Uint8ClampedArray, i: number) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

/** Position of the single tick in [from, to) on one scanline, or null. */
function findTick(sample: Sampler, from: number, to: number): number | null {
  let min = Infinity;
  let max = -Infinity;
  let darkest = 255;
  let sum = 0;
  let count = 0;
  for (let k = from; k < to; k++) {
    const v = sample(k);
    if (v < INK) {
      min = Math.min(min, k);
      max = Math.max(max, k);
      darkest = Math.min(darkest, v);
      sum += k;
      count++;
    }
  }
  if (count === 0 || max - min >= MAX_TICK_WIDTH || darkest > MARK_CORE) return null;
  return sum / count;
}

/** The tick position seen consistently across most scanlines, or null. */
function consensus(hits: (number | null)[]): number | null {
  const found = hits.filter((h): h is number => h !== null).sort((a, b) => a - b);
  if (found.length < Math.ceil(hits.length / 2)) return null;
  if (found[found.length - 1] - found[0] > 2) return null;
  return found[Math.floor(found.length / 2)];
}

export function detectCropMarks(
  data: Uint8ClampedArray,
  width: number,
  height: number
): TrimRect | null {
  const zoneX = Math.floor(width * CORNER_ZONE);
  const zoneY = Math.floor(height * CORNER_ZONE);
  const row = (y: number): Sampler => (x) => lumaAt(data, (y * width + x) * 4);
  const col = (x: number): Sampler => (y) => lumaAt(data, (y * width + x) * 4);

  // Vertical ticks in the top and bottom margins give the left/right trim.
  const left = consensus(SCAN_LINES.flatMap((d) => [
    findTick(row(d), 0, zoneX),
    findTick(row(height - 1 - d), 0, zoneX),
  ]));
  const right = consensus(SCAN_LINES.flatMap((d) => [
    findTick(row(d), width - zoneX, width),
    findTick(row(height - 1 - d), width - zoneX, width),
  ]));
  // Horizontal ticks in the left and right margins give the top/bottom trim.
  const top = consensus(SCAN_LINES.flatMap((d) => [
    findTick(col(d), 0, zoneY),
    findTick(col(width - 1 - d), 0, zoneY),
  ]));
  const bottom = consensus(SCAN_LINES.flatMap((d) => [
    findTick(col(d), height - zoneY, height),
    findTick(col(width - 1 - d), height - zoneY, height),
  ]));

  if (left === null || right === null || top === null || bottom === null) return null;

  const x = Math.round(left) + 1;
  const y = Math.round(top) + 1;
  const rect = {
    x,
    y,
    width: Math.round(right) - x,
    height: Math.round(bottom) - y,
  };
  // Never crop away more than a margin's worth of the page.
  if (rect.width < width * 0.8 || rect.height < height * 0.8) return null;
  return rect;
}
