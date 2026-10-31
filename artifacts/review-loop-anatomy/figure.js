// The bench, drawn once with the kit. `staticSvg` is the whole picture at rest;
// the builders below it redraw only the parts that change shape as the loop runs.
import * as k from "./kit.js";
import { XW, XG, XR, SLOTS, BUGS } from "./model.js";

export const W = 600;
export const H = 400;
const AZ = 63;

// World units are about a pixel: x runs along the bench, y toward the front, z up.
const BENCH = { x: -160, y: -58, w: 320, d: 96, r: 6 };
const BODY = k.insetPlan(BENCH, 5);
const BODY_Z = -36;
const TOP_Z = -6;
const FOOT_Z = -42;
const FRONT = BODY.y + BODY.d; // the cabinet's front face, where REVIEW.md slides out

export const PLATE_TOP = 10;
export const TRAVEL = 12; // gauge head travel; pin tips stop on the plate
export const STROKE = 19; // writer die travel
export const LENS_UP = 47;
export const LENS_DOWN = 20; // its collar sits on the stop collar here, clear of the work
export const DRAWER_OUT = 34;
const DIE_BOTTOM = PLATE_TOP + STROKE;
const GLAND = 62;
const DIAL = [XG, -16];
const DIAL_R = 12;
const DIAL_TOP = 65;
const ZERO = ((AZ - 90) * Math.PI) / 180; // dial zero points straight up the screen
const REST = -100; // needle rest, degrees from zero, against its stop pin
const PER_UNIT = 30; // degrees of needle per unit a pin rides up
export const FAIL_FROM = 8;

// Lines stamped on the plate, like a diff: [y, x0, length], plate-local.
export const ROWS = [
  [-10.5, -14, 20],
  [-7.5, -11, 14],
  [-4.5, -11, 19],
  [3.5, -14, 9],
  [6.5, -11, 22],
  [9.5, -11, 12],
];
// Cards in the drawer, by distance behind its front plate.
export const CARDS = [
  { id: "truth", y: -30, tab: [-6, 6], tall: true },
  { id: "w1", y: -25, tab: [20, 32] },
  { id: "f1", y: -20, tab: [-32, -20], finding: true },
  { id: "f2", y: -15, tab: [-16, -4], finding: true },
  { id: "w2", y: -10, tab: [20, 32] },
];

export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, FOOT_Z, 0),
    [XW - 9, -4, 114],
    [XW + 9, -4, 114],
    [XR, -44, 110],
    [-44, FRONT + DRAWER_OUT + 6, -34],
  ],
  W,
  H,
  { pad: 22, azimuth: AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 28, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const dots = (points, z, style = { size: 0.45 }) => D(points.map(([x, y]) => at([x, y, z])), style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const part = (name, body, extra = "") => `<g data-part="${name}"${extra}>${body}</g>`;
const RAD = Math.PI / 180;

// A vertical coil spring around a vertical rod, split so the rod paints between its halves.
function helix(cx, cy, r, z0, z1, turns, perTurn = 20) {
  const [vx, vy] = k.towardViewer(P);
  const n = Math.max(2, Math.round(turns * perTurn));
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    const point = at([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + ((z1 - z0) * i) / n]);
    const facing = Math.cos(a) * vx + Math.sin(a) * vy > 0;
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(point);
      (near ? front : back).push(k.pathOf(run));
      run = [point];
      near = facing;
      continue;
    }
    run.push(point);
  }
  if (run.length > 1) (near ? front : back).push(k.pathOf(run));
  return { back: back.join(""), front: front.join("") };
}

