// ========================= ZIPPY BIRD — script.js (Cleaned, No Popups) =========================

// ======= DOM =======
const game = document.getElementById("game");
const startScreen = document.getElementById("start-screen");
const playerNameInput = document.getElementById("player-name");
const vibrationBtn = document.getElementById("vibration-btn");
const musicBtn = document.getElementById("music-btn");
const soundBtn = document.getElementById("sound-btn");
const startBtn = document.getElementById("start-btn");
const showLeaderboardBtn = document.getElementById("show-leaderboard-btn");

const gameOverScreen = document.getElementById("game-over-screen");
const finalScore = document.getElementById("final-score");
const bestScore = document.getElementById("best-score");
const restartBtn = document.getElementById("restart-btn");
const newGameBtn = document.getElementById("new-game-btn"); 

const leaderboardScreen = document.getElementById("leaderboard-screen");
const leaderboardList = document.getElementById("leaderboard-list");
const backBtn = document.getElementById("back-btn");

const scoreDisplay = document.getElementById("score");
const levelDisplay = document.getElementById("level-display");
const countdownDisplay = document.getElementById("countdown");
const bird = document.getElementById("bird");
const BIRD_HITBOX_PADDING =
  window.innerWidth < 480 ? 5 : 6;

const flapSound = document.getElementById("flap-sound");
const hitSound = document.getElementById("hit-sound");
const pointSound = document.getElementById("point-sound");
const bgMusic = document.getElementById("bg-music");


// Continue screen DOM
const continueScreen = document.getElementById("continue-screen");
const continueBtn = document.getElementById("continue-btn");
const noThanksBtn = document.getElementById("no-thanks-btn");
const continueScoreEl = document.getElementById("continue-score");
const continueLevelEl = document.getElementById("continue-level");

// ======= Constants & Config =======
const BASE_PIPE_SPEED = 120;
const RESTART_AD_KEY = "flappyRestartCount";
const CONTINUE_SECONDS = 5;

const PHYSICS = {
  GRAVITY: 800,
  LIFT: -280,
  PIPE_SPEED: BASE_PIPE_SPEED,
  BG_SPEED: 30,
  PIPE_SPAWN_INTERVAL: 1.9,
  PIPE_SPEED_INCREASE: 20
};

// ======= State =======
let birdTop = 200, velocity = 0;
let isGameOver = false, gameStarted = false, paused = false;
let score = 0, highScore = Number(localStorage.getItem("flappyHighScore")) || 0;
let backgroundX = 0, playerName = "Player", level = 1;
let pipes = [], pipeSpawnTimer = 0;
let gameLoopId = null, lastTime = 0;
let isInvincible = false;

// Level-up system
let nextLevelScore = 5;
let currentLevelStep = 1;

// Restart ad counter
let restartCount = Number(localStorage.getItem(RESTART_AD_KEY)) || 0;

// Banner ad state
let bannerShown = false;
let bannerSafetyTimer = null;
let pageLoadBannerShown = false;

// Continue state
let continueCountdown = null;
let continueTimeLeft = CONTINUE_SECONDS;

// ======= Init HUD =======
if (scoreDisplay) scoreDisplay.innerText = `Score: 0 | High Score: ${highScore}`;
if (levelDisplay) levelDisplay.innerText = `Level: 1`;

// ======= Helpers =======
const getGameHeight = () => game?.clientHeight || 600;
const getBirdHeight = () => bird?.clientHeight || 30;
function resetPipes() {
  pipes.forEach(p => {
    try { if (p.top && p.top.remove) p.top.remove(); } catch(e){}
    try { if (p.bottom && p.bottom.remove) p.bottom.remove(); } catch(e){}
  });
  pipes = [];
}
function log(...args){ console.log('[ZIPPY]', ...args); }

