const planets = {
  earth: { name: "Earth", gravity: 9.81, theme: "earth" },
  moon: { name: "Moon", gravity: 1.62, theme: "moon" },
  mars: { name: "Mars", gravity: 3.71, theme: "mars" },
  jupiter: { name: "Jupiter", gravity: 24.79, theme: "jupiter" }
};

const objects = {
  basketball: { radius: 17 },
  feather: { radius: 15 },
  hammer: { radius: 18 },
  bowlingBall: { radius: 21 },
  astronaut: { radius: 22 },
  human: { radius: 19 },
  car: { radius: 25 }
};

const facts = [
  "You would weigh about 83% less on the Moon.",
  "Apollo astronauts moved using hopping strides because of reduced gravity.",
  "Gravity on Mars is about 38% of Earth's gravity.",
  "A hammer and feather fall together on the Moon because there is almost no air resistance.",
  "Jupiter's gravity is more than twice Earth's, so jumps become dramatically shorter.",
  "Fall time grows with the square root of height, not in a straight line.",
  "Throwing at the same speed sends objects much farther in low gravity."
];

const canvases = {
  left: document.getElementById("earthCanvas"),
  right: document.getElementById("moonCanvas"),
  heightGraph: document.getElementById("heightGraph"),
  velocityGraph: document.getElementById("velocityGraph")
};

const ctx = {
  left: canvases.left.getContext("2d"),
  right: canvases.right.getContext("2d"),
  heightGraph: canvases.heightGraph.getContext("2d"),
  velocityGraph: canvases.velocityGraph.getContext("2d")
};

const ui = {
  start: document.getElementById("startBtn"),
  pause: document.getElementById("pauseBtn"),
  reset: document.getElementById("resetBtn"),
  fullscreen: document.getElementById("fullscreenBtn"),
  trailToggle: document.getElementById("trailToggle"),
  object: document.getElementById("objectSelect"),
  experiment: document.getElementById("experimentSelect"),
  height: document.getElementById("heightSlider"),
  force: document.getElementById("forceSlider"),
  speed: document.getElementById("speedSlider"),
  heightValue: document.getElementById("heightValue"),
  forceValue: document.getElementById("forceValue"),
  speedValue: document.getElementById("speedValue"),
  factText: document.getElementById("factText"),
  fps: document.getElementById("fpsCounter"),
  rightWorldName: document.getElementById("rightWorldName"),
  rightGravity: document.getElementById("rightGravity"),
  rightTelemetryTitle: document.getElementById("rightTelemetryTitle"),
  fallInsight: document.getElementById("fallInsight"),
  jumpInsight: document.getElementById("jumpInsight"),
  hangInsight: document.getElementById("hangInsight"),
  distanceInsight: document.getElementById("distanceInsight"),
  earthVelocity: document.getElementById("earthVelocity"),
  earthMaxVelocity: document.getElementById("earthMaxVelocity"),
  earthHeight: document.getElementById("earthHeight"),
  earthPeakHeight: document.getElementById("earthPeakHeight"),
  earthTime: document.getElementById("earthTime"),
  earthGravity: document.getElementById("earthGravity"),
  earthDistance: document.getElementById("earthDistance"),
  moonVelocity: document.getElementById("moonVelocity"),
  moonMaxVelocity: document.getElementById("moonMaxVelocity"),
  moonHeight: document.getElementById("moonHeight"),
  moonPeakHeight: document.getElementById("moonPeakHeight"),
  moonTime: document.getElementById("moonTime"),
  moonGravity: document.getElementById("moonGravity"),
  moonDistance: document.getElementById("moonDistance")
};

const state = {
  running: false,
  trailsEnabled: true,
  rightPlanet: "moon",
  factIndex: 0,
  lastFrame: 0,
  lastDomUpdate: 0,
  lastGraphDraw: 0,
  fpsFrames: 0,
  fpsLast: 0,
  fpsValue: 60,
  sceneCache: { left: null, right: null },
  worlds: {
    left: createWorld("earth"),
    right: createWorld("moon")
  }
};

function createWorld(planetKey) {
  return {
    planetKey,
    t: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    groundY: 0,
    startHeight: 18,
    completed: false,
    currentHeight: 0,
    currentVelocity: 0,
    maxVelocity: 0,
    peakHeight: 0,
    distanceTraveled: 0,
    horizontalDistance: 0,
    landingTime: 0,
    trail: [],
    graph: [],
    impacts: [],
    dust: []
  };
}

function metersToPixels(canvas) {
  return Math.min(canvas.width, canvas.height) / 52;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
}

function resizeCanvases() {
  Object.values(canvases).forEach(resizeCanvas);
  invalidateSceneCache();
  resetSimulation(false);
}

function invalidateSceneCache() {
  state.sceneCache.left = null;
  state.sceneCache.right = null;
}

