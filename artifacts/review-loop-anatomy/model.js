// The loop as one timeline. Every pose the figure draws and every word the
// readout says come from here, so the drawing and the numbers can't disagree.
// The steps follow the playbook in artifacts/review-loop-doc/playbook.md.

export const XW = -100; // writer
export const XG = 0; // test gauge
export const XR = 100; // reviewer

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// A track holds a value that eases from key to key; keys never overlap.
class Track {
  constructor(start) {
    this.start = start;
    this.keys = [];
  }
  to(at, dur, value) {
    this.keys.push([at, dur, value]);
    return this;
  }
  at(t) {
    let v = this.start;
    for (const [at, dur, value] of this.keys) {
      if (t < at) break;
      v = t >= at + dur ? value : v + (value - v) * smoother((t - at) / dur);
    }
    return v;
  }
}

const tr = {
  x: new Track(XW), // shuttle position along the rail
  ram: new Track(0), // writer press stroke, 0 up, 1 on the plate
  probe: new Track(0), // gauge head, 0 up, 1 down on the plate
  lens: new Track(0), // reviewer lens, 0 up, 1 resting on its stop collar
  lamp: new Track(0),
  drawer: new Track(0), // REVIEW.md, 0 shut, 1 open
  lines: new Track(0), // diff lines stamped on the plate
  bug1: new Track(0), // the two failure cases, as burrs on the plate
  bug2: new Track(0),
  found1: new Track(0),
  found2: new Track(0),
  pin1: new Track(0), // the task's acceptance check
  pin2: new Track(0), // tests written from the failure cases
  pin3: new Track(0),
  w1: new Track(0), // cards in REVIEW.md: writer's notes and reviewer's findings
  f1: new Track(0),
  f2: new Track(0),
  w2: new Track(0),
};

export const PHASES = [];
let clock = 0;
function phase(spec, build) {
  build(clock);
  PHASES.push({ ...spec, from: clock, to: clock + spec.dur });
  clock += spec.dur;
}
const stamp = (at) => tr.ram.to(at, 0.35, 1).to(at + 0.45, 0.45, 0);
const travel = (at, to) => tr.x.to(at, 1.4, to);
const lower = (t, at) => t.to(at, 0.7, 1);
const raise = (t, at) => t.to(at, 0.55, 0);

phase({ id: "task", step: 1, dur: 2.4, hold: 1.6, lit: ["pin1"] }, (t) => {
  tr.pin1.to(t + 0.3, 0.9, 1);
});
phase({ id: "write", step: 2, dur: 3.4, hold: 3.2, lit: ["die"] }, (t) => {
  [0.3, 1.3, 2.3].forEach((s, i) => {
    stamp(t + s);
    tr.lines.to(t + s + 0.3, 0.2, [2, 3, 4][i]);
  });
  tr.bug1.to(t + 1.6, 0.2, 1);
  tr.bug2.to(t + 2.6, 0.2, 1);
});
phase({ id: "note", step: 2, dur: 2.2, hold: 1.45, lit: ["label", "w1"] }, (t) => {
  tr.drawer.to(t + 0.1, 0.6, 1);
  tr.w1.to(t + 0.8, 0.6, 1);
  tr.drawer.to(t + 1.6, 0.55, 0);
});
phase({ id: "check", step: 2, dur: 3.2, hold: 2.4, probeAt: 2.2, lit: ["dial", "pin1"] }, (t) => {
  travel(t, XG);
  lower(tr.probe, t + 1.5);
  raise(tr.probe, t + 2.6);
});
phase({ id: "review", step: 3, round: 1, dur: 5.0, hold: 4.2, lit: ["lens", "bug1", "bug2", "f1", "f2"] }, (t) => {
  travel(t, XR);
  lower(tr.lens, t + 1.4);
  tr.lamp.to(t + 1.4, 0.6, 1);
  tr.found1.to(t + 2.3, 0.4, 1);
  tr.found2.to(t + 2.6, 0.4, 1);
  tr.drawer.to(t + 2.6, 0.6, 1);
  tr.f1.to(t + 3.2, 0.55, 1);
  tr.f2.to(t + 3.6, 0.55, 1);
  tr.drawer.to(t + 4.3, 0.5, 0);
  raise(tr.lens, t + 4.3);
  tr.lamp.to(t + 4.3, 0.5, 0);
});
phase({ id: "tests", step: 4, round: 1, dur: 5.8, hold: 4.6, probeAt: 4.2, lit: ["pin2", "pin3", "f1", "f2"], litLate: [3.5, ["dial", "pin2", "pin3"]] }, (t) => {
  tr.drawer.to(t + 0.1, 0.55, 1);
  tr.pin2.to(t + 0.8, 0.8, 1);
  tr.pin3.to(t + 1.2, 0.8, 1);
  tr.drawer.to(t + 2.1, 0.5, 0);
  travel(t + 2.0, XG);
  lower(tr.probe, t + 3.5);
  raise(tr.probe, t + 5.2);
});
phase({ id: "fix", step: 4, round: 1, dur: 5.3, hold: 4.65, lit: ["die"], litLate: [3.4, ["label", "w2"]] }, (t) => {
  travel(t, XW);
  stamp(t + 1.6);
  stamp(t + 2.6);
  tr.lines.to(t + 1.9, 0.2, 5).to(t + 2.9, 0.2, 6);
  tr.bug1.to(t + 1.9, 0.15, 0);
  tr.found1.to(t + 1.9, 0.3, 0);
  tr.bug2.to(t + 2.9, 0.15, 0);
  tr.found2.to(t + 2.9, 0.3, 0);
  tr.drawer.to(t + 3.4, 0.55, 1);
  tr.w2.to(t + 4.0, 0.55, 1);
  tr.drawer.to(t + 4.75, 0.5, 0);
});
phase({ id: "recheck", step: 4, round: 1, dur: 3.6, hold: 2.5, probeAt: 2.2, lit: ["dial", "pin1", "pin2", "pin3"] }, (t) => {
  travel(t, XG);
  lower(tr.probe, t + 1.5);
  raise(tr.probe, t + 3.0);
});
phase({ id: "review2", step: 5, round: 2, dur: 4.4, hold: 2.9, lit: ["lens"] }, (t) => {
  travel(t, XR);
  lower(tr.lens, t + 1.4);
  tr.lamp.to(t + 1.4, 0.6, 1);
  tr.drawer.to(t + 2.3, 0.55, 1);
  tr.drawer.to(t + 3.4, 0.5, 0);
  raise(tr.lens, t + 3.5);
  tr.lamp.to(t + 3.5, 0.5, 0);
});
phase({ id: "human", step: 6, dur: 3.8, hold: 3.0, lit: ["plate", "pin2", "pin3"] }, (t) => {
  travel(t, XG);
});
phase({ id: "reset", step: 0, dur: 2.2, lit: [] }, (t) => {
  for (const name of ["pin1", "pin2", "pin3"]) tr[name].to(t + 0.2, 0.7, 0);
  for (const name of ["w1", "f1", "f2", "w2"]) tr[name].to(t + 0.2, 0.3, 0);
  tr.lines.to(t + 0.2, 0.8, 0);
  travel(t + 0.6, XW);
});

