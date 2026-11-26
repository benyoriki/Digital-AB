/* ADS — serangga canvas v4 (ringan, tanpa library, satu canvas).
   - Capung: meluncur cepat lalu melayang, hinggap di tombol/judul. Lebah: berdengung & melayang.
   Berhenti saat tab tersembunyi / reduce-motion / hemat data. */
(() => {
  "use strict";
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const conn = navigator.connection || {};
  if (mq.matches || conn.saveData || (navigator.deviceMemory && navigator.deviceMemory < 1)) return;

  const TAU = Math.PI * 2;
  const R = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:30";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const small = () => W < 700;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, small() ? 1.75 : 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  /* ================= SPRITE SAYAP CAPUNG ================= */
  function dragonWing(hind) {
    const c = document.createElement("canvas"); c.width = 160; c.height = 40;
    const g = c.getContext("2d"); g.scale(2, 2); g.translate(1, 10);
    const w = hind ? 10 : 7.5;
    const p = new Path2D(`M0 ${w * .35} C8 ${-w * .1} 44 ${-w * .55} 76 ${w * .15} C77 ${w * .5} 70 ${w * .95} 46 ${w * 1.05} C24 ${w * 1.1} 8 ${w * .95} 0 ${w * .6} Z`);
    const gr = g.createLinearGradient(0, 0, 78, 0);
    gr.addColorStop(0, "rgba(160,200,215,.55)"); gr.addColorStop(.6, "rgba(215,235,245,.32)"); gr.addColorStop(1, "rgba(235,245,250,.22)");
    g.fillStyle = gr; g.fill(p);
    g.save(); g.clip(p); g.strokeStyle = "rgba(45,70,85,.55)"; g.lineWidth = .5;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, w * (.3 + i * .12)); g.lineTo(78, w * (-.1 + i * .22)); g.stroke(); }
    for (let x = 8; x < 76; x += 4.2) { g.beginPath(); g.moveTo(x, -w); g.lineTo(x + 1.5, w * 1.3); g.stroke(); }
    g.restore();
    g.strokeStyle = "rgba(35,55,70,.7)"; g.lineWidth = .9; g.stroke(p);
    g.fillStyle = "#2b2a22"; g.beginPath(); g.rect(64, 0, 5.5, 2.2); g.fill();            // pterostigma
    return c;
  }
  const DWF = dragonWing(false), DWH = dragonWing(true);

  /* ================= PETUNJUK & POINTER ================= */
  const mouse = { x: -999, y: -999 };
  addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener("pointerdown", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
  const PERCH_SEL = ".btn,.tag,.chip,h2,.proj,.stats b,.badge,.why .ic,.lap,.pho";

  function pickPerch() {
    const els = document.querySelectorAll(PERCH_SEL), ok = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 40 && r.top > 90 && r.top < H - 60 && r.left > -5 && r.right < W + 5) ok.push([el, r]);
    }
    if (!ok.length) return null;
    const [el, r] = ok[(Math.random() * ok.length) | 0];
    return { el, u: R(.15, .85) };
  }
  const perchPoint = t => { const r = t.el.getBoundingClientRect(); return { x: r.left + r.width * t.u, y: r.top + 1, ok: r.top > 80 && r.top < H - 30 && r.width > 0 }; };

  /* ================= KELAS SERANGGA ================= */
  class Bug {
    constructor(kind, i) {
      this.k = kind;
      this.x = R(40, W - 40); this.y = R(100, H - 80);
      this.vx = R(-20, 20); this.vy = R(-20, 20);
      this.h = R(0, TAU); this.bank = 0;
      this.t = R(0, 50); this.ph = R(0, TAU);
      this.n1 = R(0, TAU); this.n2 = R(0, TAU); this.n3 = R(0, TAU);
      this.z = (kind === "df" ? R(1, 1.15) : R(.95, 1.1)) * (small() ? .82 : 1);
      this.mode = "fly"; this.mt = R(.5, 1.5); this.amp = .4; this.openW = .6;
            this.perch = null; this.pt = 0; this.perchCd = R(3, 9);
      this.wp = { x: this.x, y: this.y }; this.newWp();
    }
    newWp(far) {
      const r = far ? R(200, 420) : R(90, 260), a = R(0, TAU), top = 90, m = 36;
      this.wp = { x: clamp(this.x + Math.cos(a) * r, m, W - m), y: clamp(this.y + Math.sin(a) * r, top, H - 50) };
    }
    noise(t) { return Math.sin(t * 1.7 + this.n1) * .55 + Math.sin(t * 2.9 + this.n2) * .3 + Math.sin(t * 5.3 + this.n3) * .15; }

    update(dt) {
      this.t += dt;
      const sp = Math.hypot(this.vx, this.vy);
      /* ----- hinggap ----- */
      if (this.mode === "perched") {
        const p = perchPoint(this.perch);
        const m = Math.hypot(mouse.x - this.x, mouse.y - this.y);
        this.pt -= dt; this.x = p.x; this.y = p.y;
        if (!p.ok || this.pt <= 0 || m < 110) { this.mode = "fly"; this.perchCd = R(8, 18); this.vy = -R(30, 55); this.vx = R(-40, 40); this.mt = R(.8, 1.6); this.amp = 0; this.perch = null; this.newWp(true); }
        else { this.wing(dt, 0); return; }
      }
      /* ----- ganti mode kepak/meluncur (kupu-kupu) atau melesat/melayang (capung, lebah) ----- */
      this.mt -= dt;
      if (this.mt <= 0) {
        if (this.k === "df") { this.mode = this.mode === "dart" ? "hover" : "dart"; this.mt = this.mode === "dart" ? R(.7, 1.4) : R(.6, 1.8); if (this.mode === "dart") this.newWp(true); }
        else { this.mode = this.mode === "buzz" ? "hover" : "buzz"; this.mt = this.mode === "buzz" ? R(1, 2.4) : R(.4, 1); if (this.mode === "buzz") this.newWp(); }
      }
      if (this.mode === "fly") this.mode = this.k === "df" ? "dart" : "buzz";

      /* ----- arah tujuan ----- */
      let tx = this.wp.x, ty = this.wp.y;
      if (this.perch) { const p = perchPoint(this.perch); if (!p.ok) { this.perch = null; this.newWp(); } else { tx = p.x; ty = p.y; } }
      let dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
      if (d < 36 && !this.perch) this.newWp();
      if (this.perch && d < 9) { this.mode = "perched"; this.pt = R(3, 7); this.vx = this.vy = 0; return; }

      let speed, acc;
      if (this.k === "df") { speed = this.mode === "dart" ? 215 : 0; acc = this.mode === "dart" ? 5 : 4; }
      else { speed = this.mode === "buzz" ? 125 : 6; acc = 6; }
      speed *= this.z * .95;
      if (this.perch) speed = Math.min(speed, 20 + d * 1.4);
      let ux = dx / d, uy = dy / d;
      // lengkung alami: tambah komponen tegak lurus yang berayun halus
      const wob = this.noise(this.t) * (this.k === "bee" ? 1.5 : .22);
      { const bx = ux, by = uy; ux = bx - by * wob; uy = by + bx * wob; }
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      // hindari kursor / jari
      const mx = this.x - mouse.x, my = this.y - mouse.y, md = Math.hypot(mx, my);
      if (md < 140) { ux = mx / md; uy = my / md; speed = Math.max(speed, 170) * 1.15; acc = 8; if (this.k === "df" && this.mode === "hover") this.mode = "dart"; }
      let dvx = ux * speed - this.vx, dvy = uy * speed - this.vy;
      this.vx += dvx * acc * dt; this.vy += dvy * acc * dt;
      if (this.mode === "hover" || (this.k === "bee" && this.mode === "hover")) {        // gemetar kecil saat melayang
        this.vx += Math.sin(this.t * 31 + this.n1) * 14 * dt * 8; this.vy += Math.cos(this.t * 27 + this.n2) * 14 * dt * 8;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.x < -50 || this.x > W + 50 || this.y < 20 || this.y > H + 50) this.newWp(true);

      /* ----- arah hadap & kemiringan ----- */
      const s2 = Math.hypot(this.vx, this.vy);
      if (s2 > 12) {
        const tgt = Math.atan2(this.vy, this.vx), diff = angDiff(this.h, tgt);
        const rate = this.k === "df" ? 9 : 10;
        this.h += diff * Math.min(1, dt * rate);
        this.bank += (clamp(diff, -1, 1) * 0.7 - this.bank) * Math.min(1, dt * 5);
      } else this.bank *= .9;
      this.wing(dt, s2);
    }

    wing(dt, s) {
      if (this.k === "df") {
        this.ph += dt * (this.mode === "perched" ? 0 : 2 * Math.PI * (this.mode === "hover" ? 26 : 22));
      } else this.ph += dt * 2 * Math.PI * 70;
    }

    draw(g) {
      const z = this.z, perched = this.mode === "perched";
      // bayangan lembut di permukaan (tidak saat hinggap)
      if (!perched) {
        g.save(); g.translate(this.x + 14 * z, this.y + 20 * z); g.rotate(this.h);
        const sr = (this.k === "df" ? 22 : 9) * z;
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, sr);
        gr.addColorStop(0, "rgba(0,0,0,.16)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.scale(1, .55); g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.fill(); g.restore();
      }
      g.save(); g.translate(this.x, this.y); g.rotate(this.h + Math.PI / 2 + (perched ? 0 : this.bank * .35));
      if (this.k === "df") this.drawDf(g, z, perched); else this.drawBee(g, z);
      g.restore();
    }

    drawDf(g, z, perched) {
      const ty = -13 * z;
      const wings = (a, fl) => {
        for (const s of [-1, 1]) {
          g.save(); g.translate(0, ty); g.scale(s, 1);
          g.globalAlpha = a;
          g.save(); g.rotate(-.16 - fl * .9); g.scale(z * .42, z * .42 * (1 - Math.abs(fl) * .35)); g.drawImage(DWF, -1, -10); g.restore();
          g.save(); g.translate(0, 3.5 * z); g.rotate(.2 + fl * .9); g.scale(z * .42, z * .42 * (1 - Math.abs(fl) * .35)); g.drawImage(DWH, -1, -10); g.restore();
          g.restore();
        }
        g.globalAlpha = 1;
      };
      // abdomen bersegmen
      g.lineCap = "round";
      const N = 11, seg = 3.4 * z;
      for (let i = 0; i < N; i++) {
        const y0 = -6 * z + i * seg, y1 = y0 + seg, r = (2.1 - i * .07) * z;
        g.strokeStyle = i % 3 === 2 ? "#0b3b5a" : i % 2 ? "#2aa4d6" : "#1c86c0"; g.lineWidth = r * 2;
        g.beginPath(); g.moveTo(0, y0); g.lineTo(0, y1); g.stroke();
      }
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = .7 * z; g.beginPath(); g.moveTo(-.5 * z, -5 * z); g.lineTo(-.4 * z, (N * 3.4 - 6) * z); g.stroke();
      // capit ekor
      g.strokeStyle = "#0b3b5a"; g.lineWidth = .8 * z; g.beginPath(); g.moveTo(-.5 * z, (N * 3.4 - 6) * z); g.lineTo(-1.4 * z, (N * 3.4 - 3) * z); g.moveTo(.5 * z, (N * 3.4 - 6) * z); g.lineTo(1.4 * z, (N * 3.4 - 3) * z); g.stroke();
      if (perched) wings(.9, 0);
      else { const f = Math.sin(this.ph) * .34; wings(.62, f); wings(.4, f * .35); }
      // dada & kepala
      const tg = g.createRadialGradient(-1 * z, -14 * z, .5, 0, -13 * z, 5.6 * z); tg.addColorStop(0, "#9be870"); tg.addColorStop(1, "#2f7a2a");
      g.fillStyle = tg; g.beginPath(); g.ellipse(0, -12.5 * z, 3.5 * z, 5.6 * z, 0, 0, TAU); g.fill();
      g.fillStyle = "#1d4f1c"; g.beginPath(); g.ellipse(0, -20 * z, 2.4 * z, 1.8 * z, 0, 0, TAU); g.fill();
      for (const s of [-1, 1]) {
        const eg = g.createRadialGradient(s * 3 * z, -21.4 * z, .2, s * 2.8 * z, -20.8 * z, 3.2 * z); eg.addColorStop(0, "#d4f4ff"); eg.addColorStop(.4, "#3aa6d8"); eg.addColorStop(1, "#0d4b73");
        g.fillStyle = eg; g.beginPath(); g.ellipse(s * 2.7 * z, -21 * z, 2.5 * z, 2.9 * z, 0, 0, TAU); g.fill();
      }
    }

    drawBee(g, z) {
      const f = Math.sin(this.ph);
      // sayap (dua pasang, kabur oleh dua salinan)
      for (const a of [1, .45]) {
        g.fillStyle = `rgba(225,240,255,${.34 * a})`; g.strokeStyle = `rgba(110,140,165,${.5 * a})`; g.lineWidth = .5 * z;
        for (const s of [-1, 1]) {
          g.save(); g.translate(s * 2.6 * z, -3.4 * z); g.scale(s, 1); g.rotate(-.5 + f * .7 * a);
          g.beginPath(); g.ellipse(7.5 * z, 0, 8.5 * z, 3.1 * z, 0, 0, TAU); g.fill(); g.stroke();
          g.beginPath(); g.ellipse(5 * z, 4.2 * z, 5.5 * z, 2.2 * z, .4, 0, TAU); g.fill();
          g.restore();
        }
      }
      // kaki
      g.strokeStyle = "#2a1c0b"; g.lineWidth = .7 * z; g.lineCap = "round";
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 3 * z, -2 * z); g.lineTo(s * 6.5 * z, 1 * z); g.moveTo(s * 3.4 * z, 1 * z); g.lineTo(s * 7 * z, 5 * z); g.stroke(); }
      // perut bergaris
      const ag = g.createRadialGradient(-1.5 * z, 4 * z, .5, 0, 6.5 * z, 7.6 * z); ag.addColorStop(0, "#ffd24a"); ag.addColorStop(1, "#c78205");
      g.fillStyle = ag; g.beginPath(); g.ellipse(0, 6.5 * z, 4.5 * z, 7 * z, 0, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.ellipse(0, 6.5 * z, 4.5 * z, 7 * z, 0, 0, TAU); g.clip();
      g.fillStyle = "#1b1209"; for (const y of [3.2, 7.4, 11.3]) g.fillRect(-6 * z, y * z, 12 * z, 2.1 * z);
      g.fillStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.ellipse(-1.8 * z, 4 * z, 1.1 * z, 4 * z, 0, 0, TAU); g.fill();
      g.restore();
      // dada berbulu
      const tg = g.createRadialGradient(-1 * z, -3.5 * z, .3, 0, -2.4 * z, 4.8 * z); tg.addColorStop(0, "#f0c25c"); tg.addColorStop(.6, "#8a5f1c"); tg.addColorStop(1, "#3a260c");
      g.fillStyle = tg; g.beginPath(); g.ellipse(0, -2.4 * z, 4.2 * z, 3.9 * z, 0, 0, TAU); g.fill();
      // kepala + mata + antena
      g.fillStyle = "#221609"; g.beginPath(); g.ellipse(0, -8 * z, 2.9 * z, 2.6 * z, 0, 0, TAU); g.fill();
      g.fillStyle = "#0b0805"; g.beginPath(); g.ellipse(-1.9 * z, -8.2 * z, 1.1 * z, 1.6 * z, 0, 0, TAU); g.ellipse(1.9 * z, -8.2 * z, 1.1 * z, 1.6 * z, 0, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.arc(-2.2 * z, -8.8 * z, .4 * z, 0, TAU); g.arc(1.6 * z, -8.8 * z, .4 * z, 0, TAU); g.fill();
      g.strokeStyle = "#221609"; g.lineWidth = .6 * z; g.beginPath(); g.moveTo(-.8 * z, -10 * z); g.lineTo(-2.6 * z, -13.5 * z); g.moveTo(.8 * z, -10 * z); g.lineTo(2.6 * z, -13.5 * z); g.stroke();
    }
  }

  /* ================= POPULASI ================= */
  const kinds = small() ? ["df", "bee", "bee"] : ["df", "df", "bee", "bee", "bee"];
  const bugs = kinds.map((k, i) => new Bug(k, i));

  let last = 0, raf = 0;
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const b of bugs) { b.update(dt); b.draw(ctx); }
  }
  const start = () => { if (!raf && !document.hidden && !mq.matches) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  mq.addEventListener && mq.addEventListener("change", e => e.matches ? (stop(), cv.remove()) : start());
  // coba hinggap secara berkala (kupu-kupu & capung)
  setInterval(() => {
    if (document.hidden) return;
    for (const b of bugs) {
      if (b.k !== "df" || b.mode === "perched" || b.perch) continue;
      b.perchCd -= 1; if (b.perchCd <= 0) { const t = pickPerch(); if (t) { b.perch = t; if (b.k === "df") b.mode = "dart"; } b.perchCd = R(10, 20); }
    }
  }, 1000);
  start();
})();
