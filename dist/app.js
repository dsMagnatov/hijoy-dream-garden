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
      inset: Number(element.dataset.inset || 0),
      entryScale: Number(element.dataset.entryScale || 0),
      entrySpread: Number(element.dataset.entrySpread || 1),
      entryTurn: Number(element.dataset.entryTurn || 0),
      lateEntry: element.dataset.lateEntry === 'true',
      flight: Number(element.dataset.flight || 0),
      flightPhase: Number(element.dataset.flightPhase || 0),
      image: element.querySelector('img'),
      position: 0, x: 0, y: 0
    }))
  }));
  const layers = scenes.flatMap(scene => scene.layers);
  const assembly = document.querySelector('.assembly');
  const assemblyCanvases = [...document.querySelectorAll('.assembly-canvas')].map(element => ({
    element,
    cameraStart: Number(element.dataset.cameraStart),
    cameraEnd: Number(element.dataset.cameraEnd),
    camera: Number(element.dataset.camera)
  }));
  const pieces = [...document.querySelectorAll('.assembly-piece')].map(element => ({
    element,
    start: Number(element.dataset.start), span: Number(element.dataset.span),
    fromX: Number(element.dataset.fromX), fromY: Number(element.dataset.fromY),
    scale: Number(element.dataset.scale), turn: Number(element.dataset.turn),
    depth: Number(element.dataset.depth), lag: Number(element.dataset.lag),
    drift: Number(element.dataset.drift),
    end: element.dataset.end ? Number(element.dataset.end) : Infinity,
    exitSpan: Number(element.dataset.exitSpan || 1),
    exitX: Number(element.dataset.exitX || 0),
    exitY: Number(element.dataset.exitY || 0),
    exitScale: Number(element.dataset.exitScale || 1),
    exitTurn: Number(element.dataset.exitTurn || 0),
    position: 0, x: 0, y: 0
  }));
  const lookCards = [...document.querySelectorAll('.look-card')].map(element => ({
    element,
    start: Number(element.dataset.start),
    span: Number(element.dataset.span),
    end: element.dataset.end ? Number(element.dataset.end) : Infinity,
    exitSpan: Number(element.dataset.exitSpan || .6)
  }));
  const movingLayers = [...layers, ...pieces];
  const eye = document.querySelector('.eye-space');
  const eyeDrift = document.querySelector('.eye-drift');
  const intro = document.querySelector('.copy--one');
  const firstTitle = intro.querySelector('h1');
  const details = document.querySelector('.intro-details');
  const second = document.querySelector('.copy--two');
  const secondTitle = second.querySelector('h2');
  const logo = document.querySelector('.wordmark');
  const blackout = document.querySelector('.blackout');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (start, end, value) => {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  };
  const DURATION = 12.6;
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
        const settled = smooth(-1.25, 0, localLayer);
        const approach = scene.start === 0 ? 1 : .67 + .33 * settled;
        // Second-scene artwork starts oversized and closer to the middle,
        // then shrinks and unwinds into its authored positions at the edges.
        const arrivalScale = layer.entryScale ? 1 + (layer.entryScale - 1) * (1 - settled) : approach;
        const spread = layer.entryScale ? layer.entrySpread + (1 - layer.entrySpread) * settled : approach;
        const handEntry = layer.lateEntry ? smooth(-.6, -.08, localLayer) : 1;
        const entryRotation = layer.entryTurn * (1 - (layer.lateEntry ? handEntry : settled));
        const scale = reduced ? 1 : (layer.lateEntry ? 1.1 - .1 * handEntry : arrivalScale) * (1 + travel * (.21 + layer.depth * .13));
        const arc = Math.sin(clamp(exit / 1.38) * Math.PI) * layer.arc;
        const flightPhase = localLayer * 4.7 + layer.flightPhase;
        const flightX = layer.flight * width * .072 * (Math.sin(flightPhase) - Math.sin(layer.flightPhase));
        const flightY = Math.abs(layer.flight) * height * .048 * (Math.sin(flightPhase * 1.5) - Math.sin(layer.flightPhase * 1.5));
        const flightBank = layer.flight * 15 * Math.sin(localLayer * 5.4);
        const handX = layer.lateEntry ? -(layer.homeX * width + layer.elementWidth * .8 + width * .08) * (1 - handEntry) : 0;
        const handY = layer.lateEntry ? height * .14 * (1 - handEntry) : 0;
        const x = width * layer.insetX + (reduced ? 0 : width * (layer.exitX / 100 * travel + (layer.homeX - .5) * (spread - 1)) + layer.x * layer.pointer + arc + handX + flightX);
        const y = reduced ? 0 : height * (layer.exitY / 100 * travel + (layer.homeY - .5) * (spread - 1)) + layer.y * layer.pointer * .7 - arc * .42 + handY + flightY;
        const rotation = layer.angle + (reduced ? 0 : entryRotation + layer.turn * smooth(0, 1.34, exit) + layer.x * layer.depth * 1.35 + flightBank);
        layer.element.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
        layer.element.style.opacity = layer.lateEntry ? handEntry.toFixed(4) : '1';
        if (layer.flight) {
          // Gentle scroll-linked wing foreshortening; no perpetual animation.
          const wing = reduced ? 1 : .9 + .1 * Math.cos(flightPhase * 2.6);
          layer.image.style.transform = `scaleX(${wing.toFixed(4)})`;
        }
      }
    }

    // The flower approaches continuously from the second scene into the finale.
    const eyeVisible = smooth(.78, 2.6, t);
    const eyeTime = Math.min(t, 4.45);
    const eyeScale = reduced ? 1 : .32 * Math.exp(Math.max(0, eyeTime - .85) * .66 + Math.max(0, eyeTime - 2.76) * 2.07);
    const eyeParallax = 1 - smooth(2.8, 3.4, t);
    eye.style.opacity = eyeVisible.toFixed(4);
    eye.style.visibility = eyeVisible < .001 ? 'hidden' : 'visible';
    eye.style.transform = `scale(${eyeScale.toFixed(4)})`;
    eyeDrift.style.transform = reduced ? 'none' : `translate3d(${(driftX * 8 * eyeParallax).toFixed(2)}px,${(driftY * 5 * eyeParallax).toFixed(2)}px,0)`;

    // Headlines move toward the camera independently of the downward details.
    const firstFlight = clamp((t - .1) / .6);
    const secondFlight = clamp((t - 1.37) / .75);
    const firstOpacity = 1 - smooth(.38, .7, t);
    const secondOpacity = smooth(1.12, 1.32, t) * (1 - smooth(1.72, 2.12, t));
    const firstScale = reduced ? 1 : Math.exp(Math.log(2.2) * Math.pow(firstFlight, 1.45));
    const secondScale = reduced ? 1 : Math.exp(Math.log(2.4) * Math.pow(secondFlight, 1.45));
    const detailsExit = smooth(.02, .65, t);
    const detailsOpacity = 1 - smooth(.4, .7, t);
    firstTitle.style.opacity = firstOpacity.toFixed(4);
    second.style.opacity = secondOpacity.toFixed(4);
    firstTitle.style.transform = `translate3d(0,${reduced ? 0 : (height * .05 * firstFlight).toFixed(2)}px,0) scale(${firstScale.toFixed(4)})`;
    secondTitle.style.transform = `scale(${secondScale.toFixed(4)})`;
    details.style.transform = `translate3d(0,${reduced ? 0 : (height * .85 * detailsExit).toFixed(2)}px,0)`;
    details.style.opacity = detailsOpacity.toFixed(4);
    details.inert = detailsExit > .12;
    details.style.visibility = detailsOpacity < .001 ? 'hidden' : 'visible';
    intro.inert = firstOpacity < .12;
    second.inert = secondOpacity < .12;
    intro.style.visibility = firstOpacity < .001 ? 'hidden' : 'visible';
    second.style.visibility = secondOpacity < .001 ? 'hidden' : 'visible';
    const logoOpacity = 1 - smooth(3.13, 3.63, t);
    logo.style.opacity = logoOpacity.toFixed(4);
    logo.inert = logoOpacity < .12;
    logo.style.visibility = logoOpacity < .001 ? 'hidden' : 'visible';
    blackout.style.opacity = smooth(3.8, 4.31, t).toFixed(4);

    // Numbered exports assemble on their shared canvas after the eye passage.
    // Arrival order differs from stacking order: the final wall stays behind
    // the people, while the first garden layer remains in the foreground.
    const assemblyVisible = smooth(4.35, 4.48, t);
    assembly.style.opacity = assemblyVisible.toFixed(4);
    assembly.style.visibility = assemblyVisible < .001 ? 'hidden' : 'visible';
    for (const canvas of assemblyCanvases) {
      const camera = reduced ? 1 : 1 + canvas.camera * smooth(canvas.cameraStart, canvas.cameraEnd, t);
      canvas.element.style.transform = `translateX(-50%) scale(${camera.toFixed(4)})`;
    }
    for (const piece of pieces) {
      const arrival = smooth(piece.start, piece.start + piece.span, piece.position);
      const reveal = smooth(piece.start, piece.start + piece.span * .45, piece.position);
      const exit = Number.isFinite(piece.end) ? smooth(piece.end, piece.end + piece.exitSpan, piece.position) : 0;
      const restEnd = Number.isFinite(piece.end) ? piece.end : DURATION;
      const rest = smooth(piece.start + piece.span, restEnd, piece.position);
      const pointerWeight = arrival * (1 - exit);
      const x = reduced ? 0 : width * (piece.fromX / 100 * (1 - arrival) + piece.exitX / 100 * exit) + piece.x * piece.depth * 34 * pointerWeight;
      const y = reduced ? 0 : height * (piece.fromY / 100 * (1 - arrival) + piece.drift / 100 * rest + piece.exitY / 100 * exit) + piece.y * piece.depth * 19 * pointerWeight;
      const settledScale = piece.scale + (1 - piece.scale) * arrival;
      const scale = reduced ? 1 : settledScale + (piece.exitScale - settledScale) * exit;
      const rotation = reduced ? 0 : piece.turn * (1 - arrival) + piece.exitTurn * exit;
      // Pieces stay crisp while moving apart; they fade only as they leave the
      // frame, avoiding a dark semi-transparent ghost during the handoff.
      const exitFade = Number.isFinite(piece.end) ? smooth(piece.end + piece.exitSpan * .72, piece.end + piece.exitSpan, piece.position) : 0;
      const opacity = reveal * (1 - exitFade);
      piece.element.style.opacity = opacity.toFixed(4);
      piece.element.style.visibility = opacity < .001 ? 'hidden' : 'visible';
      piece.element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
    }

    // Product notes sit in the negative space of each completed composition.
    // Their restrained counter-parallax keeps the typography readable while
    // the surrounding artwork continues to move at deeper speeds.
    for (const card of lookCards) {
      const arrival = smooth(card.start, card.start + card.span, t);
      const departure = Number.isFinite(card.end) ? smooth(card.end, card.end + card.exitSpan, t) : 0;
      const opacity = arrival * (1 - departure);
      const lingerEnd = Number.isFinite(card.end) ? card.end : DURATION;
      const linger = smooth(card.start + card.span, lingerEnd, t);
      const x = reduced ? 0 : width * (.035 * (1 - arrival) + .075 * departure) - driftX * 5;
      const y = reduced ? 0 : 18 * (1 - arrival) - height * .008 * linger - driftY * 3;
      const scale = reduced ? 1 : .965 + .035 * arrival - .025 * departure;
      const blur = reduced ? 0 : (1 - arrival) * 5 + departure * 3;
      card.element.style.opacity = opacity.toFixed(4);
      card.element.style.visibility = opacity < .001 ? 'hidden' : 'visible';
      card.element.style.filter = blur < .01 ? 'none' : `blur(${blur.toFixed(2)}px)`;
      card.element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
      card.element.setAttribute('aria-hidden', opacity < .05 ? 'true' : 'false');
    }
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
    for (const layer of movingLayers) {
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
    for (const layer of movingLayers) { layer.position = target; layer.x = pointerX; layer.y = pointerY; }
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
      const authoredX = layer.element.offsetLeft / width;
      layer.insetX = (.5 - authoredX) * layer.inset;
      layer.homeX = authoredX + layer.insetX;
      layer.homeY = layer.element.offsetTop / height;
      layer.elementWidth = layer.element.offsetWidth;
    }
    distance = Math.max(1, journey.offsetHeight - height);
    document.querySelector('#second-dream').style.top = `${distance * SECOND_SCENE / DURATION}px`;
    updateTarget();
  }

  addEventListener('scroll', updateTarget, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', () => { measure(); snap(); paint(position); });
  addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch' || reducedMotion.matches || (target > 3.65 && target < 4.35)) return;
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
