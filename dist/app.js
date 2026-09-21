(() => {
  'use strict';

  const journey = document.querySelector('.journey');
  const stage = document.querySelector('.stage');
  const scenes = [...document.querySelectorAll('.scene')].map(element => ({
    element,
    layers: [...element.querySelectorAll('.layer')].map(element => ({ element, depth: Number(element.dataset.depth) }))
  }));
  const eye = document.querySelector('.eye-space');
  const eyeDrift = document.querySelector('.eye-drift');
  const intro = document.querySelector('.copy--one');
  const second = document.querySelector('.copy--two');
  const logo = document.querySelector('.wordmark');
  const cue = document.querySelector('.scroll-cue');
  const blackout = document.querySelector('.blackout');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (start, end, value) => {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  };

  // One continuous camera move. Each foreground layer has its own depth.
  // Scene resting positions: 0, 1.15, 2.3; the pupil fills the viewport at 3.55.
  const DURATION = 3.85;
  let distance = 1;
  let target = 0;
  let position = 0;
  let pointerX = 0;
  let pointerY = 0;
  let driftX = 0;
  let driftY = 0;
  let frame = 0;
  let lastTime = 0;

  function paint(t) {
    const reduced = reducedMotion.matches;
    const values = [
      { scale: Math.exp(Math.max(0, t - 0.13) * 1.4), opacity: 1 - smooth(0.67, 1.13, t) },
      { scale: (0.94 + 0.06 * smooth(0, 1.15, t)) * Math.exp(Math.max(0, t - 1.15) * 1.45), opacity: (0.19 + 0.81 * smooth(0.5, 1.12, t)) * (1 - smooth(1.76, 2.24, t)) },
      { scale: (0.86 + 0.14 * smooth(0.8, 2.25, t)) * Math.exp(Math.max(0, t - 2.28) * 1.6), opacity: (0.09 + 0.91 * smooth(1.35, 2.2, t)) * (1 - smooth(2.65, 3.12, t)) }
    ];
    // DOM order runs from the deepest scenery to the nearest frame.
    scenes.forEach(({ element, layers }, index) => {
      const value = values[2 - index];
      element.style.opacity = value.opacity.toFixed(4);
      element.style.visibility = value.opacity < 0.001 ? 'hidden' : 'visible';
      element.style.transform = 'none';
      if (value.opacity < 0.001) return;
      layers.forEach(({ element, depth }) => {
        const scale = reduced ? 1 : Math.pow(Math.min(value.scale, 9), depth);
        const x = reduced ? 0 : driftX * 9 * depth;
        const y = reduced ? 0 : driftY * 7 * depth;
        element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
      });
    });

    const eyeVisible = smooth(1.55, 2.45, t);
    const eyeScale = reduced ? 1 : Math.exp(Math.max(0, t - 2.3) * 2.65);
    eye.style.opacity = eyeVisible.toFixed(4);
    eye.style.visibility = eyeVisible < 0.001 ? 'hidden' : 'visible';
    eye.style.transform = `scale(${eyeScale.toFixed(4)})`;
    eyeDrift.style.transform = reduced ? 'none' : `translate3d(${(driftX * 3).toFixed(2)}px,${(driftY * 2).toFixed(2)}px,0)`;

    const firstOpacity = 1 - smooth(0.15, 0.56, t);
    const secondOpacity = smooth(0.76, 1.1, t) * (1 - smooth(1.48, 1.87, t));
    intro.style.opacity = firstOpacity.toFixed(4);
    second.style.opacity = secondOpacity.toFixed(4);
    intro.style.transform = `translate(-50%,-46%) scale(${reduced ? 1 : 1 + t * 0.12})`;
    second.style.transform = `translate(-50%,-50%) scale(${reduced ? 1 : 1 + (t - 1.15) * 0.1})`;
    intro.inert = firstOpacity < 0.12;
    second.inert = secondOpacity < 0.12;
    intro.style.visibility = firstOpacity < 0.001 ? 'hidden' : 'visible';
    second.style.visibility = secondOpacity < 0.001 ? 'hidden' : 'visible';
    const logoOpacity = 1 - smooth(2.8, 3.18, t);
    logo.style.opacity = logoOpacity.toFixed(4);
    logo.inert = logoOpacity < 0.12;
    logo.style.visibility = logoOpacity < 0.001 ? 'hidden' : 'visible';
    cue.style.opacity = (1 - smooth(0.02, 0.25, t)).toFixed(4);
    blackout.style.opacity = smooth(3.12, 3.62, t).toFixed(4);
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(lastTime ? now - lastTime : 16.67, 64);
    lastTime = now;
    const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / 85);
    position += (target - position) * ease;
    driftX += (pointerX - driftX) * ease;
    driftY += (pointerY - driftY) * ease;
    const moving = Math.abs(position - target) > 0.0001 || Math.abs(pointerX - driftX) > 0.001 || Math.abs(pointerY - driftY) > 0.001;
    if (!moving) { position = target; driftX = pointerX; driftY = pointerY; }
    paint(position);
    if (moving) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(tick); }
  function updateTarget() {
    target = clamp((scrollY - journey.offsetTop) / distance) * DURATION;
    schedule();
  }
  function measure() {
    distance = Math.max(1, journey.offsetHeight - stage.offsetHeight);
    document.querySelector('#second-dream').style.top = `${distance * 1.15 / DURATION}px`;
    updateTarget();
  }

  addEventListener('scroll', updateTarget, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', () => { measure(); position = target; paint(position); });
  addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches || target > 3.1) return;
    pointerX = (event.clientX / innerWidth - 0.5) * 2;
    pointerY = (event.clientY / innerHeight - 0.5) * 2;
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; schedule(); });
  reducedMotion.addEventListener('change', () => { pointerX = 0; pointerY = 0; schedule(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else { measure(); position = target; schedule(); }
  });
  measure();
  position = target;
  paint(position);
})();
