// =============================
// Canvas, State, and Constants
// =============================
// init canvas and context
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Core game state
let score = 0; // weighted points (e.g., golden = 3)
let hits = 0;  // number of successful hits
let misses = 0;
let targets = [];
let ball = null;

// =============================
// Layout and Sizing
// =============================
let launchOffset = window.innerHeight * 0.05;
let originX = window.innerWidth / 2;
let originY = window.innerHeight - launchOffset;
// let maxDrag = 0;

/**
 * Fit canvas to the game area and recompute launch origin and max drag.
*/
function resizeCanvas() {
  const gameArea = document.getElementById("game-area");
  canvas.width = gameArea.clientWidth;
  canvas.height = gameArea.clientHeight;
  launchOffset = gameArea.clientHeight * 0.05;
  originX = canvas.width / 2;
  originY = canvas.height - launchOffset;

  // Farthest corner from origin
  const corners = [
    { x: 0, y: 0 },
    { x: canvas.width, y: 0 },
    { x: 0, y: canvas.height },
    { x: canvas.width, y: canvas.height }
  ];

  /* maxDrag = Math.max(...corners.map(corner =>
    Math.hypot(corner.x - originX, corner.y - originY)
  )); */
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// =============================
// Score & Persistence
// =============================
// Bests are stored per mode (score and hits)
function storageKeyBestScore(mode) { return `sb_best_score_${mode}`; }
// function storageKeyBestHits(mode) { return `sb_best_hits_${mode}`; }

function getBestForMode(mode) {
  const bestScore = Number(localStorage.getItem(storageKeyBestScore(mode)) || 0);
  // const bestHits = Number(localStorage.getItem(storageKeyBestHits(mode)) || 0);
  return { bestScore };
}

function setBestForMode(mode, newScore) {
  const { bestScore } = getBestForMode(mode);
  if (newScore > bestScore) localStorage.setItem(storageKeyBestScore(mode), String(newScore));
  // if (newHits > bestHits) localStorage.setItem(storageKeyBestHits(mode), String(newHits));
}

/** Update the scoreboard numbers in the UI. */
function updateScoreboard() {
  const ammoText = (ammo === Infinity) ? '∞' : String(ammo);
  document.getElementById("scoreboard").textContent = `Mode: ${gameMode} | Snowballs: ${ammoText} | Hits: ${hits} | Score: ${score}`;
}

/** Persist per-mode bests for score and hits. */
function updateBestIfNeeded() {
  setBestForMode(gameMode, score, hits);
}

// =============================
// UI Elements and Menu State
// =============================
// Game state and UI elements
let isPaused = true;
let isMenuOpen = true;
const pauseBtn = document.getElementById("pause-btn");
const menuOverlay = document.getElementById("menu-overlay");
const startBtn = document.getElementById("start-btn");
const modeSelect = document.getElementById("mode-select");
const resumeBtn = document.getElementById("resume-btn");
const exitBtn = document.getElementById("exit-btn");
const menuSubtitle = document.getElementById("menu-subtitle");
const menuBest = document.getElementById("menu-best");

/**
 * Show the menu in a given mode (initial | paused | gameover).
 * Freezes gameplay and updates the overlay UI.
 */
function showMenu(mode) {
  // mode: 'initial' | 'paused' | 'gameover'
  isMenuOpen = true;
  isPaused = true;
  menuOverlay.classList.remove("hidden");
  menuOverlay.setAttribute("aria-hidden", "false");
  if (mode === 'paused') {
    resumeBtn.classList.remove("hidden");
    startBtn.classList.add("hidden");
    exitBtn.classList.remove("hidden");
    menuSubtitle.textContent = "Game paused";
    // if (menuBest) menuBest.classList.add("hidden");
  } else if (mode === 'gameover') {
    resumeBtn.classList.add("hidden");
    startBtn.classList.remove("hidden");
    exitBtn.classList.add("hidden");
    menuSubtitle.textContent = "Game Over!";
    const { bestScore: bScore } = getBestForMode(gameMode);
    menuBest.textContent = `Final Score: ${score} | Best Score (${gameMode}): ${bScore}`;
  } else {
    resumeBtn.classList.add("hidden");
    startBtn.classList.remove("hidden");
    exitBtn.classList.add("hidden");
    menuSubtitle.textContent = "Ready to play?";
    const { bestScore: bScore2 } = getBestForMode(gameMode);
    menuBest.textContent = `Best Score (${gameMode}): ${bScore2}`;
  }
  if (pauseBtn) pauseBtn.textContent = "▶";
}

/** Hide the menu overlay and resume gameplay. */
function hideMenu() {
  isMenuOpen = false;
  isPaused = false;
  menuOverlay.classList.add("hidden");
  menuOverlay.setAttribute("aria-hidden", "true");
  if (pauseBtn) pauseBtn.textContent = "⏸︎";
}

/** Reset the game state to a fresh start. */
function resetGame() {
  score = 0;
  hits = 0;
  misses = 0;
  ball = null;
  targets = []; // Clear all targets
  spawnTarget(); // Spawn initial targets
  updateScoreboard();
}

// Button wiring
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    if (isMenuOpen) {
      // If menu is open, start/resume
      hideMenu();
      return;
    }
    if (isPaused) {
      hideMenu();
    } else {
      showMenu('paused');
    }
  });
}