// ======= UI toggles =======
function toggleState(btn, onIcon, offIcon) {
  if (!btn) return;
  btn.dataset.state = btn.dataset.state === "on" ? "off" : "on";
  btn.textContent = btn.dataset.state === "on" ? onIcon : offIcon;
}
if (vibrationBtn) vibrationBtn.onclick = () => toggleState(vibrationBtn, "📳", "❌📳");
if (musicBtn) musicBtn.onclick = () => {
  toggleState(musicBtn, "🎵", "❌🎵");

  if (musicBtn.dataset.state === "on" && gameStarted && !paused) {
    try {
      bgMusic.volume = 0.08;   // enforce safe volume
      bgMusic.play();
    } catch (e) {
      log("Music play failed:", e);
    }
  } else {
    try {
      bgMusic.pause();
    } catch (e) {
      log("Music pause failed:", e);
    }
  }
};

if (soundBtn) soundBtn.onclick = () => toggleState(soundBtn, "🔊", "❌🔊");

// ================= INPUT HANDLERS =================

// --- Utility: vibration ---
function doVibration(ms) {
  if (
    vibrationBtn &&
    vibrationBtn.dataset.state === "on" &&
    "vibrate" in navigator
  ) {
    navigator.vibrate(ms);
  }
}

// --- Anti double-fire lock ---
let lastInputTime = 0;
const INPUT_COOLDOWN = 80; // ms

function canAcceptInput() {
  const now = Date.now();
  if (now - lastInputTime < INPUT_COOLDOWN) return false;
  lastInputTime = now;
  return true;
}

// --- Core input handler (ALL inputs end here) ---
function handleGameInput(e) {
  // Prevent unwanted defaults (space scroll, etc.)
  if (e?.type === "keydown") e.preventDefault();

  // Ignore if game not playable
  if (!gameStarted || isGameOver || paused) return;

  // Anti double-fire
  if (!canAcceptInput()) return;

  doVibration(35);
  flap();
}

// ================= INPUT SOURCES =================

// --- Touch handling (mobile) ---
let isTouchRecently = false;

game.addEventListener(
  "touchstart",
  (e) => {
    isTouchRecently = true;
    handleGameInput(e);
    setTimeout(() => (isTouchRecently = false), 300);
  },
  { passive: false }
);

// --- Mouse handling (desktop) ---
game.addEventListener("mousedown", (e) => {
  // Prevent ghost mouse after touch
  if (isTouchRecently) return;

  // Ignore UI buttons
  if (e.target.closest && e.target.closest("button")) return;

  game.focus(); // ensure keyboard works after click
  handleGameInput(e);
});

// --- Keyboard handling (FOCUSED GAME ONLY) ---
game.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  handleGameInput(e);
});

// ================= GAME ACTION =================

function flap() {
  console.count("FLAP"); // Debug: should increment by 1 per input

  velocity = PHYSICS.LIFT;

  if (soundBtn && soundBtn.dataset.state === "on" && flapSound) {
    try {
      flapSound.currentTime = 0;
      flapSound.play();
    } catch (e) {
      console.warn("Flap sound failed:", e);
    }
  }
}

// ================= FOCUS MANAGEMENT =================

// Ensure keyboard input always works
game.setAttribute("tabindex", "0");

game.addEventListener("mousedown", () => {
  game.focus();
});

// Call this inside startGame()
function focusGame() {
  game.focus();
}

// ================= PLAYER NAME LOGIC =================

document.addEventListener("DOMContentLoaded", () => {
  const playerNameInput = document.getElementById("player-name");
  if (!playerNameInput) {
    console.error("Player name input not found");
    return;
  }

  function generateGuestName() {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    return `Player#${randomId}`;
  }

  let savedName = localStorage.getItem("flappyPlayerName");

  if (!savedName) {
    savedName = generateGuestName();
    localStorage.setItem("flappyPlayerName", savedName);
  }

  playerNameInput.value = savedName;

  playerNameInput.addEventListener("blur", () => {
    const value = playerNameInput.value.trim();
    if (value) {
      localStorage.setItem("flappyPlayerName", value);
    }
  });
});


// ======= Start / Countdown / Game =======



