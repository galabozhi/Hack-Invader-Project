const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const btnSingle = document.getElementById("btn-single");
const btnMulti = document.getElementById("btn-multi");
const btnHome = document.getElementById("btn-home");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreLeftEl = document.getElementById("score-left");
const scoreRightEl = document.getElementById("score-right");
const scoreLeftLabelEl = document.getElementById("score-left-label");
const scoreRightLabelEl = document.getElementById("score-right-label");
const statusEl = document.getElementById("status");

const W = canvas.width;
const H = canvas.height;
const WIN_SCORE = 11;

const PADDLE_W = 14;
const PADDLE_H = 100;
const PADDLE_MARGIN = 28;
const BALL_SIZE = 12;
const BALL_SPEED = 7;
const PADDLE_SPEED = 9;
const AI_SPEED = 7.2;

const keys = new Set();

const state = {
  running: false,
  paused: true,
  mode: "cpu", // "cpu" | "two"
  scores: [0, 0],
  ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
  paddles: [
    { x: PADDLE_MARGIN, y: H / 2 - PADDLE_H / 2, vy: 0 },
    { x: W - PADDLE_MARGIN - PADDLE_W, y: H / 2 - PADDLE_H / 2, vy: 0 },
  ],
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resetBall(direction = Math.random() < 0.5 ? 1 : -1) {
  state.ball.x = W / 2;
  state.ball.y = H / 2;
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
  state.ball.vx = Math.cos(angle) * BALL_SPEED * direction;
  state.ball.vy = Math.sin(angle) * BALL_SPEED;
  state.paused = true;
  state.running = true;
  statusEl.textContent = "Press Space to serve";
}

function serve() {
  if (!state.running) {
    state.scores = [0, 0];
    updateScores();
    resetBall();
    return;
  }
  if (!state.paused) return;
  state.paused = false;
  statusEl.textContent = state.mode === "cpu" ? "Play!" : "2-player — go!";
}

function updateScores() {
  scoreLeftEl.textContent = state.scores[0];
  scoreRightEl.textContent = state.scores[1];
}

function scorePoint(side) {
  state.scores[side]++;
  updateScores();

  if (state.scores[side] >= WIN_SCORE) {
    state.running = false;
    state.paused = true;
    const winner =
      side === 0
        ? state.mode === "cpu"
          ? "You win!"
          : "Player 1 wins!"
        : state.mode === "cpu"
          ? "CPU wins!"
          : "Player 2 wins!";
    statusEl.textContent = `${winner} — Space to play again`;
    return;
  }

  resetBall(side === 0 ? 1 : -1);
}

function movePaddle(index, dy) {
  const p = state.paddles[index];
  p.y = clamp(p.y + dy, 8, H - PADDLE_H - 8);
}

function updatePlayerInput() {
  let dy = 0;
  if (keys.has("w")) dy -= PADDLE_SPEED;
  if (keys.has("s")) dy += PADDLE_SPEED;
  if (dy) movePaddle(0, dy);

  if (state.mode === "two") {
    let dy2 = 0;
    if (keys.has("arrowup") || keys.has("i")) dy2 -= PADDLE_SPEED;
    if (keys.has("arrowdown") || keys.has("k")) dy2 += PADDLE_SPEED;
    if (dy2) movePaddle(1, dy2);
  }
}

function updateAI() {
  if (state.mode !== "cpu" || state.paused) return;

  const paddle = state.paddles[1];
  const target = state.ball.y - PADDLE_H / 2;
  const diff = target - paddle.y;
  const move = clamp(diff, -AI_SPEED, AI_SPEED);
  movePaddle(1, move);
}

function collidePaddle(paddle, isLeft) {
  const b = state.ball;
  const px = paddle.x;
  const py = paddle.y;

  if (
    b.x + BALL_SIZE / 2 < px ||
    b.x - BALL_SIZE / 2 > px + PADDLE_W ||
    b.y + BALL_SIZE / 2 < py ||
    b.y - BALL_SIZE / 2 > py + PADDLE_H
  ) {
    return false;
  }

  const hitY = (b.y - (py + PADDLE_H / 2)) / (PADDLE_H / 2);
  const maxAngle = (Math.PI / 3) * 0.85;
  const angle = hitY * maxAngle;
  const speed = Math.hypot(b.vx, b.vy) * 1.04;
  const dir = isLeft ? 1 : -1;

  b.vx = Math.cos(angle) * speed * dir;
  b.vy = Math.sin(angle) * speed;
  b.x = isLeft ? px + PADDLE_W + BALL_SIZE / 2 + 1 : px - BALL_SIZE / 2 - 1;

  return true;
}

function updateBall() {
  if (state.paused || !state.running) return;

  const b = state.ball;
  b.x += b.vx;
  b.y += b.vy;

  if (b.y - BALL_SIZE / 2 <= 0) {
    b.y = BALL_SIZE / 2;
    b.vy *= -1;
  } else if (b.y + BALL_SIZE / 2 >= H) {
    b.y = H - BALL_SIZE / 2;
    b.vy *= -1;
  }

  collidePaddle(state.paddles[0], true);
  collidePaddle(state.paddles[1], false);

  if (b.x < 0) scorePoint(1);
  else if (b.x > W) scorePoint(0);
}

function drawCourt() {
  ctx.fillStyle = "#121a2b";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#1e2a45";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ffffff06";
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 48, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPaddles() {
  const colors = ["#00f5d4", "#f72585"];
  state.paddles.forEach((p, i) => {
    ctx.fillStyle = colors[i];
    ctx.shadowColor = colors[i];
    ctx.shadowBlur = 16;
    roundRect(p.x, p.y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawBall() {
  const b = state.ball;
  ctx.fillStyle = "#f8f9fa";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(b.x, b.y, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawOverlay() {
  if (!state.paused || !state.running) return;

  ctx.fillStyle = "#0a0e1780";
  ctx.fillRect(0, 0, W, H);
}

function tick() {
  updatePlayerInput();
  updateAI();
  updateBall();
  drawCourt();
  drawPaddles();
  drawBall();
  drawOverlay();
  requestAnimationFrame(tick);
}

function setMode(mode) {
  state.mode = mode;
  scoreLeftLabelEl.textContent = mode === "cpu" ? "YOU" : "P1";
  scoreRightLabelEl.textContent = mode === "cpu" ? "CPU" : "P2";
  statusEl.textContent =
    mode === "cpu"
      ? "Single player — Space to start"
      : "Multiplayer — Space to start";
}

function showHome() {
  homeScreen.hidden = false;
  gameScreen.hidden = true;
  state.running = false;
  state.paused = true;
  keys.clear();
}

function startGame(mode) {
  setMode(mode);
  homeScreen.hidden = true;
  gameScreen.hidden = false;
  state.scores = [0, 0];
  updateScores();
  state.paddles[0].y = H / 2 - PADDLE_H / 2;
  state.paddles[1].y = H / 2 - PADDLE_H / 2;
  resetBall();
}

btnSingle.addEventListener("click", () => startGame("cpu"));
btnMulti.addEventListener("click", () => startGame("two"));
btnHome.addEventListener("click", showHome);

document.addEventListener("keydown", (e) => {
  if (gameScreen.hidden) return;

  const k = e.key.toLowerCase();
  keys.add(k);

  if (k === " ") {
    e.preventDefault();
    serve();
  }
});

document.addEventListener("keyup", (e) => {
  if (gameScreen.hidden) return;
  keys.delete(e.key.toLowerCase());
});

tick();