// A closed slot in a vertical face: on the plane y = face (along x) or x = face (along y).
function slot(face, from, to, z, r, along = "x") {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    pts.push([to - r + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI;
    pts.push([from + r + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  return k.pathOf(pts.map(([u, zz]) => at(along === "x" ? [u, face, zz] : [face, u, zz])), true);
}

// A rectangle drawn on the vertical face y = face.
const faceRect = (face, x0, x1, z0, z1) => k.pathOf([at([x0, face, z0]), at([x1, face, z0]), at([x1, face, z1]), at([x0, face, z1])], true);

/* ---------- the bench ---------- */

function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BODY, FOOT_Z, 2, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BODY, 12))) {
    out.push(S(cyl(x, y, 6, FOOT_Z, 1.5, 28), { tone: "lo" }));
    out.push(S(cyl(x, y, 4.4, FOOT_Z + 1.5, BODY_Z - FOOT_Z - 1.5, 24), { tone: "mid" }));
  }
  // Cabinet: panel joints run edge to edge, the bench top covers their upper ends.
  const sideX = BODY.x + BODY.w;
  const sideSlots = [-28, -22, -16].map((z) => slot(sideX, -36, 16, z, 1.1, "y")).join("");
  const panelLines = [-60, 60].map((x) => k.segment([x, FRONT, BODY_Z], [x, FRONT, TOP_Z], P)).join("");
  const frontSlots = [-29, -24, -19, -14].map((z) => slot(FRONT, -138, -72, z, 1.1)).join("");
  out.push(
    S(slab(BODY, BODY_Z, TOP_Z - BODY_Z, 3), {
      tone: "mid",
      inner: L(panelLines, { tone: "faint" }) + L(frontSlots + sideSlots, { tone: "lo" }),
    }),
  );
  // The drawer's opening and the dark inside behind it.
  out.push(`<path class="rl-void" d="${faceRect(FRONT, -43, 43, -33, -13)}"/>`);
  out.push(L(faceRect(FRONT, -45.2, 45.2, -35, -11), { tone: "lo" }));
  // A maker's plate on the right-hand panel.
  const tag = { x: 84, y: FRONT, w: 44, d: 0.8, r: 0.4 };
  out.push(S(slab(tag, -29, 15, 2), { tone: "mid", crease: "none" }));
  const tagFace = FRONT + 0.8;
  out.push(L([[-18.5, 34], [-22, 26], [-25.5, 30]].map(([z, len]) => k.segment([tag.x + 4, tagFace, z], [tag.x + 4 + len, tagFace, z], P)).join(""), { tone: "lo", free: true }));
  out.push(dots([[tag.x + 2, tagFace], [tag.x + tag.w - 2, tagFace]], -15.6));
  // The bench top.
  out.push(S(slab(BENCH, TOP_Z, -TOP_Z, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(BENCH, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(dots(screws, 0, { size: 0.5 }));
  // A ruler along the front edge, with the three stations marked.
  const strip = { x: -140, y: 25, w: 280, d: 6, r: 1 };
  out.push(S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 5, strip.y, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L([XW, XG, XR].map((x) => k.lineOnTop([x, strip.y], [x, strip.y + strip.d], 0.6, P)).join(""), { tone: "hi" }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-15, 11]) {
    out.push(S(slab({ x: -146, y, w: 292, d: 4, r: 1 }, 0, 3, 3, 0.4), { tone: "mid" }));
    out.push(dots([-138, -69, 0, 69, 138].map((x) => [x, y + 2]), 3, { size: 0.4 }));
  }
  for (const x of [-152, 147]) {
    out.push(S(slab({ x, y: -20, w: 5, d: 40, r: 1.2 }, 0, 8, 3, 0.5), { tone: "mid" }));
    out.push(dots([[x + 2.5, -15], [x + 2.5, 15]], 8));
  }
  return out.join("");
}

/* ---------- the writer: a press, the only thing that touches the work ---------- */

function writerBack() {
  const base = { x: XW - 16, y: -56, w: 32, d: 24, r: 2 };
  const column = { x: XW - 8, y: -52, w: 16, d: 15, r: 1.5 };
  return [
    S(slab(base, 0, 6, 3, 0.6), { tone: "mid" }),
    dots(k.corners(base, 3), 6),
    S(slab(column, 6, 78, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(column, 44, P, 3), { tone: "faint" }) }),
    S(slab({ x: XW - 3, y: -37, w: 6, d: 1.2, r: 0.3 }, 10, 70, 2), { tone: "mid", crease: "none" }),
    D([at([XW, -35.8, 16]), at([XW, -35.8, 74])], { size: 0.45 }),
  ].join("");
}

function writerHead() {
  const housing = { x: XW - 9, y: -9, w: 18, d: 18, r: 2 };
  const arm = { x: XW - 11, y: -54, w: 22, d: 64, r: 3 };
  const box = { x: XW + 8.4, y: -8, w: 4.6, d: 8, r: 0.8 };
  return [
    `<g data-dyn="ram" data-part="die"></g>`,
    S(cyl(XW, 0, 4.6, GLAND, 4, 28), { tone: "mid" }),
    S(slab(housing, GLAND + 4, 84 - GLAND - 4, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(housing, 75, P, 4), { tone: "faint" }) }),
    S(slab(arm, 84, 11, 6, 0.8), { tone: "mid" }),
    dots([[XW - 6, -49], [XW + 6, -49], [XW - 6, 5], [XW + 6, 5]], 95),
    S(cyl(XW, -4, 9, 95, 16, 44, 0.6), { tone: "mid", inner: L([99, 102, 105, 108].map((z) => k.sideArc(XW, -4, 9, z, P, 24)).join(""), { tone: "faint" }) }),
    S(slab(box, 98, 8, 2, 0.4), { tone: "mid" }),
    dots([[box.x + box.w, -4]], 104, { size: 0.4 }),
    S(cyl(XW, -4, 6, 111, 3, 32), { tone: "mid" }),
    L(k.ring(XW, -4, 3.4, 114, P, 24), { tone: "lo" }),
    dots([[XW, -4]], 114, { size: 0.5 }),
  ].join("");
}

export function ramSvg(ram) {
  const dieZ = DIE_BOTTOM - STROKE * ram;
  const top = dieZ + 6;
  const die = { x: XW - 7, y: -7, w: 14, d: 14, r: 1.2 };
  const coil = helix(XW, 0, 4, top, GLAND, 6.5);
  return [
    S(slab(k.insetPlan(die, 1), dieZ, 1, 3), { tone: "hi", crease: "lo" }),
    S(slab(die, dieZ + 1, 5, 3, 0.5), { tone: "hi", crease: "lo" }),
    L(coil.back, { tone: "lo" }),
    S(cyl(XW, 0, 2.3, top, GLAND - top, 20), { tone: "hi", crease: "none" }),
    L(coil.front, { tone: "mid" }),
  ].join("");
}

/* ---------- the test gauge: one pin per test, and a dial that decides ---------- */

const GAUGE_COL = { x: XG - 8, y: -53, w: 16, d: 14, r: 1.5 };
const WHEEL = [XG, -46];

function gaugeBack() {
  const base = { x: XG - 16, y: -56, w: 32, d: 26, r: 2 };
  const cap = { x: XG - 10, y: -55, w: 20, d: 18, r: 2 };
  return [
    S(slab(base, 0, 7, 3, 0.6), { tone: "mid" }),
    dots(k.corners(base, 3), 7),
    S(slab(GAUGE_COL, 7, 89, 3, 0.5), { tone: "mid" }),
    S(slab({ x: XG - 4, y: -39, w: 8, d: 2, r: 0.4 }, 12, 82, 2, 0.3), { tone: "mid" }),
    S(slab(cap, 96, 3, 3, 0.5), { tone: "mid" }),
    S(cyl(WHEEL[0], WHEEL[1], 8, 99, 4, 48, 0.5), { tone: "mid" }),
    L(k.knurl(WHEEL[0], WHEEL[1], 8, 99, 103, 48, P, 0.6), { tone: "lo" }),
    S(cyl(WHEEL[0], WHEEL[1], 2.4, 103, 1.5, 20), { tone: "mid" }),
    `<g data-dyn="wheel"></g>`,
  ].join("");
}

export function wheelSvg(turn) {
  const a = turn * Math.PI * 2;
  const [cx, cy] = WHEEL;
  const kx = cx + 5.6 * Math.cos(a);
  const ky = cy + 5.6 * Math.sin(a);
  return [
    L(k.lineOnTop([cx + 2.4 * Math.cos(a), cy + 2.4 * Math.sin(a)], [cx + 7.4 * Math.cos(a), cy + 7.4 * Math.sin(a)], 103, P), { tone: "lo" }),
    S(cyl(kx, ky, 1.2, 103, 4.5, 14), { tone: "mid" }),
  ].join("");
}

// The head is built in its up position and slides down the column as one piece.
function gaugeHead() {
  const block = { x: XG - 9, y: -37, w: 18, d: 8, r: 1.2 };
  const arm = { x: XG - 5, y: -29.5, w: 10, d: 26.5, r: 1.2 };
  const neck = { x: XG - 6, y: -7.5, w: 12, d: 5, r: 1 };
  const housing = { x: XG - 18, y: -7, w: 36, d: 14, r: 2 };
  const shafts = SLOTS.map((sx, i) =>
    part(`pin${i + 1}`, S(cyl(XG + sx, 0, 0.9, 22, 1.6, 14), { tone: "hi", crease: "none" }) + S(cyl(XG + sx, 0, 1.5, 23.6, 36 - 23.6, 18), { tone: "hi", crease: "none" }), ` data-pin="${i}" data-bit="shaft"`),
  ).join("");
  const caps = SLOTS.map((sx, i) =>
    part(`pin${i + 1}`, S(cyl(XG + sx, 0, 2.2, 46, 2.6, 22), { tone: "hi", crease: "lo" }) + L(k.knurl(XG + sx, 0, 2.2, 46, 48.6, 16, P, 0.4), { tone: "lo" }), ` data-pin="${i}" data-bit="cap"`),
  ).join("");
  const holes = SLOTS.map((sx) => k.ring(XG + sx, 0, 2.9, 46, P, 24)).join("");
  const ticks = k.radialTicks(DIAL[0], DIAL[1], DIAL_R - 1.8, 32, 4, DIAL_TOP, [1.1, 2.1], P, ZERO + REST * RAD, 160 * RAD);
  const failArc = [];
  for (let i = 0; i <= 16; i++) {
    const a = ZERO + (FAIL_FROM + ((60 - FAIL_FROM) * i) / 16) * RAD;
    failArc.push([DIAL[0] + Math.sin(a) * (DIAL_R - 4.6), DIAL[1] - Math.cos(a) * (DIAL_R - 4.6)]);
  }
  const zeroTip = [DIAL[0] + Math.sin(ZERO) * (DIAL_R - 1.8), DIAL[1] - Math.cos(ZERO) * (DIAL_R - 1.8)];
  const zeroIn = [DIAL[0] + Math.sin(ZERO) * (DIAL_R - 5.2), DIAL[1] - Math.cos(ZERO) * (DIAL_R - 5.2)];
  const stopA = ZERO + (REST - 5) * RAD;
  return [
    S(slab(block, 44, 18, 3, 0.5), { tone: "mid" }),
    dots([[XG - 5, -33], [XG + 5, -33]], 62),
    shafts,
    S(slab(housing, 36, 10, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(housing, 41, P, 4), { tone: "faint" }) }),
    L(holes, { tone: "lo" }),
    dots([[XG - 15.5, -4.5], [XG + 15.5, -4.5], [XG - 15.5, 4.5], [XG + 15.5, 4.5]], 46),
    S(slab(neck, 46, 6, 2), { tone: "mid" }),
    S(slab(arm, 52, 6, 3, 0.5), { tone: "mid" }),
    S(cyl(DIAL[0], DIAL[1], 3.5, 58, 2, 20), { tone: "mid" }),
    part(
      "dial",
      [
        S(cyl(DIAL[0], DIAL[1], DIAL_R, 60, DIAL_TOP - 60, 64, 0.8), { tone: "hi", crease: "lo" }),
        L(k.knurl(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 2.6, DIAL_TOP, 72, P, 0.3), { tone: "lo" }),
        L(k.ring(DIAL[0], DIAL[1], DIAL_R - 1.8, DIAL_TOP, P, 64), { tone: "lo" }),
        L(ticks.minor, { tone: "lo" }),
        L(ticks.major, { tone: "mid" }),
        `<path class="rl-fail" d="${k.onTop(failArc, DIAL_TOP, P)}"/>`,
        L(k.lineOnTop(zeroIn, zeroTip, DIAL_TOP, P), { tone: "hi" }),
        dots([[DIAL[0] + Math.sin(stopA) * (DIAL_R - 4), DIAL[1] - Math.cos(stopA) * (DIAL_R - 4)]], DIAL_TOP, { size: 0.6, tone: "hi" }),
        L(k.ring(DIAL[0], DIAL[1], 1.4, DIAL_TOP, P, 16), { tone: "mid" }),
      ].join(""),
    ),
    caps,
  ].join("");
}

export function needleSvg(degrees) {
  const a = ZERO + degrees * RAD;
  const [x, y] = DIAL;
  const d = k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIAL_R - 2.4), y - Math.cos(a) * (DIAL_R - 2.4)], DIAL_TOP + 0.2, P);
  return `<path class="iso-line rl-needle" data-tone="hi" data-free="" d="${d}"/>`;
}
export const needleAngle = (probe, lift) => REST * (1 - probe) + PER_UNIT * lift;