function startCountdown(callback) {
  if (!countdownDisplay) return callback();
   game.focus();

  const howToPlayHint = document.getElementById("how-to-play-hint");

  countdownDisplay.style.display = "flex";
  countdownDisplay.style.left = "50%";
  countdownDisplay.style.top = "50%";
  countdownDisplay.style.transform = "translate(-50%, -50%)";

  // 👉 SHOW hint when countdown starts
  if (howToPlayHint) howToPlayHint.style.display = "block";

  let countdown = 3;
  countdownDisplay.innerText = countdown;

  const interval = setInterval(() => {
    countdown--;
    countdownDisplay.innerText = countdown > 0 ? countdown : "Go!";

    if (countdown < 0) {
      clearInterval(interval);
      countdownDisplay.style.display = "none";

      // 👉 HIDE hint when game starts
      if (howToPlayHint) howToPlayHint.style.display = "none";

      callback();
    }
  }, 1000);
}


if (startBtn) {
  startBtn.addEventListener("click", () => {
     game.focus();
    const typed = playerNameInput?.value?.trim();
    playerName = typed || localStorage.getItem("flappyPlayerName") || "Player";
    try { localStorage.setItem("flappyPlayerName", playerName); } catch(e){}

    if (startScreen) startScreen.style.display = "none";
    startCountdown(startGame);
  });
}

// ======= Game functions =======
function startGame() {
  if (gameLoopId) cancelAnimationFrame(gameLoopId);

  birdTop = 200;
  velocity = 0;
  isGameOver = false;
  paused = false;
  gameStarted = true;
  game.focus(); 
  score = 0;
  level = 1;
  nextLevelScore = 5;
  currentLevelStep = 1;
  pipeSpawnTimer = 0;
  resetPipes();

  PHYSICS.PIPE_SPEED = BASE_PIPE_SPEED;

  if (bird) bird.style.display = "block";
  if (scoreDisplay) scoreDisplay.style.display = "block";
  if (levelDisplay) levelDisplay.style.display = "block";
  if (gameOverScreen) gameOverScreen.style.display = "none";
  if (continueScreen) continueScreen.style.display = "none";
  if (scoreDisplay) scoreDisplay.innerText = `Score: 0 | High Score: ${highScore}`;
  if (levelDisplay) levelDisplay.innerText = `Level: 1`;

  if (musicBtn?.dataset?.state === "on" && bgMusic) {
    try { bgMusic.play(); } catch (e) { log("Background music play failed:", e); }
  }

  lastTime = 0;
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ======= Pipes / Collision / Scoring =======
function createPipe() {
  const containerH = getGameHeight();
  const gap = Math.max(Math.floor(containerH * 0.25), 120);
  const topHeight = Math.floor(Math.random() * Math.max(1, containerH - gap - 150)) + 50;
  const pipeX = (game && game.clientWidth) ? game.clientWidth : 400;

  const topPipe = document.createElement("div");
  const bottomPipe = document.createElement("div");
  topPipe.className = "pipe top";
  bottomPipe.className = "pipe bottom";

  topPipe.style.height = `${topHeight}px`;
  bottomPipe.style.height = `${containerH - topHeight - gap}px`;
  topPipe.style.left = `${pipeX}px`;
  bottomPipe.style.left = `${pipeX}px`;
  topPipe.style.top = `0px`;
  bottomPipe.style.top = `${topHeight + gap}px`;

  if (game) {
    game.appendChild(topPipe);
    game.appendChild(bottomPipe);
  }

  pipes.push({ top: topPipe, bottom: bottomPipe, x: pipeX, passed: false, topHeight, gap });
}

function gameLoop(currentTime) {
  if (isGameOver) return;
  if (paused) { gameLoopId = requestAnimationFrame(gameLoop); return; }

  if (!lastTime) { lastTime = currentTime; gameLoopId = requestAnimationFrame(gameLoop); return; }

  let dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  if (dt > 1/30) dt = 1/30;

  updateGame(dt);
  gameLoopId = requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  velocity += PHYSICS.GRAVITY * dt;
  birdTop += velocity * dt;

  const containerH = getGameHeight();
  const birdH = getBirdHeight();
  if (birdTop < 0) { birdTop = 0; velocity = 0; }
  if (birdTop > containerH - birdH) {
    if (!isInvincible) { endGame(); return; }
    else { birdTop = containerH - birdH; velocity = 0; }
  }

  if (bird) {
    bird.style.top = `${birdTop}px`;
    bird.style.transform = `rotate(${Math.min(velocity * 0.12, 60)}deg)`;
  }

  backgroundX -= PHYSICS.BG_SPEED * dt;
  if (game) game.style.backgroundPosition = `${backgroundX}px 0`;

  pipeSpawnTimer += dt;
  if (pipeSpawnTimer >= PHYSICS.PIPE_SPAWN_INTERVAL) { createPipe(); pipeSpawnTimer = 0; }

  if (bird) {
    const rect = bird.getBoundingClientRect();

const birdRect = {
  left: rect.left + BIRD_HITBOX_PADDING,
  right: rect.right - BIRD_HITBOX_PADDING,
  top: rect.top + BIRD_HITBOX_PADDING,
  bottom: rect.bottom - BIRD_HITBOX_PADDING
};


    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= PHYSICS.PIPE_SPEED * dt;
      if (p.top) p.top.style.left = `${p.x}px`;
      if (p.bottom) p.bottom.style.left = `${p.x}px`;

      const topRect = p.top.getBoundingClientRect();
      const bottomRect = p.bottom.getBoundingClientRect();

      const hitTop = birdRect.right > topRect.left && birdRect.left < topRect.right && birdRect.top < topRect.bottom;
      const hitBottom = birdRect.right > bottomRect.left && birdRect.left < bottomRect.right && birdRect.bottom > bottomRect.top;
      if ((hitTop || hitBottom) && !isInvincible) { endGame(); return; }

      if (!p.passed && birdRect.left > topRect.right) {
        p.passed = true;
        score++;
        if (score > highScore) { highScore = score; try { localStorage.setItem("flappyHighScore", String(highScore)); } catch(e){} }
        if (scoreDisplay) scoreDisplay.innerText = `Score: ${score} | High Score: ${highScore}`;
        if (soundBtn?.dataset?.state === "on" && pointSound) { try { pointSound.currentTime = 0; pointSound.play(); } catch(e){} }

        if (score >= nextLevelScore) {
          level++;
          currentLevelStep++;
          nextLevelScore += 5 * currentLevelStep;
          if (levelDisplay) levelDisplay.innerText = `Level: ${level}`;
          PHYSICS.PIPE_SPEED += PHYSICS.PIPE_SPEED_INCREASE;
        }
      }
    }
  }
}