function createLayer(width, height) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getSceneLayer(worldKey, planet) {
  const canvas = canvases[worldKey];
  const cached = state.sceneCache[worldKey];
  if (cached && cached.width === canvas.width && cached.height === canvas.height && cached.theme === planet.theme) return cached.layer;
  const layer = createLayer(canvas.width, canvas.height);
  const layerCtx = layer.getContext("2d");
  drawStaticScene(layerCtx, layer, planet, worldKey);
  state.sceneCache[worldKey] = { width: canvas.width, height: canvas.height, theme: planet.theme, layer };
  return layer;
}

function resetWorld(worldKey, planetKey) {
  const canvas = canvases[worldKey];
  const world = state.worlds[worldKey];
  const scale = metersToPixels(canvas);
  const groundY = canvas.height - Math.max(54, canvas.height * 0.13);
  const height = Number(ui.height.value);
  const force = Number(ui.force.value);
  const experiment = ui.experiment.value;

  Object.assign(world, {
    planetKey,
    t: 0,
    groundY,
    startHeight: height,
    completed: false,
    currentHeight: experiment === "drop" ? height : 0,
    currentVelocity: 0,
    maxVelocity: 0,
    peakHeight: experiment === "drop" ? height : 0,
    distanceTraveled: 0,
    horizontalDistance: 0,
    landingTime: 0,
    trail: [],
    graph: [],
    impacts: [],
    dust: []
  });

  if (experiment === "throw") {
    world.x = canvas.width * 0.12;
    world.y = groundY - 4 * scale;
    world.vx = force * Math.cos(Math.PI / 4);
    world.vy = force * Math.sin(Math.PI / 4);
  } else if (experiment === "jump") {
    world.x = canvas.width * 0.5;
    world.y = groundY;
    world.vx = 0;
    world.vy = force * 0.55;
  } else {
    world.x = canvas.width * 0.5;
    world.y = groundY - height * scale;
    world.vx = 0;
    world.vy = 0;
  }
  keepObjectInView(worldKey);
  recordSample(world);
}

function resetSimulation(stop = true) {
  if (stop) state.running = false;
  resetWorld("left", "earth");
  resetWorld("right", state.rightPlanet);
  updatePlanetLabels();
  updateControlReadouts();
  updateDom(true);
  drawGraphs();
  drawAll(performance.now());
}

function startSimulation() {
  if (state.worlds.left.completed && state.worlds.right.completed) resetSimulation(false);
  state.running = true;
  state.lastFrame = performance.now();
}

function pauseSimulation() {
  state.running = false;
}

function updateWorld(worldKey, dt) {
  const world = state.worlds[worldKey];
  const planet = planets[world.planetKey];
  updateEffects(world, dt, planet.gravity);
  if (world.completed) return;

  const canvas = canvases[worldKey];
  const scale = metersToPixels(canvas);
  const experiment = ui.experiment.value;
  const previousX = world.x;
  const previousY = world.y;

  world.t += dt;

  if (experiment === "drop") {
    // Drop test: s = 1/2 * g * t^2 and v = g * t for vertical motion from rest.
    const distance = 0.5 * planet.gravity * world.t * world.t;
    world.currentVelocity = planet.gravity * world.t;
    world.distanceTraveled = Math.min(distance, world.startHeight);
    world.currentHeight = Math.max(world.startHeight - distance, 0);
    world.y = world.groundY - world.currentHeight * scale;
    if (distance >= world.startHeight) completeWorld(worldKey);
  }

  if (experiment === "jump") {
    // Jump test: velocity changes by gravity over delta time, then height follows the integrated position.
    world.vy -= planet.gravity * dt;
    world.y -= world.vy * scale * dt;
    world.currentHeight = Math.max((world.groundY - world.y) / scale, 0);
    world.peakHeight = Math.max(world.peakHeight, world.currentHeight);
    world.distanceTraveled += Math.abs(world.y - previousY) / scale;
    world.currentVelocity = Math.abs(world.vy);
    if (world.y >= world.groundY && world.t > 0.05) completeWorld(worldKey);
  }

  if (experiment === "throw") {
    // Throw test: projectile motion integrates horizontal velocity and gravity-driven vertical velocity.
    world.vy -= planet.gravity * dt;
    world.x += world.vx * scale * dt;
    world.y -= world.vy * scale * dt;
    world.currentHeight = Math.max((world.groundY - world.y) / scale, 0);
    world.peakHeight = Math.max(world.peakHeight, world.currentHeight);
    world.horizontalDistance = Math.max((world.x - canvas.width * 0.12) / scale, 0);
    world.distanceTraveled += Math.hypot(world.x - previousX, world.y - previousY) / scale;
    world.currentVelocity = Math.hypot(world.vx, world.vy);
    if (world.y >= world.groundY || world.x > canvas.width - objects[ui.object.value].radius * 2) completeWorld(worldKey);
  }

  world.maxVelocity = Math.max(world.maxVelocity, world.currentVelocity);
  keepObjectInView(worldKey);
  recordSample(world);
}