/* ---------- the reviewer: a lamp and a lens on a stop, read-only ---------- */

const POST = [XR, -44];
const STOP_TOP = 16;
const TOP_COLLAR = 100;

function reviewerBack() {
  const [px, py] = POST;
  return [
    S(cyl(px, py, 13, 0, 4.5, 56, 0.6), { tone: "mid" }),
    dots([0, 90, 180, 270].map((d) => [px + 10.5 * Math.cos((d + 45) * RAD), py + 10.5 * Math.sin((d + 45) * RAD)]), 4.5),
    S(cyl(px, py, 8.5, 4.5, 2.5, 44), { tone: "mid" }),
    S(cyl(px, py, 3.4, 7, 4, 24), { tone: "mid", crease: "none" }),
    part(
      "stop",
      S(cyl(px, py, 5.8, 11, STOP_TOP - 11, 32, 0.4), { tone: "mid" }) +
        S(slab({ x: px + 5.2, y: py - 1.5, w: 4.2, d: 3, r: 0.8 }, 12, 3, 2), { tone: "mid" }),
    ),
    `<g data-dyn="post"></g>`,
    S(cyl(px, py, 5, TOP_COLLAR, 8, 32, 0.4), { tone: "mid" }),
    S(cyl(px, py, 3.8, TOP_COLLAR + 8, 1.6, 24), { tone: "mid" }),
  ].join("");
}