// ========================= ZIPPY BIRD — script.js (Part 2, SDK REMOVED) =========================

// ======= Continue Feature =======
function showContinueScreen() {
  if (gameOverScreen) gameOverScreen.style.display = "none";
  if (continueScreen) continueScreen.style.display = "block";
  if (noThanksBtn) noThanksBtn.style.display = "none";

  if (continueScoreEl) continueScoreEl.innerText = `Score: ${score}`;
  if (continueLevelEl) continueLevelEl.innerText = `Level: ${level}`;

  continueTimeLeft = CONTINUE_SECONDS;
  updateContinueButton();

  if (continueCountdown) {
    clearInterval(continueCountdown);
    continueCountdown = null;
  }

  continueCountdown = setInterval(() => {
    continueTimeLeft--;
    updateContinueButton();

    if (continueTimeLeft <= 0) {
      clearInterval(continueCountdown);
      continueCountdown = null;
      if (noThanksBtn) noThanksBtn.style.display = "inline-block";
    }
  }, 1000);
}

function updateContinueButton() {
  if (continueBtn) continueBtn.textContent = `CONTINUE (${continueTimeLeft})`;
}

// ======= Continue button logic (SDK-free) =======
if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    // Hide continue screen
    if (continueScreen) continueScreen.style.display = "none";

    // Pause game before continue flow
    pauseGame(); // existing pause function

    // Directly move to ready timer (no ads)
    showReadyTimer();
  });
}

