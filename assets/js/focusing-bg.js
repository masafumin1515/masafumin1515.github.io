// Banner animation of the top page: inertial focusing of particles in a channel flow.
//
// Side view of a channel (walls at the top and bottom of the banner, half width = 1).
// Particles are carried downstream by the parabolic (Poiseuille) profile and migrate
// across the streamlines to their equilibrium positions: y = +-Y_EQ in a Newtonian fluid
// (Segre-Silberberg), the centreline y = 0 in a polymer solution (viscoelastic focusing).
// They enter scattered on the left and are focused from about the middle of the banner on.
//
// The migration law is a placeholder (linear relaxation to the nearest equilibrium, ramped
// up over an inlet length) tuned for the look; replace lift() with a fit of the computed
// lift when available.

(() => {
  const canvas = document.getElementById("focusing-bg");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const RGB = "26, 78, 138";      // link blue of the site
  const Y_EQ = 0.6;               // Newtonian equilibrium position (fraction of the half width)
  const CROSSING_TIME = 14;       // s for a centreline particle to cross the banner
  const K_NEWTONIAN = 0.25;       // 1/s, migration rate to +-Y_EQ
  const K_VISCOELASTIC = 0.4;     // 1/s, migration rate to the centreline
  const INLET = 0.2;              // fraction of the width over which migration ramps up
  const DWELL = 1.5;              // s near an equilibrium before a particle glows fully
  const NOISE = 0.02;             // random walk, keeps the unstable centreline alive
  const WALL_INSET = 18;          // px between the canvas edge and a wall
  const BURST = 16;               // particles added per click

  let mode = "newtonian";
  let width = 0, height = 0, dpr = 1;
  let particles = [];
  let ripples = [];
  let visible = true;

  // Lateral migration velocity dy/dt at height y and streamwise position x.
  function lift(y, x) {
    const ramp = Math.min(1, Math.max(0, x / INLET));
    if (mode === "viscoelastic") return -ramp * K_VISCOELASTIC * y;
    return ramp * K_NEWTONIAN * ((y >= 0 ? Y_EQ : -Y_EQ) - y);   // centreline unstable
  }

  // Streamwise velocity in banner widths per second.
  const speed = (y) => (1 - y * y) / CROSSING_TIME;

  // How close a particle is to an equilibrium position, 0..1.
  function focus(y) {
    const d = mode === "viscoelastic" ? y : Math.abs(y) - Y_EQ;
    return Math.exp(-(d * d) / 0.0015);
  }

  // Glow: close to an equilibrium AND stayed there for a while, so that particles
  // merely passing by on the left do not light up.
  const glow = (p) => Math.min(1, focus(p.y) * Math.min(1, p.dwell / DWELL) + p.flash);

  // Lateral motion and dwell-time bookkeeping shared by step() and warmedUp().
  function migrate(p, dt, noise) {
    p.y += lift(p.y, p.x) * dt + noise * Math.sqrt(dt) * (Math.random() * 2 - 1);
    p.y = Math.max(-0.92, Math.min(0.92, p.y));
    p.dwell = focus(p.y) > 0.3 ? p.dwell + dt : Math.max(0, p.dwell - 2 * dt);
  }

  const randomY = () => (Math.random() * 2 - 1) * 0.9;

  function newParticle(x) {
    return { x, y: randomY(), size: 0.8 + 0.4 * Math.random(), kx: 0, ky: 0, flash: 0, dwell: 0, recycle: true };
  }

  // Start a particle at the inlet and let it travel to x, so that the first frame
  // already shows the developed state.
  function warmedUp(p) {
    const target = p.x;
    p.x = 0;
    while (p.x < target) {
      migrate(p, 0.1, NOISE);
      p.x += speed(p.y) * 0.1;
    }
    return p;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;   // not laid out yet; frame() retries
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(45, Math.min(140, Math.round(width * height / 3000)));
    while (particles.length < count) particles.push(warmedUp(newParticle(Math.random())));
    particles = particles.filter((p, i) => !p.recycle || i < count);
  }

  const channelHalf = () => (height - 2 * WALL_INSET) / 2;
  const toScreenY = (y) => height / 2 + y * (channelHalf() - 4);
  const fromScreenY = (sy) => (sy - height / 2) / (channelHalf() - 4);

  function step(dt) {
    const decay = Math.exp(-dt / 0.35);
    for (const p of particles) {
      p.y += p.ky * dt;
      migrate(p, dt, NOISE);
      p.x += speed(p.y) * dt + p.kx * dt;
      p.kx *= decay;
      p.ky *= decay;
      p.flash *= Math.exp(-dt / 1.2);
      if (p.x > 1.02 && p.recycle) Object.assign(p, newParticle(-0.02));
    }
    particles = particles.filter((p) => p.x <= 1.02);
    for (const r of ripples) r.age += dt;
    ripples = ripples.filter((r) => r.age < 0.9);
  }

  // Walls that fade out at both ends, and a faint parabolic profile at the inlet.
  function drawChannel() {
    const top = WALL_INSET, bottom = height - WALL_INSET;
    const fade = ctx.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, `rgba(${RGB}, 0)`);
    fade.addColorStop(0.08, `rgba(${RGB}, 0.35)`);
    fade.addColorStop(0.92, `rgba(${RGB}, 0.35)`);
    fade.addColorStop(1, `rgba(${RGB}, 0)`);
    ctx.strokeStyle = fade;
    ctx.lineWidth = 1.5;
    for (const yw of [top, bottom]) {
      ctx.beginPath();
      ctx.moveTo(0, yw);
      ctx.lineTo(width, yw);
      ctx.stroke();
    }
    // Light shading just inside the walls.
    for (const [yw, dir] of [[top, 1], [bottom, -1]]) {
      const g = ctx.createLinearGradient(0, yw, 0, yw + dir * 10);
      g.addColorStop(0, `rgba(${RGB}, 0.06)`);
      g.addColorStop(1, `rgba(${RGB}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(yw, yw + dir * 10), width, 10);
    }
    // Velocity profile u = 1 - y^2 with a few arrows.
    const x0 = Math.min(70, width * 0.06), len = Math.min(60, width * 0.05);
    ctx.strokeStyle = `rgba(${RGB}, 0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    for (let i = 0; i <= 40; i++) {
      const y = -1 + i / 20;
      ctx.lineTo(x0 + len * (1 - y * y), height / 2 + y * channelHalf());
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x0, bottom);
    ctx.stroke();
    for (const y of [-0.66, -0.33, 0, 0.33, 0.66]) {
      const sy = height / 2 + y * channelHalf(), ex = x0 + len * (1 - y * y);
      ctx.beginPath();
      ctx.moveTo(x0, sy);
      ctx.lineTo(ex, sy);
      ctx.moveTo(ex - 4, sy - 3);
      ctx.lineTo(ex, sy);
      ctx.lineTo(ex - 4, sy + 3);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawChannel();
    const scale = Math.max(1, Math.min(1.6, height / 200));
    for (const p of particles) {
      const g = glow(p);
      const radius = (2 + 1.6 * g) * p.size * scale;
      const sx = p.x * width, sy = toScreenY(p.y);
      if (g > 0.2) {
        ctx.fillStyle = `rgba(${RGB}, ${0.1 * g})`;
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 3, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${RGB}, ${0.3 + 0.5 * g})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    for (const r of ripples) {
      const t = r.age / 0.9;
      ctx.strokeStyle = `rgba(${RGB}, ${0.3 * (1 - t)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6 + 45 * t, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  // Clicking the banner injects a burst of particles at that point.
  canvas.addEventListener("click", (event) => {
    if (reduceMotion) return;
    const rect = canvas.getBoundingClientRect();
    const cx = event.clientX - rect.left, cy = event.clientY - rect.top;
    const y = fromScreenY(cy);
    if (Math.abs(y) > 0.92) return;
    ripples.push({ x: cx, y: cy, age: 0 });
    for (let i = 0; i < BURST; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const kick = 0.04 + 0.08 * Math.random();
      particles.push({
        x: cx / width, y, size: 0.8 + 0.4 * Math.random(),
        kx: kick * Math.cos(angle) * 0.5,
        ky: kick * Math.sin(angle) * 6,
        flash: 1,
        dwell: 0,
        recycle: false,
      });
    }
    if (particles.length > 400) particles.splice(0, particles.length - 400);
  });

  function setMode(next) {
    mode = next;
    document.querySelectorAll(".focusing-ui [data-mode]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    });
    if (reduceMotion) { settle(); draw(); }
  }

  // Without animation: jump to the focused state and draw it once.
  function settle() {
    for (const p of particles) {
      for (let i = 0; i < 400; i++) p.y += lift(p.y, p.x) * 0.1;
      p.dwell = DWELL;
    }
  }

  document.querySelectorAll(".focusing-ui [data-mode]").forEach((b) => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  });

  if (reduceMotion) {
    const still = () => { resize(); settle(); draw(); };
    window.addEventListener("load", still);
    window.addEventListener("resize", still);
    return;
  }

  // Stop drawing while the banner is scrolled out of view.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));   // first timestamp can precede `last`
    last = now;
    if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();
    if (visible && width && height) {
      step(dt);
      draw();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