// The post between the stop collar and the sliding lens collar, then above it.
export function postSvg(lens) {
  const [px, py] = POST;
  const lz = LENS_UP + (LENS_DOWN - LENS_UP) * lens;
  const out = [];
  if (lz - 4 - STOP_TOP > 0.05) out.push(S(cyl(px, py, 3.4, STOP_TOP, lz - 4 - STOP_TOP, 24), { tone: "mid", crease: "none" }));
  out.push(
    part(
      "reviewer-collar",
      S(cyl(px, py, 5.4, lz - 4, 8, 32, 0.4), { tone: "mid" }) +
        S(slab({ x: px + 4.8, y: py - 1.5, w: 4.4, d: 3, r: 0.8 }, lz - 1.5, 3, 2), { tone: "mid" }),
    ),
  );
  out.push(S(cyl(px, py, 3.4, lz + 4, TOP_COLLAR - lz - 4, 24), { tone: "mid", crease: "none" }));
  return out.join("");
}

// The inside of a ring's far wall, between its top and bottom rims.
function farWall(cx, cy, r, z0, z1) {
  const [vx, vy] = k.towardViewer(P);
  const facing = Math.atan2(vy, vx);
  const top = [];
  const bottom = [];
  for (let i = 0; i <= 32; i++) {
    const a = facing + Math.PI / 2 + (i / 32) * Math.PI;
    top.push(at([cx + r * Math.cos(a), cy + r * Math.sin(a), z1]));
    bottom.push(at([cx + r * Math.cos(a), cy + r * Math.sin(a), z0]));
  }
  return k.pathOf([...top, ...bottom.reverse()], true);
}

