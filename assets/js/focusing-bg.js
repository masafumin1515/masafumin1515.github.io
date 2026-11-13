// Background animation of the top page: inertial focusing of particles in a square duct.
//
// Each particle has a position (y, z) in the duct cross-section (half width = 1) and is
// carried downstream (left to right) by a duct-like velocity profile. It migrates across
// the streamlines in two stages, as in the simulations: first radially onto a ring of
// radius R_EQ, then slowly along the ring to the four face centres. The screen shows the
// side view, i.e. the projection on y, so the particles enter scattered on the left and
// leave in three lines (y = -R_EQ, 0, +R_EQ) on the right. In "polymer solution" mode the
// particles migrate to the centreline instead (viscoelastic focusing).
//
// The migration law is a placeholder with the right qualitative shape; replace lift()
// with a fit of the computed lift when available.

(() => {
  const canvas = document.getElementById("focusing-bg");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const RGB = "26, 78, 138";      // link blue of the site
  const R_EQ = 0.6;               // radius of the focusing ring (fraction of the half width)
  const CROSSING_TIME = 18;       // s for a centreline particle to cross the screen
  const K_RADIAL = 0.12;          // 1/s, migration onto the ring
  const K_ANGULAR = 0.05;         // 1/s, migration along the ring to the face centres
  const K_VISCOELASTIC = 0.12;    // 1/s, migration to the centreline
  const NOISE = 0.015;            // random walk in the cross-section, keeps the unstable centre alive
  const BURST = 28;               // particles added per click

  let mode = "newtonian";
  let width = 0, height = 0, dpr = 1;
  let particles = [];
  let ripples = [];

  // Lateral migration velocity (dy/dt, dz/dt) at a cross-section position.
  function lift(y, z) {
    if (mode === "viscoelastic") return [-K_VISCOELASTIC * y, -K_VISCOELASTIC * z];
    const r = Math.hypot(y, z) + 1e-9;
    const theta = Math.atan2(z, y);
    const dr = K_RADIAL * r * (1 - (r / R_EQ) ** 2);   // unstable at r = 0, stable at r = R_EQ
    const dtheta = -K_ANGULAR * Math.sin(4 * theta);    // stable at the face centres
    return [
      dr * Math.cos(theta) - r * dtheta * Math.sin(theta),
      dr * Math.sin(theta) + r * dtheta * Math.cos(theta),
    ];
  }

  // Streamwise velocity in screen widths per second (approximate square-duct profile).
  function speed(y, z) {
    return (1 - y * y) * (1 - z * z) / CROSSING_TIME;
  }

  // How close a particle is to a focusing position, 0..1. Used for the glow.
  function focus(y, z) {
    if (mode === "viscoelastic") return Math.exp(-(y * y + z * z) / 0.004);
    const targets = [[R_EQ, 0], [-R_EQ, 0], [0, R_EQ], [0, -R_EQ]];
    let best = Infinity;
    for (const [ty, tz] of targets) best = Math.min(best, (y - ty) ** 2 + (z - tz) ** 2);
    return Math.exp(-best / 0.004);
  }

  const randomCoord = () => (Math.random() * 2 - 1) * 0.92;

  function newParticle(x) {
    return { x, y: randomCoord(), z: randomCoord(), kx: 0, ky: 0, flash: 0, recycle: true };
  }

  // A particle placed at x has already travelled about x * CROSSING_TIME seconds;
  // let it migrate for that long so the first frame already looks developed.
  function warmedUp(p) {
    for (let t = 0; t < p.x * CROSSING_TIME; t += 0.1) {
      const [vy, vz] = lift(p.y, p.z);
      p.y += vy * 0.1 + NOISE * 0.3 * (Math.random() * 2 - 1);
      p.z += vz * 0.1 + NOISE * 0.3 * (Math.random() * 2 - 1);
    }
    return p;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    if (!width || !height) return;   // not laid out yet; frame() retries
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(220, Math.round(width * height / 7000));
    while (particles.length < count) particles.push(warmedUp(newParticle(Math.random())));
    particles = particles.filter((p, i) => !p.recycle || i < count);
  }

  const toScreenY = (y) => (0.5 + 0.47 * y) * height;
  const fromScreenY = (sy) => (sy / height - 0.5) / 0.47;

  function step(dt) {
    const sqrtDt = Math.sqrt(dt);
    for (const p of particles) {
      const [vy, vz] = lift(p.y, p.z);
      p.y += vy * dt + NOISE * sqrtDt * (Math.random() * 2 - 1);
      p.z += vz * dt + NOISE * sqrtDt * (Math.random() * 2 - 1);
      p.y = Math.max(-0.95, Math.min(0.95, p.y));
      p.z = Math.max(-0.95, Math.min(0.95, p.z));
      // Kick from a click, decaying quickly (in screen units).
      p.x += speed(p.y, p.z) * dt + p.kx * dt;
      p.y += p.ky * dt;
      const decay = Math.exp(-dt / 0.35);
      p.kx *= decay;
      p.ky *= decay;
      p.flash *= Math.exp(-dt / 1.2);
    }
    for (const p of particles) {
      if (p.x > 1.02 && p.recycle) Object.assign(p, newParticle(-0.02));
    }
    particles = particles.filter((p) => p.x <= 1.02);
    for (const r of ripples) r.age += dt;
    ripples = ripples.filter((r) => r.age < 0.9);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      const g = Math.min(1, focus(p.y, p.z) + p.flash);
      const depth = 0.85 + 0.3 * (p.z + 1) / 2;            // slightly larger when nearer
      const radius = (1.7 + 1.3 * g) * depth;
      const sx = p.x * width, sy = toScreenY(p.y);
      if (g > 0.2) {
        ctx.fillStyle = `rgba(${RGB}, ${0.06 * g})`;
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 3.2, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${RGB}, ${0.18 + 0.34 * g})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    for (const r of ripples) {
      const t = r.age / 0.9;
      ctx.strokeStyle = `rgba(${RGB}, ${0.25 * (1 - t)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8 + 60 * t, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  // Clicking anywhere except on links and controls injects a burst of particles.
  function onClick(event) {
    if (reduceMotion) return;
    const el = event.target instanceof Element ? event.target : null;
    if (el && el.closest("a, button, input, textarea, select, label, .focusing-ui")) return;
    const x = event.clientX / width;
    const y = fromScreenY(event.clientY);
    if (Math.abs(y) > 0.95) return;
    ripples.push({ x: event.clientX, y: event.clientY, age: 0 });
    for (let i = 0; i < BURST; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const kick = 0.05 + 0.1 * Math.random();
      particles.push({
        x, y, z: randomCoord(),
        kx: kick * Math.cos(angle) * 0.6,
        ky: kick * Math.sin(angle) * 2.2,
        flash: 1,
        recycle: false,
      });
    }
    if (particles.length > 600) particles.splice(0, particles.length - 600);
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll(".focusing-ui [data-mode]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    });
    if (reduceMotion) { settle(); draw(); }
  }

  // Without animation: jump to the focused state and draw it once.
  function settle() {
    for (let i = 0; i < 400; i++) {
      for (const p of particles) {
        const [vy, vz] = lift(p.y, p.z);
        p.y += vy * 0.1;
        p.z += vz * 0.1;
      }
    }
  }

  document.querySelectorAll(".focusing-ui [data-mode]").forEach((b) => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  });
  window.addEventListener("resize", () => { resize(); if (reduceMotion) draw(); });
  document.addEventListener("click", onClick);
  resize();

  if (reduceMotion) {
    window.addEventListener("load", () => { resize(); settle(); draw(); });
    return;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));   // first timestamp can precede `last`
    last = now;
    if (window.innerWidth !== width || window.innerHeight !== height) resize();
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