// Game modes and start
let gameMode = '∞'; // '16' | '32' | '∞'
let ammo = Infinity;

function startWithSelectedMode() {
  const selected = modeSelect ? modeSelect.value : '∞';
  gameMode = selected;
  ammo = (selected === '16') ? 16 : (selected === '32') ? 32 : Infinity;
  resetGame();
  hideMenu();
}

if (startBtn) startBtn.addEventListener("click", startWithSelectedMode);

if (resumeBtn) {
  resumeBtn.addEventListener("click", () => {
    hideMenu();
  });
}

if (exitBtn) {
  exitBtn.addEventListener("click", () => {
    // Exit to main menu; reset state
    resetGame();
    showMenu('initial');
  });
}

modeSelect.addEventListener('change', () => {
  const gameMode = modeSelect.value;
  const { bestScore: bScore } = getBestForMode(gameMode);
  menuBest.textContent = `Best Score (${gameMode}): ${bScore}`;
});

// =============================
// Global Keyboard Handling
// =============================
// Keyboard: Escape toggles pause
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (isMenuOpen) {
      hideMenu();
    } else {
      showMenu('paused');
    }
  } /*else if (e.key === "g" || e.key === "G") {
    // Debug: force spawn golden target
    if (!isPaused && !isMenuOpen) {
      spawnTarget();
      target.isGolden = true; // Override to golden
    }
  }*/
});


// =============================
// Target Spawning
// =============================
/** Create 1-2 new targets with properties based on depth. */
function spawnTarget() {
  // Only spawn if we have fewer than 4 targets total
  const maxTargets = 4;
  if (targets.length >= maxTargets) return;

  // Spawn 1-2 targets at once (reduced from 1-3)
  const spawnCount = Math.min(
    Math.floor(Math.random() * 2) + 1, // 1 or 2 targets
    maxTargets - targets.length // Don't exceed max
  );

  for (let i = 0; i < spawnCount; i++) {
    // Choose a random vertical position with margins
    const minY = 40;
    const maxY = Math.max(minY + 1, canvas.height - 60);
    let y = Math.random() * (maxY - minY) + minY;

    // Ensure minimum distance from origin (launch point)

    const minDistance = 120; // Minimum distance from origin

    // If too close to origin, adjust position
    let attempts = 0;
    while (attempts < 10) {
      const distFromOrigin = Math.hypot(originX - (canvas.width / 2), originY - y);
      if (distFromOrigin >= minDistance) break;

      // Try a different Y position
      y = Math.random() * (maxY - minY) + minY;
      attempts++;
    }

    // Depth ratio from top (0) to bottom (1)
    const depth = Math.min(1, Math.max(0, y / canvas.height));

    // Radius larger near bottom, smaller near top
    const minR = 16;
    const maxR = 38;
    const radius = minR + (maxR - minR) * depth;

    // Speed slightly faster near bottom, slower near top
    const minSpeed = 2.0;
    const maxSpeed = 2.7;
    const speed = minSpeed + (maxSpeed - minSpeed) * depth;
    // const speed = minSpeed + (maxSpeed - minSpeed) * Math.pow(depth, 1.5); // Exponential scaling

    // Random direction and spawn side
    const dir = Math.random() < 0.5 ? -1 : 1; // -1: right->left, 1: left->right
    const startX = dir === 1 ? -radius - 2 : canvas.width + radius + 2;

    // 20% chance golden target (faster), 10% chance wrong target (ends game)
    const hasGoldenTarget = targets.some(t => t.isGolden);
    const isGolden = !hasGoldenTarget && Math.random() < 0.20;
    const isWrong = Math.random() < 0.10;

    const newTarget = {
      x: startX,
      y: y,
      radius: radius,
      vx: dir * speed * (isGolden ? 1.5 : 1),
      isGolden: isGolden,
      isWrong: isWrong
    };

    targets.push(newTarget);
  }
}