// Built at the up position; slides down with its collar. The arm meets the rim
// below its top, and the rim is opaque, so only the glass shows what is under it.
function lensHead() {
  const lz = LENS_UP;
  const R = 12.5;
  const r = 11;
  const c = cyl(XR, 0, R, lz - 1.4, 2.8, 72, 0.4);
  const glint = [];
  for (let i = 0; i <= 10; i++) {
    const a = (200 + i * 6) * RAD;
    glint.push(at([XR + 8.4 * Math.cos(a), 8.4 * Math.sin(a), lz + 1.4]));
  }
  return [
    S(slab({ x: XR - 2.4, y: -39.2, w: 4.8, d: 27, r: 1 }, lz - 1.2, 2.2, 2, 0.3), { tone: "mid" }),
    part(
      "lens",
      [
        `<g class="iso-solid">`,
        `<path class="iso-shade" data-shade="1" d="${farWall(XR, 0, r, lz - 1.4, lz + 1.4)}"/>`,
        `<path class="rl-glass" d="${k.ring(XR, 0, r, lz + 1.4, P, 64)}"/>`,
        ...c.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")),
        `<path class="iso-top" fill-rule="evenodd" d="${k.ring(XR, 0, R, lz + 1.4, P, 72)}${k.ring(XR, 0, r, lz + 1.4, P, 64)}"/>`,
        `<path class="iso-line iso-crease" data-tone="lo" d="${c.crease}"/>`,
        L(k.ring(XR, 0, r, lz + 1.4, P, 64), { tone: "lo" }),
        `<path class="iso-line iso-edge" data-tone="hi" d="${c.outline}"/>`,
        `</g>`,
        k.fadeLineSvg(glint, { fade: [4, 4], tone: "hi" }),
      ].join(""),
    ),
  ].join("");
}