export const LOOP = clock;
export const HOLDS = PHASES.filter((p) => p.hold !== undefined).map((p) => p.from + p.hold);

export const phaseAt = (t) => PHASES.find((p) => t >= p.from && t < p.to) ?? PHASES[PHASES.length - 1];

// Plate-local x of the four pin slots on the gauge bar and of the two failure cases.
export const SLOTS = [-12, -4, 4, 12];
export const BUGS = [-4, 4];
export const BUG_H = 1.6;

export function poseAt(t) {
  const v = {};
  for (const [name, track] of Object.entries(tr)) v[name] = track.at(t);
  v.t = t;
  v.pins = [v.pin1, v.pin2, v.pin3, 0];
  v.bugs = [v.bug1 * BUG_H, v.bug2 * BUG_H];
  v.found = [v.found1, v.found2];
  // Each pin is spring-loaded: where a burr sits under it, it rides up by the burr's height.
  v.rise = v.pins.map((present, i) => {
    if (present < 0.5) return 0;
    const plateX = XG + SLOTS[i] - v.x;
    const j = BUGS.findIndex((b) => Math.abs(b - plateX) < 2.6);
    if (j < 0) return 0;
    return Math.max(0, v.bugs[j] - (1 - v.probe) * 12);
  });
  v.lift = Math.max(...v.rise);
  return v;
}

// The gauge result at the moment its head is fully down in this phase.
function resultOf(p) {
  const v = poseAt(p.from + p.probeAt);
  const tests = v.pins.filter((x) => x > 0.5).length;
  const failing = v.rise.filter((x) => x > 0.05).length;
  return { tests, pass: tests - failing };
}

export function wordsAt(t) {
  const p = phaseAt(t);
  const local = t - p.from;
  const v = poseAt(t);
  const cases = (v.f1 > 0.5 ? 1 : 0) + (v.f2 > 0.5 ? 1 : 0);
  switch (p.id) {
    case "task":
      return "step 1 · a task with a check";
    case "write":
      return "step 2 · writer implements";
    case "note":
      return "step 2 · notes it in REVIEW.md";
    case "check":
    case "recheck": {
      if (local < p.probeAt) return `step ${p.step} · running the tests`;
      const r = resultOf(p);
      return `step ${p.step} · tests ${r.pass}/${r.tests} pass`;
    }
    case "review":
      return cases ? `step 3 · round 1 · ${cases} failure case${cases > 1 ? "s" : ""}` : "step 3 · round 1 · reviewer reads";
    case "tests": {
      if (local < p.probeAt) return "step 4 · failure cases → tests";
      const r = resultOf(p);
      return `step 4 · tests ${r.pass}/${r.tests} pass`;
    }
    case "fix":
      return local < 3.4 ? "step 4 · writer fixes the code" : "step 4 · notes the fix";
    case "review2":
      return local < 2.3 ? "step 5 · round 2 · reviewer reads" : "step 5 · round 2 · nothing new";
    case "human":
      return "step 6 · a human reads diff + tests";
    default:
      return "next task";
  }
}

export function litAt(t) {
  const p = phaseAt(t);
  if (p.litLate && t - p.from >= p.litLate[0]) return p.litLate[1];
  return p.lit;
}

export const clamp = clamp01;
