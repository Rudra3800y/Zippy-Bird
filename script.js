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

const flapSound = document.getElementById("flap-sound");
const hitSound = document.getElementById("hit-sound");
const pointSound = document.getElementById("point-sound");
const bgMusic = document.getElementById("bg-music");

let birdTop = 200, gravity = 0.27, lift = -5, velocity = 0;
let isGameOver = false, gameStarted = false;
let score = 0, highScore = localStorage.getItem("flappyHighScore") || 0;
let backgroundX = 0, playerName = "", level = 1, pipeSpeed = 2;
let pipes = [], pipeSpawnTimer = 0;

scoreDisplay.innerText = `Score: 0 | High Score: ${highScore}`;
levelDisplay.innerText = `Level: 1`;

function toggleState(btn, onIcon, offIcon) {
  btn.dataset.state = btn.dataset.state === "on" ? "off" : "on";
  btn.textContent = btn.dataset.state === "on" ? onIcon : offIcon;
}

vibrationBtn.onclick = () => toggleState(vibrationBtn, "📳", "❌📳");
musicBtn.onclick = () => {
  toggleState(musicBtn, "🎵", "❌🎵");
  musicBtn.dataset.state === "on" ? bgMusic.play() : bgMusic.pause();
};
soundBtn.onclick = () => toggleState(soundBtn, "🔊", "❌🔊");

function flap() {
  if (gameStarted && !isGameOver) {
    velocity = lift;
    if (vibrationBtn.dataset.state === "on") navigator.vibrate(50);
    if (soundBtn.dataset.state === "on") {
      flapSound.currentTime = 0;
      flapSound.play();
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault(); // Prevents page from scrolling down
    flap();
  }
});

const isTouchDevice = 'ontouchstart' in window;

if (isTouchDevice) {
  game.addEventListener("touchstart", flap, { passive: true });
} else {
  game.addEventListener("mousedown", flap);
}

startBtn.onclick = () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Please enter your name!");
  localStorage.setItem("flappyPlayerName", playerName);
  startScreen.style.display = "none";
  countdownDisplay.style.display = "block";
  let countdown = 3;
  countdownDisplay.innerText = countdown;

  const countdownInterval = setInterval(() => {
    countdown--;
    countdownDisplay.innerText = countdown;
    if (countdown === 0) {
      clearInterval(countdownInterval);
      countdownDisplay.style.display = "none";
      startGame();
    }
  }, 1000);
};

restartBtn.onclick = () => {
  playerName = localStorage.getItem("flappyPlayerName") || "Player";
  resetGame();
  startGame(true);
};

newGameBtn.onclick = () => location.reload();

showLeaderboardBtn.onclick = () => {
  startScreen.style.display = "none";
  leaderboardScreen.style.display = "flex";
};

backBtn.onclick = () => {
  leaderboardScreen.style.display = "none";
  startScreen.style.display = "flex";
};

function startGame(skipCountdown = false) {
  birdTop = 200; velocity = 0; isGameOver = false;
  gameStarted = true; score = 0; level = 1; pipeSpeed = 2;
  pipes.forEach(pipe => { pipe.top.remove(); pipe.bottom.remove(); });
  pipes = [];

  bird.style.display = "block";
  scoreDisplay.style.display = "block";
  levelDisplay.style.display = "block";
  gameOverScreen.style.display = "none";

  scoreDisplay.innerText = `Score: 0 | High Score: ${highScore}`;
  levelDisplay.innerText = `Level: 1`;

  if (musicBtn.dataset.state === "on") bgMusic.play();
  requestAnimationFrame(gameLoop);
}

function createPipe() {
  // Adjust gap size based on level
  const gap = Math.max(100, 160 - level * 5);
  const topHeight = Math.floor(Math.random() * 250) + 50;
  const bottomHeight = 600 - topHeight - gap;
  const pipeX = 400;

  const topPipe = document.createElement("div");
  const bottomPipe = document.createElement("div");

  topPipe.className = "pipe top";
  bottomPipe.className = "pipe bottom";
  topPipe.style.height = `${topHeight}px`;
  bottomPipe.style.height = `${bottomHeight}px`;
  topPipe.style.left = `${pipeX}px`;
  bottomPipe.style.left = `${pipeX}px`;

  // Add random rare pipe
  if (Math.random() < 0.2) {
    topPipe.classList.add("rare-pipe");
    bottomPipe.classList.add("rare-pipe");
  }

  game.appendChild(topPipe);
  game.appendChild(bottomPipe);

  pipes.push({ top: topPipe, bottom: bottomPipe, x: pipeX, passed: false });
}