// ======= Ready timer / resume flow =======
function showReadyTimer() {
  const countdownContainer = document.getElementById("countdown-container");
  const readyBtn = document.getElementById("ready-btn");
  const timerDisplay = document.getElementById("timer-display");

  if (!countdownContainer || !readyBtn || !timerDisplay) return;

  countdownContainer.style.display = "block";
  readyBtn.style.display = "inline-block";

  let timer = 3;
  timerDisplay.textContent = timer;

  const resume = () => {
    countdownContainer.style.display = "none";
    readyBtn.style.display = "none";
    resumeAfterContinue(); // existing resume function
  };

  readyBtn.onclick = () => {
    readyBtn.style.display = "none";

    const endTime = Date.now() + timer * 1000;

    function tick() {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      timerDisplay.textContent = remaining;

      if (remaining > 0) {
        requestAnimationFrame(tick);
      } else {
        resume();
      }
    }

    tick();
  };
}

// Example of a proper resume function
function resumeGameLoop() {
  gamePaused = false; // your global pause flag
  lastFrameTime = performance.now(); // reset timing to avoid jumps

  // If you use requestAnimationFrame for the game loop:
  if (!gameLoopRunning) {
    gameLoopRunning = true;
    requestAnimationFrame(gameLoop); // restart the loop
  }
}

if (noThanksBtn) {
  noThanksBtn.addEventListener("click", () => {
    if (continueCountdown) { clearInterval(continueCountdown); continueCountdown = null; }
    if (continueScreen) continueScreen.style.display = "none";
    finalizeGameOver();
  });
}

function resumeAfterContinue() {
  isGameOver = false;
  paused = false;
  gameStarted = true;

  birdTop = Math.max(10, birdTop - 40);
  velocity = 0;
  if (bird) { bird.style.display = "block"; bird.style.top = `${birdTop}px`; }

  // Shift pipes forward
  try {
    const safeDistance = 150;
    const gameRect = game.getBoundingClientRect();
    const birdRect = bird.getBoundingClientRect();
    const birdLocalX = birdRect.left - gameRect.left;

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      if (p && typeof p.x === 'number') {
        if (p.x < birdLocalX + safeDistance) {
          try { if (p.top) p.top.remove(); } catch(e){}
          try { if (p.bottom) p.bottom.remove(); } catch(e){}
          pipes.splice(i, 1);
          continue;
        }
        p.x += 80;
        if (p.top) p.top.style.left = `${p.x}px`;
        if (p.bottom) p.bottom.style.left = `${p.x}px`;
      }
    }
  } catch(e) { log("Error shifting pipes:", e); }

  isInvincible = true;
  setTimeout(() => { isInvincible = false; }, 3000);

  if (scoreDisplay) { scoreDisplay.style.display = "block"; scoreDisplay.innerText = `Score: ${score} | High Score: ${highScore}`; }
  if (levelDisplay) { levelDisplay.style.display = "block"; levelDisplay.innerText = `Level: ${level}`; }

  if (musicBtn?.dataset?.state === "on" && bgMusic) { try { bgMusic.play(); } catch(e){} }

  // Start game loop
  lastTime = 0;
  gameLoopId = requestAnimationFrame(gameLoop);
}



// ======= Final Game Over =======
function finalizeGameOver() {
  isGameOver = true;
  paused = false;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);

  if (soundBtn?.dataset?.state === "on" && hitSound) {
    try { hitSound.play(); } catch (e) {}
  }
  if (bgMusic) {
    try { bgMusic.pause(); } catch (e) {}
  }

  if (finalScore) finalScore.innerText = `Score: ${score}`;
  if (bestScore) bestScore.innerText = `High Score: ${highScore}`;
  saveToLeaderboard(playerName, score);
  if (gameOverScreen) gameOverScreen.style.display = "flex";
}

// ======= End Game Trigger =======
function endGame() {
  if (isGameOver) return;
  isGameOver = true;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);

  if (soundBtn?.dataset?.state === "on" && hitSound) {
    try { hitSound.play(); } catch (e) {}
  }
  if (bgMusic) {
    try { bgMusic.pause(); } catch (e) {}
  }

  showContinueScreen();
}