function lamp() {
  return [
    S(cyl(XR, -2, 10.5, 88, 2, 52, 0.4), { tone: "mid" }),
    S(cyl(XR, -2, 9.6, 90, 4, 48, 0.4), { tone: "mid", inner: L(k.sideArc(XR, -2, 9.6, 92, P, 28), { tone: "faint" }) }),
    S(cyl(XR, -2, 7.4, 94, 3.5, 40, 0.4), { tone: "mid" }),
    S(cyl(XR, -2, 4.2, 97.5, 4.5, 28), { tone: "mid" }),
    S(slab({ x: XR - 3, y: -39.5, w: 6, d: 40.5, r: 2 }, 102, 4, 3, 0.4), { tone: "mid" }),
    dots([[XR, -36], [XR, -2]], 106),
  ].join("");
}

/* ---------- the shuttle: carries the change from station to station ---------- */

const PLATE = { x: -17, y: -13, w: 34, d: 26, r: 1.2 };

function shuttle() {
  const carriage = { x: -24, y: -19, w: 48, d: 38, r: 3 };
  const caps = [
    { x: -23, y: -18, w: 5, d: 4.5, r: 1 },
    { x: 18, y: -18, w: 5, d: 4.5, r: 1 },
    { x: -23, y: 13.5, w: 5, d: 4.5, r: 1 },
    { x: 18, y: 13.5, w: 5, d: 4.5, r: 1 },
  ];
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(carriage, 3), 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(slab(carriage, 4, 4, 5, 0.6), { tone: "mid" }));
  out.push(dots([-14, -5, 5, 14].map((x) => [x, carriage.y + carriage.d - 2]), 8, { size: 0.4, tone: "lo" }));
  for (const cap of caps) {
    out.push(S(slab(cap, 8, 2.5, 2, 0.3), { tone: "mid" }));
    out.push(dots([[cap.x + cap.w / 2, cap.y + cap.d / 2]], 10.5, { size: 0.4 }));
  }
  for (const x of [-20.5, 17]) out.push(S(slab({ x, y: -4, w: 3.5, d: 8, r: 0.6 }, 8, 3, 2), { tone: "mid" }));
  // The handle, front right.
  out.push(S(slab({ x: 10, y: 19, w: 4, d: 3, r: 0.8 }, 5, 2, 2), { tone: "mid", crease: "none" }));
  out.push(S(cyl(12, 24, 2.6, 4, 4.5, 20), { tone: "mid" }));
  out.push(L(k.knurl(12, 24, 2.6, 4, 8.5, 18, P), { tone: "lo" }));
  // The change itself: a plate the press stamps lines into.
  out.push(
    part(
      "plate",
      S(slab(PLATE, 8, 2, 3, 0.4), { tone: "hi", crease: "lo" }) +
        ROWS.map(([y, x0, len], i) => `<g data-line="${i}" opacity="0">${L(k.lineOnTop([x0, y], [x0 + len, y], PLATE_TOP, P), { tone: "mid", free: true })}</g>`).join(""),
    ),
  );
  out.push(BUGS.map((_, i) => `<g data-dyn="bug${i + 1}" data-part="bug${i + 1}"></g>`).join(""));
  return out.join("");
}

export function bugSvg(i, h) {
  if (h < 0.05) return "";
  return S(cyl(BUGS[i], 0, 1.5, PLATE_TOP, h, 16), { tone: "mid", crease: "faint" });
}

/* ---------- REVIEW.md: a card drawer both of them read ---------- */