function gameLoop() {
  if (isGameOver) return;

  velocity += gravity;
  birdTop += velocity;
  if (birdTop > 570 || birdTop < 0) return endGame();

  bird.style.top = birdTop + "px";
  bird.style.transform = `rotate(${Math.min(velocity * 3, 60)}deg)`;

  backgroundX -= 0.5;
  game.style.backgroundPosition = `${backgroundX}px 0`;

  // Wind effect
  if (level >= 5) {
    const wind = Math.sin(Date.now() / 500) * 1.5; // subtle sway
    bird.style.left = `${50 + wind}px`;
  }

  pipeSpawnTimer++;
  if (pipeSpawnTimer > 120) {
    createPipe();
    pipeSpawnTimer = 0;
  }

  pipes.forEach((pipePair, index) => {
    pipePair.x -= pipeSpeed;
    pipePair.top.style.left = pipePair.bottom.style.left = pipePair.x + "px";

    // Add vertical wave motion to pipes
    const waveOffset = Math.sin(Date.now() / 300 + index) * 20;
    pipePair.top.style.top = `${parseInt(pipePair.top.style.top) + waveOffset}px`;
    pipePair.bottom.style.top = `${parseInt(pipePair.bottom.style.top) + waveOffset}px`;

    const birdRect = bird.getBoundingClientRect();
    const topRect = pipePair.top.getBoundingClientRect();
    const bottomRect = pipePair.bottom.getBoundingClientRect();

    if (
      birdRect.right > topRect.left &&
      birdRect.left < topRect.right &&
      (birdRect.top < topRect.bottom || birdRect.bottom > bottomRect.top)
    ) {
      return endGame();
    }

    if (!pipePair.passed && pipePair.x + 60 < 50) {
      pipePair.passed = true;
      score++;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("flappyHighScore", highScore);
      }

      scoreDisplay.innerText = `Score: ${score} | High Score: ${highScore}`;
      if (soundBtn.dataset.state === "on") {
        pointSound.currentTime = 0;
        pointSound.play();
      }

      if (score % 10 === 0) {
        level++;
        levelDisplay.innerText = `Level: ${level}`;
        pipeSpeed += 0.3; // Increase pipe speed with level
      }
    }

    if (pipePair.x + 60 < 0) {
      pipePair.top.remove();
      pipePair.bottom.remove();
      pipes.splice(index, 1);
    }
  });

  requestAnimationFrame(gameLoop);
}

function endGame() {
  isGameOver = true;
  if (soundBtn.dataset.state === "on") hitSound.play();
  bgMusic.pause();
  finalScore.innerText = `Score: ${score}`;
  bestScore.innerText = `High Score: ${highScore}`;
  saveToLeaderboard(playerName, score);
  gameOverScreen.style.display = "flex";
}

function saveToLeaderboard(name, score) {
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  const index = leaderboard.findIndex(p => p.name === name);
  if (index !== -1) {
    if (leaderboard[index].score < score) leaderboard[index].score = score;
  } else {
    leaderboard.push({ name, score });
  }
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  updateLeaderboardUI(leaderboard);
}

function updateLeaderboardUI(leaderboard) {
  leaderboardList.innerHTML = "";
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach(player => {
    const li = document.createElement("li");
    li.innerText = `${player.name}: ${player.score}`;
    leaderboardList.appendChild(li);
  });
}

function resetGame() {
  birdTop = 200;
  velocity = 0;
  pipes.forEach(pipe => {
    pipe.top.remove();
    pipe.bottom.remove();
  });
  pipes = [];
}

window.onload = function() {
  // Hide the loader
  setTimeout(function() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  }, 500);

  // Initialize leaderboard
  leaderboardScreen.style.display = "none";
  const savedBoard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  updateLeaderboardUI(savedBoard);
};

