// ===========================================================
//  HERO FX — audio-spectrum hero background + custom cursor
// ===========================================================
const { useState: useStateFx, useEffect: useEffectFx, useRef: useRefFx } = React;

// ---------- HERO BACKGROUND CANVAS ----------
//
// Visual: a row of tall vertical bars across the full hero width that
// behaves like a music spectrum analyzer — each bar breathes on its own
// sine envelope, the cursor adds a localized "kick" that ripples out, and
// dust particles drift upward and dodge the cursor.
//
function HeroBackground() {
  const canvasRef = useRefFx(null);
  const mouseRef = useRefFx({ x: -1000, y: -1000, tx: -1000, ty: -1000, active: false, kick: 0 });
  const rafRef = useRefFx(null);

  useEffectFx(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    // Color palette
    const palette = [
      { r: 240, g: 168, b: 56 },   // mustard
      { r: 225, g: 90, b: 90 },    // rose
      { r: 74, g: 184, b: 184 },   // cyan
      { r: 138, g: 72, b: 120 },   // plum
      { r: 95, g: 168, b: 107 },   // sage
    ];

    // Spectrum bars — generated lazily so we resize cleanly
    const BAR_COUNT = 96;
    const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
      // mix of frequencies per bar so they each have unique motion
      const f1 = 0.6 + Math.random() * 1.4;
      const f2 = 0.3 + Math.random() * 0.6;
      const f3 = 1.5 + Math.random() * 1.5;
      return {
        i,
        f1, f2, f3,
        phase1: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        phase3: Math.random() * Math.PI * 2,
        // colorMix biases this bar toward one of the palette colors
        colorIdx: Math.floor(Math.random() * palette.length),
        // current eased amplitude
        amp: 0,
        targetAmp: 0,
      };
    });

    // Particles — drifting upward, scatter on cursor
    const PARTICLES = 140;
    const particles = Array.from({ length: PARTICLES }, () => {
      const c = palette[Math.floor(Math.random() * palette.length)];
      return {
        x: Math.random() * 1200,
        y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.04 - Math.random() * 0.18,
        size: 0.7 + Math.random() * 2.4,
        alpha: 0.15 + Math.random() * 0.45,
        color: c,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.001 + Math.random() * 0.003,
      };
    });

    // Dust grains (very subtle static-y flecks)
    const grains = Array.from({ length: 90 }, () => ({
      x: Math.random() * 1200,
      y: Math.random() * 800,
      life: Math.random(),
      decay: 0.003 + Math.random() * 0.008,
    }));

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, W, H);

      const m = mouseRef.current;

      // ease cursor position so motion feels smooth
      m.tx += (m.x - m.tx) * 0.12;
      m.ty += (m.y - m.ty) * 0.12;
      m.kick *= 0.94; // decay click kick
      const mx = m.tx, my = m.ty;

      // ---- spectrum bars ----
      const barW = W / BAR_COUNT;
      const baseY = H; // bars rise from bottom
      const maxBarH = H * 0.78;

      for (let i = 0; i < BAR_COUNT; i++) {
        const b = bars[i];
        // intrinsic "music-like" breathing — three sines + slow drift
        b.phase1 += 0.014 * b.f1;
        b.phase2 += 0.008 * b.f2;
        b.phase3 += 0.022 * b.f3;
        const intrinsic =
          0.34 +
          0.18 * Math.sin(b.phase1) +
          0.14 * Math.sin(b.phase2 + i * 0.21) +
          0.10 * Math.sin(b.phase3 + i * 0.07);

        // cursor influence — falls off with distance from bar center on x
        const cx = (i + 0.5) * barW;
        const cy = baseY - intrinsic * maxBarH * 0.5;
        let cursorBoost = 0;
        if (m.active) {
          const dx = mx - cx;
          const dist = Math.abs(dx);
          const reach = 280;
          if (dist < reach) {
            const f = 1 - dist / reach;
            // y position of cursor also matters — closer to bottom = stronger
            const yf = Math.max(0, Math.min(1, my / H));
            cursorBoost = f * f * (0.45 + 0.55 * yf);
          }
        }
        // click kick adds a uniform pulse weighted by distance
        if (m.kick > 0.01) {
          const dx = mx - cx;
          const dist = Math.abs(dx);
          const reach = 360;
          if (dist < reach) {
            cursorBoost += m.kick * (1 - dist / reach) * 0.6;
          }
        }

        b.targetAmp = Math.min(1.3, intrinsic + cursorBoost);
        // ease toward target
        b.amp += (b.targetAmp - b.amp) * 0.18;

        const h = Math.max(2, b.amp * maxBarH);
        const top = baseY - h;

        // gradient per bar — top color brighter, bottom translucent
        const c = palette[b.colorIdx];
        const intensity = Math.min(1, b.amp);
        const grad = ctx.createLinearGradient(0, top, 0, baseY);
        grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${0.10 + 0.08 * intensity})`);
        grad.addColorStop(0.6, `rgba(${c.r},${c.g},${c.b},${0.04 + 0.05 * intensity})`);
        grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
        ctx.fillStyle = grad;
        // leave a 1px gap between bars for separation
        ctx.fillRect(i * barW + 0.5, top, barW - 1, h);

        // very subtle tip — only visible when amped up by cursor
        if (intensity > 0.55) {
          ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${0.18 * (intensity - 0.55) / 0.45})`;
          ctx.fillRect(i * barW + 0.5, top, barW - 1, 1);
        }
      }

      // ---- soft cursor halo over the top ----
      if (m.active) {
        const haloR = 200 + m.kick * 80;
        const halo = ctx.createRadialGradient(mx, my, 0, mx, my, haloR);
        halo.addColorStop(0, 'rgba(240, 168, 56, 0.07)');
        halo.addColorStop(0.5, 'rgba(225, 90, 90, 0.03)');
        halo.addColorStop(1, 'rgba(225, 90, 90, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(mx, my, haloR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- particles ----
      particles.forEach(p => {
        // gentle upward drift
        p.x += p.vx;
        p.y += p.vy;
        p.twinklePhase += p.twinkleSpeed;

        if (m.active) {
          const dx = p.x - mx, dy = p.y - my;
          const dist = Math.hypot(dx, dy);
          const reach = 160;
          if (dist < reach) {
            const force = (reach - dist) / reach;
            p.vx += (dx / Math.max(dist, 1)) * force * 0.18;
            p.vy += (dy / Math.max(dist, 1)) * force * 0.18;
          }
        }
        // damping
        p.vx *= 0.96;
        p.vy *= 0.96;
        // re-add baseline upward drift
        p.vy -= 0.0015;

        // wrap
        if (p.y < -10) {
          p.y = H + 10;
          p.x = Math.random() * W;
          p.vx = (Math.random() - 0.5) * 0.2;
          p.vy = -0.04 - Math.random() * 0.18;
        }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y > H + 20) p.y = H + 20;

        const a = p.alpha * (0.5 + 0.5 * Math.sin(p.twinklePhase));
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---- dust grains ----
      ctx.fillStyle = 'rgba(40, 28, 16, 0.5)';
      grains.forEach(g => {
        g.life -= g.decay;
        if (g.life <= 0) {
          g.x = Math.random() * W;
          g.y = Math.random() * H;
          g.life = 1;
        }
        const op = Math.sin(g.life * Math.PI) * 0.3;
        if (op > 0.02) {
          ctx.globalAlpha = op;
          ctx.fillRect(g.x, g.y, 1, 1);
        }
      });
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    // mouse tracking — section scoped
    const section = canvas.closest('.spread.hero');
    const onMove = (e) => {
      const rect = section.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };
    const onLeave = () => { mouseRef.current.active = false; };
    const onDown = () => { mouseRef.current.kick = 1; };
    if (section) {
      section.addEventListener('mousemove', onMove);
      section.addEventListener('mouseleave', onLeave);
      section.addEventListener('mousedown', onDown);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (section) {
        section.removeEventListener('mousemove', onMove);
        section.removeEventListener('mouseleave', onLeave);
        section.removeEventListener('mousedown', onDown);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      aria-hidden="true"
    />
  );
}

// ---------- CUSTOM CURSOR ----------
//
// A small ink dot + a soft trailing ring. Both ease toward the true
// cursor position so motion feels analog. Stretches in the direction of
// movement and scales up on interactive elements.
//
function CustomCursor() {
  const dotRef = useRefFx(null);
  const ringRef = useRefFx(null);
  const stateRef = useRefFx({
    x: -100, y: -100,
    dx: -100, dy: -100,   // dot eased pos
    rx: -100, ry: -100,   // ring eased pos
    vx: 0, vy: 0,
    active: false, hover: false, down: false,
  });

  useEffectFx(() => {
    if (matchMedia('(hover: none)').matches) return;
    document.documentElement.classList.add('has-custom-cursor');

    const onMove = (e) => {
      const s = stateRef.current;
      s.vx = e.clientX - s.x;
      s.vy = e.clientY - s.y;
      s.x = e.clientX;
      s.y = e.clientY;
      s.active = true;
    };
    const onLeave = () => { stateRef.current.active = false; };
    const onDown = () => { stateRef.current.down = true; };
    const onUp = () => { stateRef.current.down = false; };
    const onOver = (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const interactive = t.closest('button, a, [role="button"], input[type=range], .dial, .pad, .toggle-btn, .step, .key, .preset-card, .scenario-card, .mood-card, .play-zone, summary');
      stateRef.current.hover = !!interactive;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseover', onOver);

    let raf;
    const tick = () => {
      const s = stateRef.current;
      // dot snaps to cursor (1 frame of rAF latency only)
      s.dx = s.x;
      s.dy = s.y;
      // ring eases (light trail)
      s.rx += (s.x - s.rx) * 0.4;
      s.ry += (s.y - s.ry) * 0.4;

      const speed = Math.min(1, Math.hypot(s.vx, s.vy) / 28);
      const stretch = 1 + speed * 0.55;
      const angle = Math.atan2(s.vy, s.vx) * 180 / Math.PI;

      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${s.dx}px, ${s.dy}px) translate(-50%, -50%) ${s.down ? 'scale(0.65)' : ''}`;
        dotRef.current.style.opacity = s.active ? 1 : 0;
      }
      if (ringRef.current) {
        const scale = (s.hover ? 1.85 : 1) * (s.down ? 0.85 : 1);
        ringRef.current.style.transform =
          `translate(${s.rx}px, ${s.ry}px) translate(-50%, -50%) rotate(${angle}deg) scale(${stretch * scale}, ${(2 - stretch) * scale})`;
        ringRef.current.style.opacity = s.active ? 1 : 0;
        ringRef.current.classList.toggle('is-hover', s.hover);
        ringRef.current.classList.toggle('is-down', s.down);
      }

      s.vx *= 0.78; s.vy *= 0.78;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseover', onOver);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <React.Fragment>
      <div className="cc-ring" ref={ringRef}></div>
      <div className="cc-dot" ref={dotRef}>
        <span className="cc-dot-core"></span>
      </div>
    </React.Fragment>
  );
}

// expose to other Babel scripts
Object.assign(window, { HeroBackground, CustomCursor });