export function drawerSvg(open, cards) {
  const o = open * DRAWER_OUT;
  const yF = FRONT + o;
  const out = [];
  if (o > 0.4) {
    const span = { y: FRONT, d: o, r: 0 };
    out.push(S(slab({ x: -42, w: 84, ...span }, -34, 2, 1), { tone: "lo" }));
    out.push(S(slab({ x: -42, w: 2, ...span }, -32, 13, 1), { tone: "mid" }));
    for (const card of CARDS) {
      const a = cards[card.id] ?? 0;
      if (a < 0.02) continue;
      const y = yF + card.y;
      if (y < FRONT) continue;
      const lift = (1 - a) * 12;
      const top = card.tall ? -15 : -16.5;
      const body = S(slab({ x: -38, y, w: 76, d: 0.8, r: 0 }, -32 + lift, top + 32, 1), { tone: card.tall ? "mid" : "hi", crease: "none" });
      const tab = S(slab({ x: card.tab[0], y, w: card.tab[1] - card.tab[0], d: 0.8, r: 0 }, top + lift, (card.tall ? -13.4 : -14) - top, 1), { tone: card.tall ? "mid" : "hi", crease: "none" });
      out.push(`<g data-part="${card.id}"${a < 1 ? ` opacity="${a.toFixed(2)}"` : ""}>${body}${tab}</g>`);
    }
    out.push(S(slab({ x: 40, w: 2, ...span }, -32, 13, 1), { tone: "mid" }));
  }
  const front = { x: -44, y: yF, w: 88, d: 2.2, r: 0.8 };
  const face = yF + 2.2;
  const holder = { x: -14, y: face, w: 28, d: 0.7, r: 0.3 };
  out.push(S(slab(front, -34, 22, 3, 0.5), { tone: "mid" }));
  out.push(
    part(
      "label",
      S(slab(holder, -20.5, 7.5, 2), { tone: "mid", crease: "none" }) +
        k.faceTextSvg(k.sideMatrix([0, face + 0.7], -16.2, P, "left"), "REVIEW.md", { size: 3.3, tone: "hi", anchor: "middle" }) +
        dots([[-12.6, face + 0.7], [12.6, face + 0.7]], -14.6, { size: 0.4 }),
    ),
  );
  for (const x of [-12, 10]) out.push(S(slab({ x, y: face, w: 2, d: 2.6, r: 0.5 }, -27.4, 2.4, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: -12.6, y: face + 2.2, w: 25.2, d: 1.6, r: 0.8 }, -27.6, 2.8, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

/* ---------- the lamp's pool of light on the plate ---------- */

const pool = `<path class="rl-pool" data-dyn="pool" opacity="0" d="${k.ring(XR, 0, 15, PLATE_TOP + 0.1, P, 64)}"/>`;

/* ---------- assembly, back to front ---------- */

export const staticSvg = k.figureSvg({
  width: W,
  height: H,
  label:
    "A workbench that runs a review loop. A shuttle carries a plate, the change, along a rail between three stations: a press that writes, a test gauge with one spring pin per test and a dial, and a reviewer's lamp and magnifier on a stop collar that keeps it off the work. A card drawer in the bench front, engraved REVIEW.md, holds the notes both of them read.",
  body: [
    `<defs><radialGradient id="rl-pool-g"><stop offset="0" class="rl-pool-in"/><stop offset="1" class="rl-pool-out"/></radialGradient></defs>`,
    bench(),
    `<g data-dyn="drawer" data-part="drawer-box" data-station="drawer"></g>`,
    rails(),
    part("writer-back", writerBack(), ` data-station="writer"`),
    part("gauge-back", gaugeBack(), ` data-station="gauge"`),
    part("reviewer-back", reviewerBack(), ` data-station="reviewer"`),
    `<g data-dyn="shuttle" data-part="shuttle" data-station="shuttle">${shuttle()}</g>`,
    pool,
    part("writer-head", writerHead(), ` data-station="writer"`),
    `<g data-dyn="gauge" data-part="gauge-head" data-station="gauge">${gaugeHead()}<g data-dyn="needle" data-part="dial"></g></g>`,
    `<g data-dyn="lens" data-part="lens-head" data-station="reviewer">${lensHead()}</g>`,
    part("lamp", lamp(), ` data-station="reviewer"`),
  ],
});

export const move = (dx, dy, dz) => k.translateAlong(P, [dx, dy, dz]);