function keepObjectInView(worldKey) {
  const canvas = canvases[worldKey];
  const world = state.worlds[worldKey];
  const radius = objects[ui.object.value].radius * Math.min(window.devicePixelRatio || 1, 2);
  world.x = Math.max(radius * 2, Math.min(canvas.width - radius * 2, world.x));
  world.y = Math.max(radius * 2.5, Math.min(world.groundY, world.y));
}

function completeWorld(worldKey) {
  const world = state.worlds[worldKey];
  const planet = planets[world.planetKey];
  world.y = world.groundY;
  world.currentHeight = 0;
  world.currentVelocity = Math.max(world.currentVelocity, 0);
  world.completed = true;
  world.landingTime = world.t;
  addImpact(world, planet.theme);
  recordSample(world);
}

function recordSample(world) {
  world.trail.push({ x: world.x, y: world.y, age: 0 });
  if (world.trail.length > 96) world.trail.shift();
  const last = world.graph[world.graph.length - 1];
  if (!last || world.t - last.t > 0.07 || world.completed) {
    world.graph.push({ t: world.t, h: world.currentHeight, v: world.currentVelocity });
    if (world.graph.length > 120) world.graph.shift();
  }
}

function addImpact(world, theme) {
  world.impacts.push({ age: 0, radius: 6, alpha: 1 });
  const isMoon = theme !== "earth";
  const count = isMoon ? 18 : 9;
  for (let i = 0; i < count; i++) {
    world.dust.push({
      x: world.x,
      y: world.groundY,
      vx: (Math.random() - 0.5) * (isMoon ? 82 : 46),
      vy: -Math.random() * (isMoon ? 78 : 42),
      age: 0,
      life: 0.45 + Math.random() * 0.48,
      size: 1.3 + Math.random() * 2.5
    });
  }
}

function updateEffects(world, dt, gravity) {
  world.trail.forEach((point) => { point.age += dt; });
  world.trail = world.trail.filter((point) => point.age < 3.2);

  world.impacts.forEach((impact) => {
    impact.age += dt;
    impact.radius += dt * 160;
    impact.alpha = Math.max(0, 1 - impact.age / 0.65);
  });
  world.impacts = world.impacts.filter((impact) => impact.alpha > 0);

  world.dust.forEach((dust) => {
    dust.age += dt;
    dust.vy += gravity * 10 * dt;
    dust.x += dust.vx * dt;
    dust.y += dust.vy * dt;
  });
  world.dust = world.dust.filter((dust) => dust.age < dust.life);
}

function animationLoop(now) {
  const dtRaw = Math.min((now - state.lastFrame) / 1000 || 0, 0.05);
  state.lastFrame = now;
  updateFps(now);

  if (state.running) {
    const dt = dtRaw * Number(ui.speed.value);
    updateWorld("left", dt);
    updateWorld("right", dt);
    if (state.worlds.left.completed && state.worlds.right.completed) state.running = false;
  } else {
    updateEffects(state.worlds.left, dtRaw, planets.earth.gravity);
    updateEffects(state.worlds.right, dtRaw, planets[state.rightPlanet].gravity);
  }

  drawAll(now);
  if (now - state.lastDomUpdate > 100) updateDom(false, now);
  if (now - state.lastGraphDraw > 120) {
    drawGraphs();
    state.lastGraphDraw = now;
  }
  requestAnimationFrame(animationLoop);
}

function updateFps(now) {
  state.fpsFrames += 1;
  if (!state.fpsLast) state.fpsLast = now;
  if (now - state.fpsLast >= 500) {
    state.fpsValue = Math.round((state.fpsFrames * 1000) / (now - state.fpsLast));
    state.fpsFrames = 0;
    state.fpsLast = now;
  }
}

function drawAll(now) {
  drawWorld("left", planets.earth, now, "#62c8ff");
  drawWorld("right", planets[state.rightPlanet], now, "#ffd36e");
}

function drawWorld(worldKey, planet, now, trailColor) {
  const canvas = canvases[worldKey];
  const context = ctx[worldKey];
  const world = state.worlds[worldKey];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(getSceneLayer(worldKey, planet), 0, 0);
  drawAnimatedScene(context, canvas, planet, now);
  if (state.trailsEnabled) drawTrail(context, world, trailColor);
  drawHeightMarker(context, canvas, world);
  drawImpactEffects(context, world, planet);
  drawObject(context, world.x, world.y, ui.object.value, now);
  drawVignette(context, canvas, planet);
}

