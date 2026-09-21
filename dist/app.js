(() => {
  'use strict';

  const journey = document.querySelector('.journey');
  const stage = document.querySelector('.stage');
  const scenes = [...document.querySelectorAll('.scene')].map(element => ({
    element,
    start: Number(element.dataset.start),
    layers: [...element.querySelectorAll('.layer')].map(element => ({
      element,
      depth: Number(element.dataset.depth),
      exitX: Number(element.dataset.exitX),
      exitY: Number(element.dataset.exitY),
      turn: Number(element.dataset.turn),
      delay: Number(element.dataset.delay),
      lag: Number(element.dataset.lag),
      pointer: Number(element.dataset.pointer),
      arc: Number(element.dataset.arc),
      angle: Number(element.dataset.angle),
      position: 0, x: 0, y: 0
    }))
  }));
  const layers = scenes.flatMap(scene => scene.layers);
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
  const DURATION = 4.45;
  const SECOND_SCENE = 1.3;
  let distance = 1;
  let width = innerWidth;
  let height = innerHeight;
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
    for (const scene of scenes) {
      const local = t - scene.start;
      // Deeper compositions remain visible through the foreground. They
      // become opaque and come into focus as the camera approaches them.
      const clarity = scene.start === 0 ? 1 : smooth(-1.3, 0, local);
      const distantOpacity = scene.start === SECOND_SCENE ? .22 : .09;
      const entrance = scene.start === 0 ? 1 : distantOpacity + (1 - distantOpacity) * clarity;
      const opacity = entrance * (1 - smooth(1.05, 1.4, local));
      scene.element.style.opacity = opacity.toFixed(4);
      const blur = (1 - clarity) * (scene.start === SECOND_SCENE ? 1.6 : 2.3);
      scene.element.style.filter = blur < .01 ? 'none' : `blur(${blur.toFixed(2)}px)`;
      scene.element.style.visibility = opacity < .001 ? 'hidden' : 'visible';
      if (opacity < .001) continue;

      for (const layer of scene.layers) {
        const localLayer = layer.position - scene.start;
        const exit = Math.max(0, localLayer - .1 - layer.delay);
        const travel = Math.pow(exit, 1.14) * (.56 + layer.depth * .48);
        const approach = scene.start === 0 ? 1 : .67 + .33 * smooth(-1.25, 0, localLayer);
        const scale = reduced ? 1 : approach * (1 + travel * (.21 + layer.depth * .13));
        const arc = Math.sin(clamp(exit / 1.38) * Math.PI) * layer.arc;
        const x = reduced ? 0 : width * (layer.exitX / 100 * travel + (layer.homeX - .5) * (approach - 1)) + layer.x * layer.pointer + arc;
        const y = reduced ? 0 : height * (layer.exitY / 100 * travel + (layer.homeY - .5) * (approach - 1)) + layer.y * layer.pointer * .7 - arc * .42;
        const rotation = layer.angle + (reduced ? 0 : layer.turn * smooth(0, 1.34, exit) + layer.x * layer.depth * 1.35);
        layer.element.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      }
    }

    const eyeVisible = smooth(1.96, 2.65, t);
    const eyeScale = reduced ? 1 : Math.exp(Math.max(0, t - 2.76) * 2.73);
    const eyeParallax = 1 - smooth(2.8, 3.4, t);
    eye.style.opacity = eyeVisible.toFixed(4);
    eye.style.visibility = eyeVisible < .001 ? 'hidden' : 'visible';
    eye.style.transform = `scale(${eyeScale.toFixed(4)})`;
    eyeDrift.style.transform = reduced ? 'none' : `translate3d(${(driftX * 8 * eyeParallax).toFixed(2)}px,${(driftY * 5 * eyeParallax).toFixed(2)}px,0)`;

    const firstOpacity = 1 - smooth(.18, .63, t);
    const secondOpacity = smooth(.99, 1.3, t) * (1 - smooth(1.66, 2.02, t));
    intro.style.opacity = firstOpacity.toFixed(4);
    second.style.opacity = secondOpacity.toFixed(4);
    intro.style.transform = `translate(-50%,-46%) scale(${reduced ? 1 : 1 + t * .12})`;
    second.style.transform = `translate(-50%,-50%) scale(${reduced ? 1 : 1 + (t - 1.3) * .1})`;
    intro.inert = firstOpacity < .12;
    second.inert = secondOpacity < .12;
    intro.style.visibility = firstOpacity < .001 ? 'hidden' : 'visible';
    second.style.visibility = secondOpacity < .001 ? 'hidden' : 'visible';
    const logoOpacity = 1 - smooth(3.13, 3.63, t);
    logo.style.opacity = logoOpacity.toFixed(4);
    logo.inert = logoOpacity < .12;
    logo.style.visibility = logoOpacity < .001 ? 'hidden' : 'visible';
    cue.style.opacity = (1 - smooth(.02, .27, t)).toFixed(4);
    blackout.style.opacity = smooth(3.8, 4.31, t).toFixed(4);
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(lastTime ? now - lastTime : 16.67, 64);
    lastTime = now;
    const reduced = reducedMotion.matches;
    const ease = reduced ? 1 : 1 - Math.exp(-dt / 90);
    position += (target - position) * ease;
    driftX += (pointerX - driftX) * ease;
    driftY += (pointerY - driftY) * ease;
    let moving = Math.abs(position - target) > .0001 || Math.abs(pointerX - driftX) > .001 || Math.abs(pointerY - driftY) > .001;
    // Separate inertia makes the light foreground and distant framing react
    // at different rates without taking over native scrolling or touch input.
    for (const layer of layers) {
      const response = reduced ? 1 : 1 - Math.exp(-dt / layer.lag);
      layer.position += (target - layer.position) * response;
      layer.x += (pointerX - layer.x) * response;
      layer.y += (pointerY - layer.y) * response;
      moving ||= Math.abs(layer.position - target) > .0001 || Math.abs(layer.x - pointerX) > .001 || Math.abs(layer.y - pointerY) > .001;
    }
    if (!moving) snap();
    paint(position);
    if (moving) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  function snap() {
    position = target; driftX = pointerX; driftY = pointerY;
    for (const layer of layers) { layer.position = target; layer.x = pointerX; layer.y = pointerY; }
  }
  function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function updateTarget() {
    target = clamp((scrollY - journey.offsetTop) / distance) * DURATION;
    schedule();
  }
  function measure() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    for (const layer of layers) {
      layer.homeX = layer.element.offsetLeft / width;
      layer.homeY = layer.element.offsetTop / height;
    }
    distance = Math.max(1, journey.offsetHeight - height);
    document.querySelector('#second-dream').style.top = `${distance * SECOND_SCENE / DURATION}px`;
    updateTarget();
  }

  addEventListener('scroll', updateTarget, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', () => { measure(); snap(); paint(position); });
  addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch' || reducedMotion.matches || target > 3.65) return;
    pointerX = (event.clientX / innerWidth - .5) * 2;
    pointerY = (event.clientY / innerHeight - .5) * 2;
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; schedule(); });
  reducedMotion.addEventListener('change', () => { pointerX = 0; pointerY = 0; snap(); schedule(); });
  finePointer.addEventListener('change', () => { pointerX = 0; pointerY = 0; schedule(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else { measure(); snap(); schedule(); }
  });
  measure();
  snap();
  paint(position);
})();
