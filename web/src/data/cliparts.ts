import hexSvg from "../assets/hex.svg?raw";
import insertSvg from "../assets/insert.svg?raw";
import lockwasherSvg from "../assets/lockwasher.svg?raw";
import nutSvg from "../assets/nut.svg?raw";
import squareNutSvg from "../assets/square_nut.svg?raw";
import nylockSvg from "../assets/nylock.svg?raw";
import phillipsSvg from "../assets/phillips.svg?raw";
import pozidrivSvg from "../assets/pozidriv.svg?raw";
import slotSvg from "../assets/slot.svg?raw";
import torxSvg from "../assets/torx.svg?raw";
import washerSvg from "../assets/washer.svg?raw";
import washerLargeSvg from "../assets/washer_large.svg?raw";
import tNutSvg from "../assets/tnut.svg?raw";
import rollInTNutSvg from "../assets/roll-in-tnut.svg?raw";
import robertsonSvg from "../assets/robertson.svg?raw";
import wingnutSvg from "../assets/wingnut.svg?raw";

import trpButtonHeadSvg from "../assets/TRP_ButtonHead.svg?raw";
import trpCountersunkSvg from "../assets/TRP_countersunkHead.svg?raw";
import trpCskSelfTapSvg from "../assets/TRP_countersunk_selfTapping.svg?raw";
import trpCylinderSvg from "../assets/TRP_cylinderHeadScrew.svg?raw";
import trpCylSelfTapSvg from "../assets/TRP_cylinderHead_selfTapping.svg?raw";
import trpGrubSvg from "../assets/TRP_grubscrew.svg?raw";
import trpHexagonSvg from "../assets/TRP_hexagonHead.svg?raw";
import trpLowHeadSvg from "../assets/TRP_lowHeadScrew.svg?raw";
import trpPanHeadSvg from "../assets/TRP_PanHead.svg?raw";
import trpPanSelfTapSvg from "../assets/TRP_panHead_selfTapping.svg?raw";

export interface Clipart {
  id: string;
  label: string;
  svg: string;
  viewBox: string;
}

export const CLIPARTS: Clipart[] = [
  { id: "hex",          label: "Hex",         svg: hexSvg,         viewBox: "299 276 111 111" },
  { id: "insert",       label: "Insert",      svg: insertSvg,      viewBox: "537 346 75 98"  },
  { id: "lockwasher",   label: "Lock Washer", svg: lockwasherSvg,  viewBox: "38 564 111 111" },
  { id: "nut",          label: "Nut",         svg: nutSvg,         viewBox: "307 549 137 120" },
  { id: "square_nut",   label: "Square nut",  svg: squareNutSvg,   viewBox: "-11 -11 130 130" },
  { id: "nylock",       label: "Nylock",      svg: nylockSvg,      viewBox: "477 549 137 120" },
  { id: "wingnut",      label: "Wingnut",     svg: wingnutSvg,     viewBox: "16 16 168 102" },
  { id: "phillips",     label: "Phillips",    svg: phillipsSvg,    viewBox: "81 51 112 112" },
  { id: "pozidriv",     label: "Pozidriv",    svg: pozidrivSvg,    viewBox: "81 51 112 112" },
  { id: "robertson",    label: "Robertson",   svg: robertsonSvg,   viewBox: "47 47 120 120" },
  { id: "slot",         label: "Slot",        svg: slotSvg,        viewBox: "35 125 125 113" },
  { id: "torx",         label: "Torx",        svg: torxSvg,        viewBox: "541 127 112 112" },
  { id: "washer",       label: "Washer",      svg: washerSvg,      viewBox: "38 280 112 112" },
  { id: "washer_large", label: "Washer L",    svg: washerLargeSvg, viewBox: "48 421 112 112" },
  { id: "t_nut",        label: "T-Nut",       svg: tNutSvg,        viewBox: "15 -35 80 120" },
  { id: "roll-in_t_nut",label: "Roll Nut",    svg: rollInTNutSvg,  viewBox: "-10 -10 100 170" },
];

// TRP screw-profile images for the line-2 box.
// viewBox crops each A4-canvas SVG (793x1122) to the actual drawing area.
export const LINE2_IMAGES: Clipart[] = [
  { id: "btn",     label: "Button Head",   svg: trpButtonHeadSvg,  viewBox: "25 1070 93 29"  },
  { id: "csk",     label: "Countersunk",   svg: trpCountersunkSvg, viewBox: "82 924 91 37"  },
  { id: "csk-st",  label: "Csk Self-Tap",  svg: trpCskSelfTapSvg,  viewBox: "136 255 98 38"  },
  { id: "cyl",     label: "Cylinder Head", svg: trpCylinderSvg,    viewBox: "19 1080 96 31"  },
  { id: "cyl-st",  label: "Cyl Self-Tap",  svg: trpCylSelfTapSvg,  viewBox: "133 400 103 35" },
  { id: "grub",    label: "Grub Screw",    svg: trpGrubSvg,        viewBox: "84 265 44 22"  },
  { id: "hex",     label: "Hex Head",      svg: trpHexagonSvg,     viewBox: "12 1000 93 33"  },
  { id: "low",     label: "Low Head",      svg: trpLowHeadSvg,     viewBox: "28 1042 93 32"  },
  { id: "pan",     label: "Pan Head",      svg: trpPanHeadSvg,     viewBox: "72 977 107 31"  },
  { id: "pan-st",  label: "Pan Self-Tap",  svg: trpPanSelfTapSvg,  viewBox: "134 329 97 33" },
];

// Lookup key for user-typed names: case and punctuation insensitive, so a CSV
// may say "washer_large", "Washer L" or "washer large" and all resolve.
function lookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildIndex(items: Clipart[]): Map<string, Clipart> {
  const index = new Map<string, Clipart>();
  for (const item of items) {
    // ids win over labels, so a label that collides never shadows a real id
    index.set(lookupKey(item.label), item);
  }
  for (const item of items) {
    index.set(lookupKey(item.id), item);
  }
  return index;
}

const CLIPART_INDEX = buildIndex(CLIPARTS);
const LINE2_INDEX = buildIndex(LINE2_IMAGES);

export function findClipart(name: string): Clipart | undefined {
  return CLIPART_INDEX.get(lookupKey(name));
}

export function findLine2Image(name: string): Clipart | undefined {
  return LINE2_INDEX.get(lookupKey(name));
}