// =============================
// Rendering
// =============================

// Load snowball image
const snowballImg = new Image();
snowballImg.src = 'imgs/Snowball.png';

/** Draw everything for the current frame (targets, crosshair, ball, UI). */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all targets
  targets.forEach(target => {
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = target.isWrong ? "#444" : (target.isGolden ? "gold" : "red");
    ctx.fill();
  });

  // Draw launch cross as snowball image
  let crossX, crossY;
  if (isDragging && dragStart) {
    crossX = dragEnd.x;
    crossY = dragEnd.y;
  } else {
    crossX = canvas.width / 2;
    crossY = canvas.height - launchOffset;
  }
  if (snowballImg.complete && snowballImg.naturalWidth > 0) {
    ctx.drawImage(snowballImg, crossX - 25, crossY - 25, 50, 50);
  }

  // Draw ball as snowball image
  if (ball) {
    ball.size = Math.max(10, ball.size - ball.shrinkSpeed); // shrink but don't go below 10px
    if (snowballImg.complete && snowballImg.naturalWidth > 0) {
      ctx.drawImage(snowballImg, ball.x - ball.size / 2, ball.y - ball.size / 2, ball.size, ball.size);
    }
  }

  if (isDragging && dragStart && dragEnd) {
    // Indicator bar at bottom right, representing current flick speed ratio
    const barWidth = 150;
    const barHeight = 25;
    const x = canvas.width - barWidth;
    const y = canvas.height - barHeight;

    // respect ammo
    if (ammo === 0) {
      isDragging = false;
      dragStart = null;
      dragEnd = null;
      return;
    }
    const flick = computeFlickVelocity();
    const currentSpeed = flick ? Math.hypot(flick.vx, flick.vy) : 0;
    const dragRatio = Math.min(Math.max(currentSpeed / maxFlickSpeed, 0), 1);

    ctx.save();
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#00ff00";
    const greenBarWidth = barWidth * dragRatio;
    ctx.fillRect(x, y, greenBarWidth, barHeight);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.restore();
    /* could draw snowball marker along the bar if desired */
    drawTrajectory();
  }
}

// =============================
// Input: Mouse & Touch
// =============================

// Pointer tracking
let mouseX = null;
let mouseY = null;

// Drag/flick tracking
let dragStart = null;
let dragEnd = null;
let isDragging = false;
let dragSamples = [];

// parameters
const gravity = 0.5;
const maxPower = 25;
const flickWindowMs = 120; // time window to measure flick speed
const maxFlickSpeed = 24; // pixels per frame cap
const minFlickSpeed = 4;  // minimum pixels per frame so slow flicks still move

function addDragSample(x, y) {
  const now = performance.now();
  dragSamples.push({ x, y, t: now });
  // Keep only recent samples within window and a small max count
  const cutoff = now - 200;
  if (dragSamples.length > 40) dragSamples.shift();
  while (dragSamples.length && dragSamples[0].t < cutoff) dragSamples.shift();
}

function computeFlickVelocity() {
  if (dragSamples.length < 2) return null;
  const now = performance.now();
  const end = dragSamples[dragSamples.length - 1];
  // Find a sample ~flickWindowMs before end (or the earliest in window)
  let startIndex = dragSamples.length - 2;
  while (startIndex > 0 && (end.t - dragSamples[startIndex].t) < flickWindowMs) {
    startIndex--;
  }
  const start = dragSamples[startIndex];
  const dt = Math.max(1, end.t - start.t); // ms
  const dxPerMs = (end.x - start.x) / dt;
  const dyPerMs = (end.y - start.y) / dt;
  // Convert to per-frame velocity (~16.67ms per frame)
  const frameFactor = 16.67;
  let vx = dxPerMs * frameFactor;
  let vy = dyPerMs * frameFactor;
  // Clamp speed
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { vx: 0, vy: 0 };
  const clamped = Math.min(maxFlickSpeed, Math.max(0, speed));
  const scale = clamped / speed;
  console.log(`Flick speed: ${speed.toFixed(2)} -> clamped: ${clamped.toFixed(2)}`);
  return { vx: vx * scale, vy: vy * scale };
}

function getEffectiveGravityForSpeed(speed) {
  // Less velocity -> less gravity; gently scale between 40%..100% of base gravity
  const ratio = Math.min(Math.max(speed / maxFlickSpeed, 0), 1);
  const minFactor = 0.4;
  return gravity * (minFactor + (1 - minFactor) * ratio);
}

/**
 * Render a dotted preview of the current throw along the flick direction.
 * Uses scaled gravity so the preview matches in-game physics.
 */
