// script.js

// ======= 상수 정의 =======
const COLS = 12;
const ROWS = 20;
const SCALE = 20;
const dropIntervalDefault = 1000;
const dropIntervalSoft = 50;

// ======= 캔버스 준비 =======
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(SCALE, SCALE);

const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
nextCtx.scale(SCALE, SCALE);

const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
holdCtx.scale(SCALE, SCALE);

// ======= 게임판 & 미노 정의 =======
function createMatrix(w, h) {
  const m = [];
  while (h--) m.push(new Array(w).fill(0));
  return m;
}

function createPiece(type) {
  switch (type) {
    case 'T': return [[0,1,0],[1,1,1],[0,0,0]];
    case 'O': return [[2,2],[2,2]];
    case 'L': return [[0,0,3],[3,3,3],[0,0,0]];
    case 'J': return [[4,0,0],[4,4,4],[0,0,0]];
    case 'I': return [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]];
    case 'S': return [[0,6,6],[6,6,0],[0,0,0]];
    case 'Z': return [[7,7,0],[0,7,7],[0,0,0]];
  }
}

const colors = [
  null,
  '#800080', // T
  '#FFFF00', // O
  '#FFA500', // L
  '#000080', // J
  '#00FFFF', // I
  '#00FF00', // S
  '#FF0000', // Z
];

// ======= 전역 상태 =======
const arena = createMatrix(COLS, ROWS);
let player = { pos: {x:0,y:0}, matrix: null };
let hold = null, next = null, hasHeld = false;
let dropCounter = 0, dropInterval = dropIntervalDefault, lastTime = 0;

// ======= 충돌 검사 =======
function collide(arena, p) {
  const [m, o] = [p.matrix, p.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x]) {
        const newY = y + o.y;
        const newX = x + o.x;
        // 바닥 밖이거나, 블록이 있으면 충돌
        if (
          newY < 0 ||
          newY >= arena.length ||
          newX < 0 ||
          newX >= arena[0].length ||
          arena[newY][newX]
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

// ======= 블록 합병 & 줄 제거 =======
function merge(arena, p) {
  p.matrix.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) arena[y + p.pos.y][x + p.pos.x] = v;
    })
  );
}

function arenaSweep() {
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (!arena[y][x]) continue outer;
    }
    arena.splice(y, 1);
    arena.unshift(new Array(arena[0].length).fill(0));
    ++y;
  }
}

// ======= 회전 유틸 =======
function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir === 1) matrix.forEach(row => row.reverse());
  else if (dir === -1) matrix.reverse();
}

// ======= 플레이어 동작 =======
function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  const oldX = player.pos.x;
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x = oldX;
  }
}

function hardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  arenaSweep();
  playerReset();
  dropCounter = 0;
}

function playerRotate(dir) {
  const posX = player.pos.x;
  const matW = player.matrix[0].length;
  let offset = 1;
  // 180° 회전 지원
  if (dir === 2) {
    rotate(player.matrix, 1); rotate(player.matrix, 1);
  } else {
    rotate(player.matrix, dir);
  }
  // 클램핑 & 월킥
  player.pos.x = Math.max(0, Math.min(player.pos.x, COLS - matW));
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > matW) {
      // 복원
      if (dir === 2) {
        rotate(player.matrix, 1); rotate(player.matrix, 1);
      } else {
        rotate(player.matrix, -dir);
      }
      player.pos.x = posX;
      return;
    }
  }
}

function playerHold() {
  if (hasHeld) return;
  const tmp = hold;
  hold = player.matrix;
  if (tmp) {
    player.matrix = tmp;
  } else {
    playerReset();
  }
  player.pos.y = 0;
  player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
  hasHeld = true;
}

function playerReset() {
  const pieces = 'TJLOSZI';
  if (!next) {
    next = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  }
  player.matrix = next;
  next = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  player.pos.y = 0;
  player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
  hasHeld = false;

  if (collide(arena, player)) {
    alert('Game Over! Restarting...');
    resetGame();
  }
}

function resetGame() {
  arena.forEach(row => row.fill(0));
  hold = null; next = null; hasHeld = false;
  dropCounter = 0; lastTime = 0;
  playerReset();
}

// ======= 그리기 =======
function drawMatrix(ctx, matrix, offset) {
  matrix.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) {
        ctx.fillStyle = colors[v];
        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    })
  );
}

function draw() {
  // 메인 필드
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(context, arena, {x:0, y:0});
  drawMatrix(context, player.matrix, player.pos);

  // Next
  nextCtx.fillStyle = '#000';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawMatrix(nextCtx, next, {x:1, y:1});

  // Hold
  holdCtx.fillStyle = '#000';
  holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (hold) drawMatrix(holdCtx, hold, {x:1, y:1});
}

// ======= 메인 루프 =======
function update(time = 0) {
  const dt = time - lastTime;
  lastTime = time;
  dropCounter += dt;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

// ======= 입력 처리 =======
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowLeft': playerMove(-1); break;
    case 'ArrowRight': playerMove(1); break;
    case 'ArrowDown':
      dropInterval = dropIntervalSoft;
      break;
    case ' ': hardDrop(); break;
    case 'z': playerRotate(-1); break;
    case 'x': playerRotate(1); break;
    case 'a': playerRotate(2); break;
    case 'Shift': case 'c': playerHold(); break;
    case 'r': case 'R': resetGame(); break;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowDown') {
    dropInterval = dropIntervalDefault;
  }
});

// ======= 게임 시작 =======
resetGame();
update();