function drawStaticScene(context, canvas, planet, worldKey) {
  const w = canvas.width;
  const h = canvas.height;
  const world = state.worlds[worldKey];
  const ground = world.groundY || h * 0.87;

  if (planet.theme === "earth") {
    const sky = context.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#4f9fff");
    sky.addColorStop(0.38, "#91dfff");
    sky.addColorStop(0.72, "#e5f8ff");
    sky.addColorStop(1, "#4aae71");
    context.fillStyle = sky;
    context.fillRect(0, 0, w, h);
    drawSun(context, w * 0.82, h * 0.16, h * 0.055);
    drawCloudLayer(context, w, h, 0, 0.2, 1, "rgba(255,255,255,0.84)");
    drawCloudLayer(context, w, h, 400, 0.34, 0.72, "rgba(230,246,255,0.52)");
    drawEarthGround(context, w, h, ground);
  } else {
    const space = context.createLinearGradient(0, 0, 0, h);
    space.addColorStop(0, planet.theme === "mars" ? "#3f140e" : planet.theme === "jupiter" ? "#121827" : "#02040b");
    space.addColorStop(0.63, planet.theme === "mars" ? "#9a3412" : planet.theme === "jupiter" ? "#9a5b24" : "#111827");
    space.addColorStop(1, planet.theme === "mars" ? "#5b1a0c" : planet.theme === "jupiter" ? "#6b3f1d" : "#4b5563");
    context.fillStyle = space;
    context.fillRect(0, 0, w, h);
    drawStaticStars(context, w, h, planet.theme);
    if (planet.theme === "jupiter") drawJupiterBands(context, w, h, 0);
    drawLunarTerrain(context, w, h, ground, planet.theme);
  }
}

function drawAnimatedScene(context, canvas, planet, now) {
  const w = canvas.width;
  const h = canvas.height;
  if (planet.theme === "earth") {
    context.save();
    context.globalAlpha = 0.34 + Math.sin(now / 1800) * 0.06;
    drawCloudLayer(context, w, h, now, 0.28, 0.55, "rgba(255,255,255,0.42)");
    context.restore();
  } else {
    drawParallaxStars(context, w, h, now, planet.theme);
    drawSpaceParticles(context, w, h, now, planet.theme);
    if (planet.theme === "mars") drawDustSweep(context, w, h, now);
    if (planet.theme === "jupiter") drawJupiterBands(context, w, h, now);
  }
}