function updateGameOverLeaderboard() {
  const list = document.getElementById("gameover-leaderboard-list");
  if (!list) return;

  list.innerHTML = "";

  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

  leaderboard = leaderboard
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  leaderboard.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerText = `${i + 1}. ${p.name} - ${p.score}`;
    list.appendChild(li);
  });
}

updateGameOverLeaderboard();


// ======= Leaderboard =======
function saveToLeaderboard(name, scoreVal) {
  if (!name || name.trim() === "") return;
  if (!Number.isFinite(scoreVal) || scoreVal <= 0) return;

  name = name.trim();

  let leaderboard = [];
  try {
    leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  } catch (e) {
    leaderboard = [];
  }

  const idx = leaderboard.findIndex(
    p => p.name.toLowerCase() === name.toLowerCase()
  );

  if (idx !== -1) {
    if (scoreVal > leaderboard[idx].score) {
      leaderboard[idx].score = scoreVal;
    }
  } else {
    leaderboard.push({ name, score: scoreVal });
  }

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  try {
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  } catch (e) {}
}

function updateLeaderboardUI() {
  if (!leaderboardList) return;

  leaderboardList.innerHTML = "";

  let leaderboard = [];
  try {
    leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  } catch (e) {
    leaderboard = [];
  }

  leaderboard.forEach((p, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${p.name} - ${p.score}`;
    leaderboardList.appendChild(li);
  });
}

function updateMainLeaderboardUI() {
  const list = document.getElementById("leaderboard-list");
  if (!list) return;

  list.innerHTML = "";

  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

  leaderboard = leaderboard
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  leaderboard.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerText = `${i + 1}. ${p.name} - ${p.score}`;
    list.appendChild(li);
  });
}

updateMainLeaderboardUI();


// ======= Restart & Main Menu buttons =======
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    restartCount++;
    try { localStorage.setItem(RESTART_AD_KEY, restartCount); } catch(e){}

    // SDK REMOVED: no ad shown

    if (gameOverScreen) gameOverScreen.style.display = "none";
    startCountdown(startGame);
  });
}

if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    restartCount++;
    try { localStorage.setItem(RESTART_AD_KEY, restartCount); } catch(e){}

    // SDK REMOVED: no ad shown

    if (startScreen) startScreen.style.display = "flex";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    resetGame();
  });
}

// ======= SDK banner functions REMOVED =======
// showBannerAd() → removed
// hideBannerAd() → removed

// ======= Init =======
window.onload = function() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
  if (leaderboardScreen) leaderboardScreen.style.display = "none";
  if (gameOverScreen) gameOverScreen.style.display = "none";
  if (continueScreen) continueScreen.style.display = "none";
  updateLeaderboardUI();

  // ======= SDK banner logic REMOVED =======
  // showBannerAfterFirstInteraction()
  // click / touch listeners for ads
};

// ======= Pause/Resume =======
function pauseGame() {
  if (isGameOver || paused || !gameStarted) return;
  paused = true;
  if (bgMusic) try { bgMusic.pause(); } catch (e) {}
  lastTime = 0;
}

function resumeGame() {
  if (isGameOver || !gameStarted || !paused) return;
  paused = false;
  if (musicBtn?.dataset?.state === "on" && bgMusic) {
    try { bgMusic.play(); } catch (e) {}
  }
  gameLoopId = requestAnimationFrame(gameLoop);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame();
  else setTimeout(() => { resumeGame(); }, 100);
});

// ======= Leaderboard button handlers =======
if (showLeaderboardBtn) {
  showLeaderboardBtn.addEventListener("click", () => {
    if (startScreen) startScreen.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    if (continueScreen) continueScreen.style.display = "none";
    if (leaderboardScreen) leaderboardScreen.style.display = "flex";
    updateLeaderboardUI();
  });
}

if (backBtn) {
  backBtn.addEventListener("click", () => {
    if (leaderboardScreen) leaderboardScreen.style.display = "none";
    if (startScreen) startScreen.style.display = "flex";
  });
}