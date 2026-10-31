// Runs the bench: one clock drives the model, the model drives the drawing.
import * as F from "./figure.js";
import * as M from "./model.js";

const root = document.querySelector("[data-figure]");
const stage = root.querySelector(".rl-stage");
stage.insertAdjacentHTML("afterbegin", F.staticSvg);
const svg = stage.querySelector("svg");
const readout = root.querySelector("[data-readout]");
const dyn = (name) => svg.querySelector(`[data-dyn="${name}"]`);
const ref = {
  drawer: dyn("drawer"),
  shuttle: dyn("shuttle"),
  gauge: dyn("gauge"),
  needle: dyn("needle"),
  wheel: dyn("wheel"),
  ram: dyn("ram"),
  lens: dyn("lens"),
  post: dyn("post"),
  pool: dyn("pool"),
  bugs: [dyn("bug1"), dyn("bug2")],
  lines: [...svg.querySelectorAll("[data-line]")],
  shafts: [...svg.querySelectorAll('[data-bit="shaft"]')],
  caps: [...svg.querySelectorAll('[data-bit="cap"]')],
};

const still = matchMedia("(prefers-reduced-motion: reduce)");
const seen = new Map();
const changed = (key, value) => {
  if (seen.get(key) === value) return false;
  seen.set(key, value);
  return true;
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const setAttr = (el, name, value) => {
  if (changed(el, `${name}:${value}`)) el.setAttribute(name, value);
};
const setHtml = (el, key, value, build) => {
  if (changed(key, value)) el.innerHTML = build();
};

let focus = null; // a station picked from the legend
let pinned = null;

function draw(t) {
  const v = M.poseAt(t);
  setAttr(ref.shuttle, "transform", F.move(r3(v.x), 0, 0));
  setHtml(ref.ram, "ram", r3(v.ram), () => F.ramSvg(v.ram));
  setAttr(ref.gauge, "transform", F.move(0, 0, r3(-F.TRAVEL * v.probe)));
  setHtml(ref.needle, "needle", r3(F.needleAngle(v.probe, v.lift)), () => F.needleSvg(F.needleAngle(v.probe, v.lift)));
  setHtml(ref.wheel, "wheel", r3(v.probe), () => F.wheelSvg(v.probe * 2.5));
  setAttr(ref.lens, "transform", F.move(0, 0, r3((F.LENS_DOWN - F.LENS_UP) * v.lens)));
  setHtml(ref.post, "post", r3(v.lens), () => F.postSvg(v.lens));
  setAttr(ref.pool, "opacity", r3(v.lamp));
  v.bugs.forEach((h, i) => setHtml(ref.bugs[i], `bug${i}`, r3(h), () => F.bugSvg(i, h)));
  ref.lines.forEach((el, i) => setAttr(el, "opacity", r3(M.clamp(v.lines - i))));
  v.pins.forEach((a, i) => {
    const lift = (1 - a) * 8 + v.rise[i];
    for (const el of [ref.shafts[i], ref.caps[i]]) {
      setAttr(el, "transform", F.move(0, 0, r3(lift)));
      setAttr(el, "opacity", a < 0.02 ? "0" : r3(a));
    }
  });
  const cards = { truth: 1, w1: v.w1, f1: v.f1, f2: v.f2, w2: v.w2 };
  setHtml(ref.drawer, "drawer", [v.drawer, v.w1, v.f1, v.f2, v.w2].map(r3).join(","), () => F.drawerSvg(v.drawer, cards));

  const lit = new Set(focus ? [] : M.litAt(t));
  v.found.forEach((f, i) => f > 0.5 && v.bugs[i] > 0.05 && lit.add(`bug${i + 1}`));
  for (const el of svg.querySelectorAll("[data-part]")) {
    const on = lit.has(el.dataset.part) || (focus !== null && el.dataset.station === focus);
    if (on !== el.hasAttribute("data-on")) el.toggleAttribute("data-on", on);
  }
  stage.toggleAttribute("data-focus", focus !== null);

  const words = M.wordsAt(t);
  if (readout.textContent !== words) readout.textContent = words;
  const p = M.phaseAt(t);
  if (changed("phase", p.id)) {
    stage.setAttribute("aria-valuenow", String(Math.max(1, p.step)));
    stage.setAttribute("aria-valuetext", words);
  }
}

/* ---------- the clock: a tour when idle, steps when tapped ---------- */

const LOOP = M.LOOP;
const wrap = (t) => ((t % LOOP) + LOOP) % LOOP;
const asked = Number.parseFloat(new URLSearchParams(location.search).get("t") ?? "");
let clock = Number.isFinite(asked) ? wrap(asked) : still.matches ? M.HOLDS[4] : 0;
let mode = still.matches || Number.isFinite(asked) ? "hold" : "tour";
let dir = 1;
let remaining = 0;
let frame = 0;
let last = 0;
let visible = false;
let idle = 0;

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (mode === "tour") clock = wrap(clock + dt);
  else if (mode === "seek") {
    const step = Math.min(remaining, dt * (dir > 0 ? 1.8 : 4));
    clock = wrap(clock + dir * step);
    remaining -= step;
    if (remaining <= 1e-6) mode = "hold";
  }
  draw(clock);
  frame = visible && mode !== "hold" ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible && mode !== "hold") {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

function quiet() {
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (still.matches) return;
    mode = "tour";
    run();
  }, 12000);
}

function seek(direction) {
  const holds = M.HOLDS;
  let to;
  if (direction > 0) {
    to = holds.find((h) => h > clock + 0.05) ?? holds[0] + LOOP;
    remaining = to - clock;
  } else {
    const back = [...holds].reverse().find((h) => h < clock - 0.05);
    to = back ?? holds[holds.length - 1] - LOOP;
    remaining = clock - to;
  }
  dir = direction;
  quiet();
  if (still.matches) {
    clock = wrap(to);
    mode = "hold";
    draw(clock);
    return;
  }
  mode = "seek";
  run();
}

function pause() {
  if (mode === "hold") {
    mode = "tour";
    clearTimeout(idle);
    run();
  } else {
    mode = "hold";
    quiet();
  }
}

stage.addEventListener("click", () => seek(1));
stage.addEventListener("keydown", (event) => {
  const keys = { ArrowRight: 1, ArrowDown: 1, Enter: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (event.key in keys) {
    event.preventDefault();
    seek(keys[event.key]);
  } else if (event.key === " ") {
    event.preventDefault();
    pause();
  } else if (event.key === "Home") {
    event.preventDefault();
    clock = 0;
    seek(1);
  }
});

/* ---------- the legend names the parts; pointing at one lights it ---------- */

const keys = [...root.querySelectorAll("[data-key]")];
function setFocus(name) {
  focus = name;
  keys.forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.key === pinned)));
  draw(clock);
}
for (const el of keys) {
  el.addEventListener("pointerenter", (event) => event.pointerType === "mouse" && setFocus(el.dataset.key));
  el.addEventListener("pointerleave", (event) => event.pointerType === "mouse" && setFocus(pinned));
  el.addEventListener("focus", () => setFocus(el.dataset.key));
  el.addEventListener("blur", () => setFocus(pinned));
  el.addEventListener("click", () => {
    pinned = pinned === el.dataset.key ? null : el.dataset.key;
    setFocus(pinned);
  });
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);
still.addEventListener?.("change", () => {
  if (still.matches) {
    mode = "hold";
    clearTimeout(idle);
  }
});
draw(clock);