function drawSun(context, x, y, radius) {
  const glow = context.createRadialGradient(x, y, 0, x, y, radius * 3.1);
  glow.addColorStop(0, "rgba(255,242,173,0.95)");
  glow.addColorStop(1, "rgba(255,242,173,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius * 3.1, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fde68a";
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawCloudLayer(context, w, h, now, yRatio, scale, color) {
  context.save();
  context.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const x = ((i * w * 0.27 + now * 0.018 * scale) % (w + 220)) - 110;
    const y = h * yRatio + Math.sin(now / 900 + i) * 10;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    [-42, -8, 28, 62].forEach((offset, index) => {
      context.beginPath();
      context.arc(offset, index % 2 ? -12 : 0, index % 2 ? 34 : 26, 0, Math.PI * 2);
      context.fill();
    });
    context.fillRect(-70, -4, 150, 31);
    context.restore();
  }
  context.restore();
}

function drawEarthGround(context, w, h, ground) {
  context.fillStyle = "#236143";
  context.fillRect(0, ground, w, h - ground);
  context.fillStyle = "#58c77a";
  context.fillRect(0, ground, w, 12);
  context.fillStyle = "rgba(12,54,36,0.34)";
  context.beginPath();
  context.moveTo(0, ground + 28);
  for (let x = 0; x <= w; x += 70) {
    context.lineTo(x, ground + 18 + Math.sin(x * 0.02) * 10);
  }
  context.lineTo(w, h);
  context.lineTo(0, h);
  context.closePath();
  context.fill();
}

function drawStaticStars(context, w, h, theme) {
  if (theme === "earth") return;
  context.fillStyle = theme === "mars" ? "#fed7aa" : "#dbeafe";
  for (let i = 0; i < 64; i++) {
    const x = (i * 97) % w;
    const y = (i * 53) % (h * 0.72);
    context.globalAlpha = 0.35 + (i % 4) * 0.12;
    context.beginPath();
    context.arc(x, y, 0.9 + (i % 3) * 0.45, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawParallaxStars(context, w, h, now, theme) {
  if (theme === "earth") return;
  context.save();
  context.fillStyle = theme === "mars" ? "#fed7aa" : "#dbeafe";
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 26; i++) {
      const x = (i * 139 + layer * 61 + now * 0.006 * (layer + 1)) % w;
      const y = (i * 71 + layer * 83) % (h * 0.7);
      context.globalAlpha = 0.18 + layer * 0.16 + Math.sin(now / 800 + i) * 0.08;
      context.beginPath();
      context.arc(x, y, 0.8 + layer * 0.7, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawSpaceParticles(context, w, h, now, theme) {
  if (theme === "earth") return;
  context.save();
  context.fillStyle = theme === "mars" ? "rgba(254,215,170,0.5)" : "rgba(226,232,240,0.5)";
  for (let i = 0; i < 16; i++) {
    const x = (i * 181 + now * 0.018) % w;
    const y = h * 0.18 + ((i * 79 + now * 0.014) % (h * 0.58));
    context.globalAlpha = 0.12 + (i % 4) * 0.05;
    context.beginPath();
    context.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawLunarTerrain(context, w, h, ground, theme) {
  const base = theme === "mars" ? "#7c2d12" : theme === "jupiter" ? "#4a2f1f" : "#575f6b";
  const ridge = theme === "mars" ? "#f97316" : theme === "jupiter" ? "#e0a95c" : "#b9c0cb";
  context.fillStyle = base;
  context.beginPath();
  context.moveTo(0, ground);
  for (let x = 0; x <= w; x += 46) {
    context.lineTo(x, ground - 15 - Math.sin(x * 0.018) * 18 - Math.cos(x * 0.031) * 7);
  }
  context.lineTo(w, h);
  context.lineTo(0, h);
  context.closePath();
  context.fill();
  context.fillStyle = ridge;
  context.fillRect(0, ground - 2, w, 8);
  context.strokeStyle = "rgba(0,0,0,0.28)";
  context.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const x = (i * 151 + 42) % w;
    const y = ground + 24 + (i % 3) * 12;
    context.beginPath();
    context.ellipse(x, y, 22 + (i % 3) * 8, 6 + (i % 2) * 3, 0, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawDustSweep(context, w, h, now) {
  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = "#fed7aa";
  context.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = h * 0.28 + i * 31;
    const drift = (now * 0.035 + i * 79) % (w + 160) - 120;
    context.beginPath();
    context.moveTo(drift, y);
    context.bezierCurveTo(drift + 80, y - 14, drift + 180, y + 12, drift + 300, y - 4);
    context.stroke();
  }
  context.restore();
}

function drawJupiterBands(context, w, h, now) {
  const colors = ["rgba(255,255,255,0.12)", "rgba(120,53,15,0.18)", "rgba(253,186,116,0.16)"];
  for (let y = 34; y < h * 0.68; y += 48) {
    context.fillStyle = colors[(y / 48) % colors.length | 0];
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= w; x += 42) {
      context.lineTo(x, y + Math.sin(x * 0.018 + now / 900) * 7);
    }
    context.lineTo(w, y + 22);
    context.lineTo(0, y + 22);
    context.closePath();
    context.fill();
  }
}

function drawTrail(context, world, color) {
  if (world.trail.length < 2) return;
  context.save();
  context.lineWidth = 3;
  context.lineCap = "round";
  context.shadowColor = color;
  context.shadowBlur = 9;
  for (let i = 1; i < world.trail.length; i++) {
    const a = world.trail[i - 1];
    const b = world.trail[i];
    const alpha = Math.max(0, 1 - b.age / 3.2) * (i / world.trail.length);
    context.strokeStyle = hexToRgba(color, alpha);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
  context.restore();
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawHeightMarker(context, canvas, world) {
  context.save();
  const x = Math.min(world.x + 38, canvas.width - 80);
  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.fillStyle = "rgba(255,255,255,0.68)";
  context.lineWidth = 1.2;
  context.setLineDash([5, 7]);
  context.beginPath();
  context.moveTo(x, world.y);
  context.lineTo(x, world.groundY);
  context.stroke();
  context.setLineDash([]);
  context.font = `${Math.max(13, canvas.width * 0.014)}px Segoe UI, sans-serif`;
  context.fillText(`${world.currentHeight.toFixed(1)} m`, x + 8, Math.max(world.y + 22, 28));
  context.restore();
}

function drawImpactEffects(context, world, planet) {
  context.save();
  world.impacts.forEach((impact) => {
    context.globalAlpha = impact.alpha;
    context.strokeStyle = planet.theme === "earth" ? "rgba(98,200,255,0.78)" : "rgba(255,211,110,0.76)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(world.x, world.groundY, impact.radius * 1.6, impact.radius * 0.28, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = planet.theme === "earth" ? "rgba(98,200,255,0.18)" : "rgba(255,211,110,0.2)";
    context.beginPath();
    context.arc(world.x, world.groundY - impact.radius * 0.15, impact.radius * 0.18, 0, Math.PI * 2);
    context.fill();
  });

  world.dust.forEach((dust) => {
    context.globalAlpha = Math.max(0, 1 - dust.age / dust.life);
    context.fillStyle = planet.theme === "earth" ? "rgba(210,245,218,0.42)" : "rgba(226,232,240,0.62)";
    context.beginPath();
    context.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
  context.globalAlpha = 1;
}

function drawVignette(context, canvas, planet) {
  const w = canvas.width;
  const h = canvas.height;
  const vignette = context.createRadialGradient(w * 0.5, h * 0.42, h * 0.24, w * 0.5, h * 0.5, h * 0.86);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, planet.theme === "earth" ? "rgba(5,20,35,0.2)" : "rgba(0,0,0,0.44)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, w, h);
}

function drawObject(context, x, y, key, now) {
  const obj = objects[key];
  const r = obj.radius * Math.min(window.devicePixelRatio || 1, 2);
  context.save();
  context.translate(x, y);
  context.shadowColor = "rgba(0,0,0,0.45)";
  context.shadowBlur = 20;
  context.shadowOffsetY = 10;
  if (["basketball", "bowlingBall"].includes(key)) context.rotate(now / (key === "bowlingBall" ? 500 : 720));
  if (key === "basketball") drawBasketball(context, r);
  if (key === "feather") drawFeather(context, r, now);
  if (key === "hammer") drawHammer(context, r);
  if (key === "bowlingBall") drawBowlingBall(context, r);
  if (key === "astronaut") drawAstronaut(context, r);
  if (key === "human") drawHuman(context, r);
  if (key === "car") drawCar(context, r);
  context.restore();
}

function drawBasketball(context, r) {
  const ball = context.createRadialGradient(-r * 0.4, -r * 1.55, 2, 0, -r, r * 1.25);
  ball.addColorStop(0, "#fed7aa");
  ball.addColorStop(0.33, "#fb923c");
  ball.addColorStop(1, "#9a3412");
  context.fillStyle = ball;
  context.beginPath();
  context.arc(0, -r, r, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#7c2d12";
  context.lineWidth = Math.max(2, r * 0.13);
  context.beginPath();
  context.arc(0, -r, r * 0.95, 0, Math.PI * 2);
  context.moveTo(-r, -r);
  context.lineTo(r, -r);
  context.moveTo(0, -r * 2);
  context.lineTo(0, 0);
  context.stroke();
}

function drawFeather(context, r, now) {
  context.rotate(Math.sin(now / 400) * 0.25);
  const gradient = context.createLinearGradient(-r, -r * 2, r, 0);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#93c5fd");
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(0, -r, r * 0.55, r * 1.7, -0.35, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#dbeafe";
  context.lineWidth = Math.max(1.5, r * 0.1);
  context.beginPath();
  context.moveTo(0, -r * 2.5);
  context.lineTo(0, r * 0.45);
  context.stroke();
}

function drawHammer(context, r) {
  const metal = context.createLinearGradient(-r * 1.5, -r * 2.2, r * 1.5, -r * 1.35);
  metal.addColorStop(0, "#e2e8f0");
  metal.addColorStop(0.52, "#64748b");
  metal.addColorStop(1, "#f8fafc");
  context.fillStyle = metal;
  context.fillRect(-r * 1.25, -r * 2.1, r * 2.5, r * 0.58);
  const handle = context.createLinearGradient(0, -r * 1.62, 0, r * 0.58);
  handle.addColorStop(0, "#f59e0b");
  handle.addColorStop(1, "#78350f");
  context.fillStyle = handle;
  context.fillRect(-r * 0.18, -r * 1.62, r * 0.36, r * 2.2);
}

function drawBowlingBall(context, r) {
  const gradient = context.createRadialGradient(-r * 0.4, -r * 1.45, 2, 0, -r, r * 1.35);
  gradient.addColorStop(0, "#475569");
  gradient.addColorStop(1, "#020617");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, -r, r, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#111827";
  [[-0.25, -1.15], [0.2, -1.05], [0, -0.7]].forEach(([hx, hy]) => {
    context.beginPath();
    context.arc(r * hx, r * hy, r * 0.14, 0, Math.PI * 2);
    context.fill();
  });
}

function drawAstronaut(context, r) {
  const suit = context.createLinearGradient(-r, -r * 2.35, r, r * 0.55);
  suit.addColorStop(0, "#ffffff");
  suit.addColorStop(1, "#cbd5e1");
  context.fillStyle = suit;
  context.fillRect(-r * 0.55, -r * 1.4, r * 1.1, r * 1.35);
  context.beginPath();
  context.arc(0, -r * 1.8, r * 0.62, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#0f172a";
  context.fillRect(-r * 0.38, -r * 1.9, r * 0.76, r * 0.28);
  context.strokeStyle = "#e2e8f0";
  context.lineWidth = Math.max(3, r * 0.18);
  context.beginPath();
  context.moveTo(-r * 0.55, -r * 1.02);
  context.lineTo(-r * 1.05, -r * 0.48);
  context.moveTo(r * 0.55, -r * 1.02);
  context.lineTo(r * 1.05, -r * 0.48);
  context.moveTo(-r * 0.28, -r * 0.05);
  context.lineTo(-r * 0.42, r * 0.55);
  context.moveTo(r * 0.28, -r * 0.05);
  context.lineTo(r * 0.42, r * 0.55);
  context.stroke();
}

function drawHuman(context, r) {
  context.fillStyle = "#f8c8a6";
  context.beginPath();
  context.arc(0, -r * 1.85, r * 0.38, 0, Math.PI * 2);
  context.fill();
  const body = context.createLinearGradient(0, -r * 1.45, 0, r * 0.32);
  body.addColorStop(0, "#7dd3fc");
  body.addColorStop(1, "#2563eb");
  context.strokeStyle = body;
  context.lineWidth = Math.max(4, r * 0.28);
  context.beginPath();
  context.moveTo(0, -r * 1.45);
  context.lineTo(0, -r * 0.52);
  context.moveTo(-r * 0.7, -r * 1.16);
  context.lineTo(r * 0.7, -r * 1.16);
  context.moveTo(0, -r * 0.52);
  context.lineTo(-r * 0.45, r * 0.3);
  context.moveTo(0, -r * 0.52);
  context.lineTo(r * 0.45, r * 0.3);
  context.stroke();
}

function drawCar(context, r) {
  const car = context.createLinearGradient(-r * 1.4, -r * 1.7, r * 1.4, -r * 0.18);
  car.addColorStop(0, "#fca5a5");
  car.addColorStop(0.45, "#ef4444");
  car.addColorStop(1, "#7f1d1d");
  context.fillStyle = car;
  context.fillRect(-r * 1.4, -r * 1.1, r * 2.8, r * 0.86);
  context.fillStyle = "#f87171";
  context.beginPath();
  context.moveTo(-r * 0.72, -r * 1.1);
  context.lineTo(-r * 0.26, -r * 1.72);
  context.lineTo(r * 0.78, -r * 1.72);
  context.lineTo(r * 1.15, -r * 1.1);
  context.closePath();
  context.fill();
  context.fillStyle = "#0f172a";
  [-r * 0.86, r * 0.86].forEach((wheelX) => {
    context.beginPath();
    context.arc(wheelX, -r * 0.18, r * 0.28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#94a3b8";
    context.beginPath();
    context.arc(wheelX, -r * 0.18, r * 0.11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#0f172a";
  });
}

function drawGraphs() {
  drawGraph(canvases.heightGraph, ctx.heightGraph, "h", "Height (m)");
  drawGraph(canvases.velocityGraph, ctx.velocityGraph, "v", "Velocity (m/s)");
}

function drawGraph(canvas, context, key, label) {
  const w = canvas.width;
  const h = canvas.height;
  context.clearRect(0, 0, w, h);
  context.fillStyle = "rgba(2,6,23,0.48)";
  context.fillRect(0, 0, w, h);
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (h / 4) * i;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(w, y);
    context.stroke();
  }
  const samples = [...state.worlds.left.graph, ...state.worlds.right.graph];
  const maxT = Math.max(1, ...samples.map((sample) => sample.t));
  const maxValue = Math.max(1, ...samples.map((sample) => sample[key]));
  drawGraphLine(context, state.worlds.left.graph, maxT, maxValue, key, "#62c8ff", w, h);
  drawGraphLine(context, state.worlds.right.graph, maxT, maxValue, key, "#ffd36e", w, h);
  context.fillStyle = "rgba(255,255,255,0.68)";
  context.font = `${Math.max(11, w * 0.018)}px Segoe UI, sans-serif`;
  context.fillText(label, 10, 18);
}

function drawGraphLine(context, samples, maxT, maxValue, key, color, w, h) {
  if (samples.length < 2) return;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2.2;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.beginPath();
  samples.forEach((sample, index) => {
    const x = 10 + (sample.t / maxT) * (w - 20);
    const y = h - 10 - (sample[key] / maxValue) * (h - 30);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
}

function updateDom(force = false, now = performance.now()) {
  state.lastDomUpdate = now;
  updateTelemetry("earth", state.worlds.left, planets.earth);
  updateTelemetry("moon", state.worlds.right, planets[state.rightPlanet]);
  updateInsights();
  if (force || now - state.fpsLast < 120) ui.fps.textContent = state.fpsValue;
}

function updateTelemetry(prefix, world, planet) {
  ui[`${prefix}Velocity`].textContent = `${world.currentVelocity.toFixed(2)} m/s`;
  ui[`${prefix}MaxVelocity`].textContent = `${world.maxVelocity.toFixed(2)} m/s`;
  ui[`${prefix}Height`].textContent = `${world.currentHeight.toFixed(2)} m`;
  ui[`${prefix}PeakHeight`].textContent = `${world.peakHeight.toFixed(2)} m`;
  ui[`${prefix}Time`].textContent = `${world.t.toFixed(2)} s`;
  ui[`${prefix}Gravity`].textContent = `${planet.gravity.toFixed(2)} m/s^2`;
  ui[`${prefix}Distance`].textContent = `${world.distanceTraveled.toFixed(2)} m`;
}

function updateInsights() {
  const earth = state.worlds.left;
  const right = state.worlds.right;
  const rightPlanet = planets[state.rightPlanet];
  const fallRatio = earth.currentVelocity > 0 ? earth.currentVelocity / Math.max(right.currentVelocity, 0.01) : planets.earth.gravity / rightPlanet.gravity;
  const jumpRatio = earth.peakHeight > 0 ? right.peakHeight / earth.peakHeight : planets.earth.gravity / rightPlanet.gravity;
  const hangRatio = (earth.landingTime || earth.t) > 0 ? (right.landingTime || right.t || 0.01) / (earth.landingTime || earth.t) : Math.sqrt(planets.earth.gravity / rightPlanet.gravity);
  const distanceRatio = earth.horizontalDistance > 0 ? right.horizontalDistance / earth.horizontalDistance : planets.earth.gravity / rightPlanet.gravity;
  ui.fallInsight.textContent = `${rightPlanet.name} ${clamp(fallRatio, 0, 99).toFixed(2)}x slower`;
  ui.jumpInsight.textContent = `${rightPlanet.name} ${clamp(jumpRatio, 0, 99).toFixed(2)}x higher`;
  ui.hangInsight.textContent = `${rightPlanet.name} ${clamp(hangRatio, 0, 99).toFixed(2)}x longer`;
  ui.distanceInsight.textContent = `${rightPlanet.name} ${clamp(distanceRatio, 0, 99).toFixed(2)}x farther`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function updatePlanetLabels() {
  const planet = planets[state.rightPlanet];
  ui.rightWorldName.textContent = planet.name;
  ui.rightGravity.textContent = planet.gravity.toFixed(2);
  ui.rightTelemetryTitle.textContent = `${planet.name} Telemetry`;
}

function updateControlReadouts() {
  ui.heightValue.textContent = `${ui.height.value} m`;
  ui.forceValue.textContent = `${ui.force.value} m/s`;
  ui.speedValue.textContent = `${Number(ui.speed.value).toFixed(1)}x`;
}

function rotateFact() {
  state.factIndex = (state.factIndex + 1) % facts.length;
  ui.factText.style.opacity = "0";
  setTimeout(() => {
    ui.factText.textContent = facts[state.factIndex];
    ui.factText.style.opacity = "1";
  }, 200);
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
}

function updateFullscreenButton() {
  const active = Boolean(document.fullscreenElement);
  ui.fullscreen.textContent = active ? "×" : "⛶";
  ui.fullscreen.setAttribute("aria-pressed", String(active));
  setTimeout(resizeCanvases, 80);
}

function syncButtons(container, value, key = "value") {
  container.querySelectorAll("button").forEach((button) => {
    const active = button.dataset[key] === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

ui.start.addEventListener("click", startSimulation);
ui.pause.addEventListener("click", pauseSimulation);
ui.reset.addEventListener("click", () => resetSimulation(true));
ui.fullscreen.addEventListener("click", () => {
  toggleFullscreen().catch(() => {
    ui.fullscreen.textContent = "F11";
    setTimeout(updateFullscreenButton, 1500);
  });
});

ui.trailToggle.addEventListener("click", () => {
  state.trailsEnabled = !state.trailsEnabled;
  ui.trailToggle.classList.toggle("active", state.trailsEnabled);
  ui.trailToggle.setAttribute("aria-pressed", String(state.trailsEnabled));
});

document.getElementById("experimentButtons").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-value]");
  if (!button) return;
  ui.experiment.value = button.dataset.value;
  syncButtons(event.currentTarget, button.dataset.value);
  resetSimulation(true);
});

document.getElementById("objectButtons").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-value]");
  if (!button) return;
  ui.object.value = button.dataset.value;
  syncButtons(event.currentTarget, button.dataset.value);
  resetSimulation(true);
});

document.querySelectorAll(".planet-buttons button").forEach((button) => {
  button.addEventListener("click", () => {
    state.rightPlanet = button.dataset.planet;
    syncButtons(document.querySelector(".planet-buttons"), state.rightPlanet, "planet");
    invalidateSceneCache();
    resetSimulation(true);
  });
});

[ui.height, ui.force].forEach((element) => {
  element.addEventListener("input", () => resetSimulation(true));
});
ui.speed.addEventListener("input", updateControlReadouts);
window.addEventListener("resize", resizeCanvases);
document.addEventListener("fullscreenchange", updateFullscreenButton);

updateControlReadouts();
resizeCanvases();
setTimeout(() => document.body.classList.remove("is-loading"), 500);
setInterval(rotateFact, 5200);
requestAnimationFrame(animationLoop);
