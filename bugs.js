/* ADS (Abi Digital Solutions) — serangga lalu-lalang di latar kayu.
   Satu <canvas>, tanpa library/gambar. Berhenti otomatis saat tab tersembunyi / tidak ada serangga.
   Nonaktif otomatis: "reduce motion" & "hemat data". Matikan manual: CFG.enabled = false. */
(() => {
  "use strict";
  const CFG = {
    enabled: true,
    max: 4,            // maksimal serangga bersamaan di HP
    maxWide: 6,        // maksimal di layar lebar
    first: 1600,       // jeda (ms) setelah loading selesai sebelum serangga pertama
    gap: [3.5, 9],     // jeda antar kemunculan (detik)
    scare: true        // kabur saat disentuh / didekati kursor
  };
  if (!CFG.enabled) return;
  const doc = document, root = doc.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const nav = navigator;
  if ((nav.connection || {}).saveData) return;
  const lowEnd = (nav.deviceMemory && nav.deviceMemory <= 2) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2);

  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), r2 = a => rnd(a[0], a[1]);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const angd = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  /* ---------- jenis & parameter ---------- */
  // L: panjang (px) · v: kecepatan (px/dtk) · go/stop: durasi jalan/diam (dtk) · A: ayunan langkah · lw: tebal kaki
  const K = {
    ant:    { w: 50, nom: 18, L: [15, 20], v: [34, 58], go: [1.6, 5], stop: [.3, 1.1], A: .07, lw: .02, wob: .45, sway: .06,
              hip: [[.06, .04], [-.01, .045], [-.08, .04]], ft: [[.2, .2], [0, .26], [-.2, .24]] },
    beetle: { w: 20, nom: 26, L: [22, 28], v: [20, 32], go: [2, 5], stop: [.5, 1.6], A: .08, lw: .035, wob: .3, sway: .03,
              hip: [[.22, .12], [.02, .2], [-.2, .18]], ft: [[.34, .3], [.06, .38], [-.3, .34]] },
    lady:   { w: 15, nom: 16, L: [14, 17], v: [14, 24], go: [1.5, 4], stop: [.8, 2.4], A: .05, lw: .03, wob: .35, sway: .02,
              hip: [[.18, .14], [0, .2], [-.18, .18]], ft: [[.26, .3], [.04, .33], [-.28, .29]] },
    fly:    { w: 15, nom: 16, L: [14, 18], v: [90, 150], go: [.25, .6], stop: [.7, 2.4], A: .06, lw: .014, wob: .9, sway: .0,
              hip: [[.12, .06], [.04, .08], [-.04, .07]], ft: [[.3, .2], [.08, .27], [-.22, .24]] }
  };
  const KEYS = Object.keys(K), WSUM = KEYS.reduce((s, k) => s + K[k].w, 0);
  const pick = () => { let x = Math.random() * WSUM; for (const k of KEYS) { x -= K[k].w; if (x <= 0) return k; } return "ant"; };

  /* ---------- palet (ikut tema) ---------- */
  const PAL = {
    dark: {
      ant: [["#d08a4a", "#8e4d22", "#43200d"], "#9a6a40"],
      beetle: [["#a06a3c", "#58311a", "#24130a"], "#8a5d38"],
      bronze: [["#8fa760", "#3f5a2a", "#16230f"], "#7f8f58"],
      lady: [["#ff6a4a", "#d8281c", "#7a0f0a"], "#8a6a55"],
      fly: [["#9aa0a6", "#585c61", "#25272a"], "#8c8f93"]
    },
    light: {
      ant: [["#9a5a2a", "#4e250e", "#1c0b04"], "#2a1409"],
      beetle: [["#6e4a2e", "#33200f", "#120a05"], "#24140a"],
      bronze: [["#6f8a42", "#2e4520", "#101a0b"], "#1d2a12"],
      lady: [["#ff6a4a", "#cf2418", "#6e0c08"], "#1a0e0a"],
      fly: [["#7d838a", "#3e4247", "#17181a"], "#1c1d1f"]
    }
  };
  let theme = root.dataset.theme === "light" ? "light" : "dark";

  /* ---------- sprite badan (digambar sekali, di-cache) ---------- */
  const ell = (c, x, y, rx, ry, f, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); c.fillStyle = f; c.fill(); };
  const gl = (c, x, y, rx, ry, p) => {               // elips mengilap
    const g = c.createRadialGradient(x - rx * .32, y - ry * .4, 0, x - rx * .1, y - ry * .1, Math.max(rx, ry) * 1.25);
    g.addColorStop(0, p[0]); g.addColorStop(.5, p[1]); g.addColorStop(1, p[2]);
    ell(c, x, y, rx, ry, g); c.lineWidth = .012; c.strokeStyle = "rgba(0,0,0,.35)"; c.stroke();
  };
  const spec = (c, x, y, rx, ry, a, rot) => ell(c, x, y, rx, ry, "rgba(255,244,225," + a + ")", rot);

  const BODY = {
    ant(c, p) {
      gl(c, -.30, 0, .20, .145, p); spec(c, -.35, -.06, .08, .03, .3, -.2);
      ell(c, -.12, 0, .035, .03, p[1]);
      gl(c, -.01, 0, .135, .075, p); spec(c, -.04, -.03, .06, .02, .28);
      gl(c, .17, 0, .095, .085, p);
      ell(c, .20, -.062, .022, .018, "rgba(10,6,3,.85)"); ell(c, .20, .062, .022, .018, "rgba(10,6,3,.85)");
      c.fillStyle = p[2]; c.beginPath();                // rahang
      c.moveTo(.25, -.03); c.lineTo(.31, -.055); c.lineTo(.27, -.01); c.moveTo(.25, .03); c.lineTo(.31, .055); c.lineTo(.27, .01); c.fill();
    },
    beetle(c, p) {
      gl(c, -.1, 0, .37, .27, p);
      c.beginPath(); c.moveTo(-.46, 0); c.lineTo(.2, 0); c.lineWidth = .014; c.strokeStyle = "rgba(0,0,0,.5)"; c.stroke();
      spec(c, -.14, -.12, .17, .05, .38, -.12); spec(c, -.22, .12, .1, .03, .16, .1);
      gl(c, .24, 0, .12, .2, p); spec(c, .21, -.08, .06, .025, .3);
      gl(c, .4, 0, .075, .1, p);
    },
    lady(c, p) {
      gl(c, -.06, 0, .34, .33, p);
      c.beginPath(); c.moveTo(-.4, 0); c.lineTo(.26, 0); c.lineWidth = .014; c.strokeStyle = "rgba(20,0,0,.7)"; c.stroke();
      c.fillStyle = "#140a08";
      [[.08, .17, .055], [-.12, .2, .06], [-.26, .08, .05]].forEach(s => { [-1, 1].forEach(m => { c.beginPath(); c.arc(s[0], s[1] * m, s[2], 0, TAU); c.fill(); }); });
      spec(c, -.12, -.17, .14, .05, .4, -.5);
      ell(c, .27, 0, .105, .2, "#e9e4d6"); ell(c, .265, 0, .09, .175, "#161210");
      ell(c, .33, 0, .06, .12, "#161210"); ell(c, .36, -.07, .03, .04, "#eee"); ell(c, .36, .07, .03, .04, "#eee");
    },
    fly(c, p) {
      gl(c, -.22, 0, .2, .13, p); ell(c, -.2, 0, .012, .12, "rgba(255,255,255,.1)"); ell(c, -.31, 0, .012, .1, "rgba(255,255,255,.1)");
      gl(c, .05, 0, .15, .12, p); spec(c, .03, -.05, .08, .025, .25);
      gl(c, .24, 0, .085, .09, p);
      [-1, 1].forEach(s => { const g = c.createRadialGradient(.265, s * .06, 0, .265, s * .06, .07); g.addColorStop(0, "#d23a3a"); g.addColorStop(1, "#6a0f10"); ell(c, .265, s * .066, .055, .062, g); });
      [-1, 1].forEach(s => {                             // sayap tembus pandang
        c.save(); c.translate(.06, s * .07); c.rotate(Math.PI - s * .24);
        ell(c, .2, 0, .23, .08, "rgba(225,235,245,.26)"); c.lineWidth = .008; c.strokeStyle = "rgba(255,255,255,.5)"; c.stroke();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(.4, 0); c.lineWidth = .006; c.strokeStyle = "rgba(255,255,255,.35)"; c.stroke(); c.restore();
      });
    }
  };

  let dpr = 1, vw = 0, vh = 0, cv, ctx;
  const cache = {};
  const sprite = (kind, variant) => {
    const key = kind + variant + theme + dpr;
    if (cache[key]) return cache[key];
    const T = K[kind], pal = PAL[theme][variant][0], s = T.nom * dpr;
    const mk = () => { const c = doc.createElement("canvas"); c.width = Math.ceil(1.5 * s); c.height = Math.ceil(s); return c; };
    const a = mk(), c = a.getContext("2d");
    c.setTransform(s, 0, 0, s, a.width / 2, a.height / 2); BODY[kind](c, pal);
    const b = mk(), d = b.getContext("2d");               // bayangan: siluet hitam
    d.drawImage(a, 0, 0); d.globalCompositeOperation = "source-in"; d.fillStyle = "#000"; d.fillRect(0, 0, b.width, b.height);
    return (cache[key] = { body: a, shadow: b });
  };

  /* ---------- kaki & antena ---------- */
  const legs = (c, o, T) => {
    c.beginPath();
    for (let i = 0; i < 3; i++) for (let s = -1; s <= 1; s += 2) {
      const h = T.hip[i], f = T.ft[i], ph = o.ph + (((i + (s > 0 ? 1 : 0)) & 1) ? Math.PI : 0);
      let fx = f[0], fy = f[1];
      if (o.v > 1.5) { const sn = Math.sin(ph), cs = Math.cos(ph); fx += T.A * sn; if (cs > 0) fy *= 1 - .14 * cs; }
      else if (o.kind === "fly" && i === 0) { fx = .3 + .05 * Math.sin(o.t * 22 + (s > 0 ? 1.6 : 0)); fy = .09 + .03 * Math.sin(o.t * 22 + s); }
      const kx = (h[0] + fx) / 2 + (i === 0 ? .05 : i === 2 ? -.05 : 0), ky = h[1] + (fy - h[1]) * .72;
      c.moveTo(h[0], s * h[1]); c.lineTo(kx, s * ky); c.lineTo(fx, s * fy);
    }
  };
  const antennae = (c, o, T) => {
    const w = Math.sin(o.t * (o.v > 1.5 ? 5 : 11) + o.seed) * (o.v > 1.5 ? .22 : .4);
    c.beginPath();
    if (o.kind === "ant") for (let s = -1; s <= 1; s += 2) {
      const a = s * (.55 + w * s * .6) + w * .5;
      const ex = .25 + Math.cos(a) * .15, ey = s * .03 + Math.sin(a) * .15;
      c.moveTo(.25, s * .03); c.lineTo(ex, ey); c.lineTo(ex + Math.cos(a + s * .9 - w) * .13, ey + Math.sin(a + s * .9 - w) * .13);
    } else if (o.kind === "beetle") for (let s = -1; s <= 1; s += 2) { c.moveTo(.44, s * .05); c.lineTo(.54, s * (.12 + w * .1)); }
  };

  /* ---------- daftar serangga ---------- */
  const list = [];
  const maxN = () => lowEnd ? 3 : (vw >= 900 ? CFG.maxWide : CFG.max);

  function spawn() {
    const kind = pick(), T = K[kind], variant = kind === "beetle" && Math.random() < .3 ? "bronze" : kind;
    const side = (Math.random() * 4) | 0, m = 36;
    let x, y, tx, ty; const u = rnd(.12, .88), u2 = rnd(.1, .9);
    if (side === 0) { x = u * vw; y = -m; tx = u2 * vw; ty = vh + 90; }
    else if (side === 1) { x = vw + m; y = u * vh; tx = -90; ty = u2 * vh; }
    else if (side === 2) { x = u * vw; y = vh + m; tx = u2 * vw; ty = -90; }
    else { x = -m; y = u * vh; tx = vw + 90; ty = u2 * vh; }
    const th = Math.atan2(ty - y, tx - x), n = kind === "ant" ? (Math.random() < .4 ? (Math.random() < .35 ? 3 : 2) : 1) : 1;
    const base = r2(T.v), L = r2(T.L);
    for (let i = 0; i < n; i++) {                        // semut sering berbaris
      list.push({
        kind, T, variant, L: L * rnd(.92, 1.08), x: x - Math.cos(th) * i * L * 2.5, y: y - Math.sin(th) * i * L * 2.5,
        th: th + rnd(-.12, .12), w: 0, v: 0, base: base * rnd(.9, 1.1), boost: 1, ph: rnd(0, TAU), t: rnd(0, 50), seed: rnd(0, 9),
        mode: "go", mt: r2(T.go), tx, ty, age: 0, seen: false, px: x, py: y
      });
    }
  }

  function scareAt(px, py, rad) {
    for (const o of list) {
      const dx = o.x - px, dy = o.y - py;
      if (dx * dx + dy * dy < rad * rad) {
        const a = Math.atan2(dy, dx) + rnd(-.5, .5);
        o.tx = o.x + Math.cos(a) * 700; o.ty = o.y + Math.sin(a) * 700;
        o.boost = o.kind === "fly" ? 1.6 : 2.7; o.mode = "go"; o.mt = 1.4;
        o.th += clamp(angd(a, o.th), -1.2, 1.2) * .6;
      }
    }
  }

  function step(o, dt) {
    const T = o.T; o.age += dt; o.t += dt;
    o.boost = Math.max(1, o.boost - dt * .9);
    if (o.boost <= 1.01) { o.mt -= dt; if (o.mt <= 0) { if (o.mode === "go") { o.mode = "stop"; o.mt = r2(T.stop); } else { o.mode = "go"; o.mt = r2(T.go); if (o.kind === "fly") o.th += rnd(-1.2, 1.2); } } }
    const tgt = o.mode === "go" ? o.base * o.boost : 0;
    o.v += (tgt - o.v) * Math.min(1, dt * (tgt > o.v ? 6 : 10));
    if (o.v > 2) {
      o.w += (-o.w * 1.8 + rnd(-1, 1) * T.wob * 9) * dt;
      const da = angd(Math.atan2(o.ty - o.y, o.tx - o.x), o.th);
      o.th += (clamp(da, -1, 1) * .9 + o.w) * dt * clamp(o.v / (o.base * .6), .2, 1.4);
      o.x += Math.cos(o.th) * o.v * dt; o.y += Math.sin(o.th) * o.v * dt;
      o.ph += o.v * dt / (4 * T.A * o.L) * TAU;
    }
    const inside = o.x > 0 && o.x < vw && o.y > 0 && o.y < vh;
    if (inside) o.seen = true;
    const out = o.x < -70 || o.x > vw + 70 || o.y < -70 || o.y > vh + 70;
    return !((o.seen && out) || o.age > 45);
  }

  /* ---------- gambar ---------- */
  function draw(o) {
    const T = o.T, pal = PAL[theme][o.variant], sp = sprite(o.kind, o.variant), sway = Math.sin(o.ph * 2) * T.sway * (o.v > 1.5 ? 1 : 0);
    for (let pass = 0; pass < 2; pass++) {
      const off = pass ? 0 : o.L * .1;
      ctx.setTransform(dpr, 0, 0, dpr, (o.x + off) * dpr, (o.y + off * 1.3) * dpr);
      ctx.rotate(o.th + sway); ctx.scale(o.L, o.L);
      ctx.lineJoin = ctx.lineCap = "round";
      if (!pass) {
        ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = T.lw * 1.4; legs(ctx, o, T); ctx.stroke();
        ctx.globalAlpha = .2; ctx.drawImage(sp.shadow, -.75, -.5, 1.5, 1);
        ctx.globalAlpha = .1; ctx.drawImage(sp.shadow, -.83, -.55, 1.66, 1.1); ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = pal[1]; ctx.lineWidth = T.lw; legs(ctx, o, T); ctx.stroke();
        if (o.kind === "ant" || o.kind === "beetle") { ctx.lineWidth = T.lw * .8; antennae(ctx, o, T); ctx.stroke(); }
        ctx.drawImage(sp.body, -.75, -.5, 1.5, 1);
      }
    }
    o.px = o.x; o.py = o.y;
  }
  const wipe = o => { const r = o.L * 1.25 + 4; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(o.px - r, o.py - r, r * 2, r * 2); };

  /* ---------- loop ---------- */
  let raf = 0, last = 0, spawnT = 0;
  function frame(ts) {
    raf = 0;
    if (doc.hidden || !list.length) return;
    if (lowEnd && ts - last < 32) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(.05, (ts - (last || ts - 16)) / 1000); last = ts;
    for (const o of list) wipe(o);
    for (let i = list.length - 1; i >= 0; i--) if (!step(list[i], dt)) list.splice(i, 1);
    for (const o of list) draw(o);
    if (list.length) raf = requestAnimationFrame(frame); else last = 0;
  }
  const go = () => { if (!raf && !doc.hidden && list.length) raf = requestAnimationFrame(frame); };

  const tick = () => {
    if (!doc.hidden && list.filter(o => o.kind === "ant").length + list.length / 2 < maxN() && list.length < maxN()) { spawn(); go(); }
    spawnT = setTimeout(tick, r2(CFG.gap) * 1000);
  };

  /* ---------- init ---------- */
  function size() {
    vw = root.clientWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); cv.style.width = vw + "px"; cv.style.height = vh + "px";
    list.forEach(o => { o.px = o.x; o.py = o.y; });
  }
  function init() {
    const host = doc.querySelector(".hero"); if (!host) return;
    cv = doc.createElement("canvas"); cv.className = "bugs"; cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv); ctx = cv.getContext("2d"); if (!ctx) return;
    size();
    let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); go(); }, 180); }, { passive: true });
    doc.addEventListener("visibilitychange", () => { if (doc.hidden) { cancelAnimationFrame(raf); raf = 0; } else { last = 0; go(); } });
    new MutationObserver(() => { const t = root.dataset.theme === "light" ? "light" : "dark"; if (t !== theme) { theme = t; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); } }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    if (CFG.scare) {
      addEventListener("pointerdown", e => { if (list.length) scareAt(e.clientX, e.clientY, 110); }, { passive: true });
      if (matchMedia("(hover:hover) and (pointer:fine)").matches) addEventListener("pointermove", e => { if (list.length) scareAt(e.clientX, e.clientY, 70); }, { passive: true });
    }
    spawnT = setTimeout(() => { spawn(); go(); tick(); }, CFG.first);
  }

  const start = () => setTimeout(init, 0);
  const begin = () => { if (!root.classList.contains("ld-on")) return start(), true; return false; };
  const boot = () => {
    if (begin()) return;
    const mo = new MutationObserver(() => { if (!root.classList.contains("ld-on")) { mo.disconnect(); start(); } });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  };
  doc.readyState === "loading" ? doc.addEventListener("DOMContentLoaded", boot) : boot();
})();