function drawTrajectory() {
  if (isDragging && dragStart && dragEnd && !ball) {

    // Use current flick speed (or minimum) for preview length
    const angle = Math.atan2(dragEnd.y - originY, dragEnd.x - originX);
    const flick = computeFlickVelocity();
    const speed = flick ? Math.hypot(flick.vx, flick.vy) : 0;
    const g = getEffectiveGravityForSpeed(speed);
    let stepX = Math.cos(angle) * speed;
    let stepY = Math.sin(angle) * speed;

    let x = originX;
    let y = originY;

    // Draw a straight dotted preview
    for (let i = 0; i < 25; i++) {
      stepY += g;
      x += stepX;
      y += stepY;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 128, 255, ${0.5 * (1 - i / 25)})`;
      ctx.fill();
    }
  }
}

// ----- Mouse events -----
canvas.addEventListener("mousedown", (e) => {
  if (isPaused || isMenuOpen) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const crossX = canvas.width / 2;
  const crossY = canvas.height - launchOffset;
  const crossRadius = 30; // Allowable click radius for cross
  const dist = Math.hypot(mouseX - crossX, mouseY - crossY);
  if (dist <= crossRadius) {
    isDragging = true;
    dragStart = { x: mouseX, y: mouseY };
    dragEnd = { ...dragStart };
    dragSamples = [];
    addDragSample(mouseX, mouseY);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isPaused || isMenuOpen) return;
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  if (isDragging && dragStart) {
    dragEnd = { x: mouseX, y: mouseY };
    addDragSample(mouseX, mouseY);
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (isPaused || isMenuOpen) {
    isDragging = false;
    dragStart = null;
    dragEnd = null;
    return;
  }
  if (isDragging && dragStart && dragEnd) {
    const rect = canvas.getBoundingClientRect();
    const releaseX = e.clientX - rect.left;
    const releaseY = e.clientY - rect.top;

    // Use flick velocity over recent samples
    addDragSample(releaseX, releaseY);
    const flick = computeFlickVelocity();
    const angle = Math.atan2(releaseY - originY, releaseX - originX);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const speed = flick ? Math.hypot(flick.vx, flick.vy) : 0;
    // If below minimum speed, cancel the throw and reset drag state
    if (speed < minFlickSpeed) {
      isDragging = false;
      dragStart = null;
      dragEnd = null;
      dragSamples = [];
      return;
    }
    const vx = dirX * speed;
    const vy = dirY * speed;

    const initialSize = 50; // size from 20 to 50
    const shrinkSpeed = 0.1 + (speed / maxFlickSpeed) * 0.3; // shrink faster with higher flick speed

    ball = {
      x: originX,
      y: originY,
      vx: vx,
      vy: vy,
      driftMultiplier: 0,
      launchSpeed: speed,
      size: initialSize,
      shrinkSpeed: shrinkSpeed
    };
    // consume one ammo after launching
    if (ammo !== Infinity) ammo = Math.max(0, ammo - 1);
    updateScoreboard();

  }
  isDragging = false;
  dragStart = null;
  dragEnd = null;
  dragSamples = [];
});

// Touch event helpers for mobile
/** Get touch coordinates in canvas space. */
function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  let x, y;
  if (e.touches && e.touches.length > 0) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    x = e.changedTouches[0].clientX - rect.left;
    y = e.changedTouches[0].clientY - rect.top;
  }
  return { x, y };
}

// ----- Touch events -----
canvas.addEventListener("touchstart", (e) => {
  if (isPaused || isMenuOpen) return;
  const pos = getTouchPos(e);
  const crossX = canvas.width / 2;
  const crossY = canvas.height - launchOffset;
  const crossRadius = 30; // Same as mouse
  const dist = Math.hypot(pos.x - crossX, pos.y - crossY);
  if (dist <= crossRadius) {
    isDragging = true;
    dragStart = { x: pos.x, y: pos.y };
    dragEnd = { ...dragStart };
    dragSamples = [];
    addDragSample(pos.x, pos.y);
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  if (isPaused || isMenuOpen) return;
  if (isDragging && dragStart) {
    // respect ammo
    if (ammo === 0) {
      isDragging = false;
      dragStart = null;
      dragEnd = null;
      e.preventDefault();
      return;
    }
    const pos = getTouchPos(e);
    dragEnd = { x: pos.x, y: pos.y };
    mouseX = pos.x;
    mouseY = pos.y;
    addDragSample(pos.x, pos.y);
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  if (isPaused || isMenuOpen) {
    isDragging = false;
    dragStart = null;
    dragEnd = null;
    e.preventDefault();
    return;
  }
  if (isDragging && dragStart && dragEnd) {
    // Update dragEnd with the final touch position
    const pos = getTouchPos(e);
    const rect = canvas.getBoundingClientRect();
    const releaseX = pos.x - rect.left;
    const releaseY = pos.y - rect.top;

    // Use flick velocity over recent samples
    addDragSample(releaseX, releaseY);
    const flick = computeFlickVelocity();
    const angle = Math.atan2(releaseY - originY, releaseX - originX);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const speed = flick ? Math.hypot(flick.vx, flick.vy) : 0;
    // If below minimum speed, cancel the throw and reset drag state
    if (speed < minFlickSpeed) {
      isDragging = false;
      dragStart = null;
      dragEnd = null;
      e.preventDefault();
      return;
    }
    const vx = dirX * speed;
    const vy = dirY * speed;

    const initialSize = 50; // size from 20 to 50
    const shrinkSpeed = 0.1 + (speed / maxFlickSpeed) * 0.3; // shrink faster with higher flick speed

    ball = {
      x: originX,
      y: originY,
      vx: vx,
      vy: vy,
      driftMultiplier: 0,
      launchSpeed: speed,
      size: initialSize,
      shrinkSpeed: shrinkSpeed
    };
    // consume one ammo after launching
    if (ammo !== Infinity) ammo = Math.max(0, ammo - 1);
    updateScoreboard();
  }
  isDragging = false;
  dragStart = null;
  dragEnd = null;
  e.preventDefault();
}, { passive: false });

// =============================
// Main Loop
// =============================
/** Update game state and render a frame. */
let lastTime = performance.now();
function gameLoop(currentTime) {
  const gameTick = 90 * (currentTime - lastTime) / 1000; // seconds
  lastTime = currentTime;
  // console.log(`gameTick: ${gameTick.toFixed(4)}s`);

  // Update moving targets when active
  if (!isPaused && !isMenuOpen) {
    // Move all targets
    targets.forEach(target => {
      target.x += target.vx * gameTick;
    });

    // Remove targets that left the screen and spawn new ones
    const targetsToRemove = [];
    targets.forEach((target, index) => {
      if ((target.vx > 0 && target.x - target.radius > canvas.width + 2) ||
        (target.vx < 0 && target.x + target.radius < -2)) {
        targetsToRemove.push(index);
      }
    });

    // Remove targets in reverse order to maintain indices
    targetsToRemove.reverse().forEach(index => {
      targets.splice(index, 1);
    });

    // Spawn new targets if we removed any and are below max
    if (targetsToRemove.length > 0 && targets.length < 4) {
      spawnTarget();
    }
  }

  if (!isPaused && !isMenuOpen && ball) {
    // Straight-line with scaled gravity based on launch speed
    const g = getEffectiveGravityForSpeed(ball.launchSpeed) * gameTick;
    ball.vy += g;
    ball.x += ball.vx * gameTick;
    ball.y += ball.vy * gameTick;
    // console.log(`Drift: ${ball.driftMultiplier} Ball position: (${ball.x.toFixed(2)}, ${ball.y.toFixed(2)}) Velocity: (${ball.vx.toFixed(2)}, ${ball.vy.toFixed(2)})`);

    // Check for hit using ball's dynamic visible radius
    const ballRadius = ball ? (ball.size ? ball.size / 2 : 15) : 15;

    // Check collision with any target
    let hitTarget = false;
    for (let i = targets.length - 1; i >= 0; i--) {
      const target = targets[i];
      const dist = Math.hypot(ball.x - target.x, ball.y - target.y);
      if (dist < target.radius + ballRadius) {
        if (target.isWrong) {
          // wrong target hit -> game over immediately
          updateBestIfNeeded();
          showMenu('gameover');
          score = 0;
          misses = 0;
        } else {
          hits += 1;
          score += target.isGolden ? 3 : 1;
          updateBestIfNeeded();
          targets.splice(i, 1); // Remove hit target
          spawnTarget(); // Spawn replacement
          hitTarget = true;
        }
        break;
      }
    }

    if (hitTarget) {
      ball = null;
    } else if (ball.y < 0 || ball.x < 0 || ball.x > canvas.width || ball.y > canvas.height) {
      ball = null;
    }

    // End game if out of ammo and no active ball
    if (!ball && ammo === 0) {
      updateBestIfNeeded();
      showMenu('gameover');
    }

    updateScoreboard();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// Initial state: show menu, wait for Start
spawnTarget();
showMenu('initial');
requestAnimationFrame(gameLoop); 
