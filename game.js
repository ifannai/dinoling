const gameArea = document.getElementById('game');
const dinoEl = document.getElementById('dino');
const mushroomContainer = document.getElementById('mushroom-container');
const heartsEl = document.getElementById('hearts');
const panel = document.getElementById('panel');
const promptEl = document.getElementById('prompt');
const responsesEl = document.getElementById('responses');
const feedbackEl = document.getElementById('feedback');
const speechBubble = document.getElementById('speech');
const customInput = document.getElementById('customResponse');
const submitCustom = document.getElementById('submitCustom');
const closePanel = document.getElementById('closePanel');

const hearts = 4;
let health = hearts;
let activeMushroom = null;
let awaitingJump = false;
let jumping = false;

const responseBank = [
  {
    text: "I'm so sorry, I already promised my family I'd help them on Saturday.",
    score: 1,
    note: 'Polite decline with reason and regret.'
  },
  {
    text: "No thanks. Not into parties.",
    score: -1,
    note: 'Very direct refusal without empathy.'
  },
  {
    text: "Could we do something together on Sunday instead?",
    score: 1,
    note: 'Offers an alternative, showing interest.'
  }
];

const mushrooms = [
  { id: 1, x: 220, interacted: false },
  { id: 2, x: 460, interacted: false },
  { id: 3, x: 720, interacted: false }
];

const dino = {
  x: 40,
  speed: 6,
  width: 48,
};

const pressed = new Set();

function renderHearts() {
  heartsEl.innerHTML = '';
  for (let i = 0; i < hearts; i += 1) {
    const el = document.createElement('div');
    el.className = 'heart' + (i >= health ? ' lost' : '');
    heartsEl.appendChild(el);
  }
}

function renderMushrooms() {
  mushroomContainer.innerHTML = '';
  mushrooms.forEach((m) => {
    const el = document.createElement('div');
    el.className = 'mushroom' + (m.interacted ? ' responded' : '');
    el.dataset.id = m.id;
    el.style.left = `${m.x}px`;
    mushroomContainer.appendChild(el);
  });
}

function moveDino() {
  if (awaitingJump && !jumping) return;
  if (pressed.has('ArrowLeft')) dino.x -= dino.speed;
  if (pressed.has('ArrowRight')) dino.x += dino.speed;
  dino.x = Math.max(0, Math.min(dino.x, gameArea.clientWidth - dino.width));
  dinoEl.style.setProperty('--x', `${dino.x}px`);
  speechBubble.style.setProperty('--x', `${dino.x}px`);
}

function checkCollision() {
  if (activeMushroom || awaitingJump) return;
  const dinoRect = {
    x: dino.x + 40,
    width: dino.width,
  };
  const hit = mushrooms.find((m) =>
    !m.interacted && Math.abs(m.x - dinoRect.x) < dinoRect.width
  );
  if (hit) {
    openPanel(hit);
  }
}

function openPanel(mushroom) {
  activeMushroom = mushroom;
  awaitingJump = true;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  promptEl.textContent = 'Dino: “Hey mushroom friend! Want to come to my party on Saturday?”';
  feedbackEl.textContent = '';
  speechBubble.textContent = 'Hey mushroom friend! Want to come to my party on Saturday?';
  speechBubble.classList.add('visible');
  speechBubble.style.setProperty('--x', `${dino.x}px`);
  responsesEl.innerHTML = '';
  responseBank.forEach((response) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `response-btn ${response.score > 0 ? 'positive' : 'negative'}`;
    btn.textContent = response.text;
    btn.addEventListener('click', () => evaluateResponse(response));
    responsesEl.appendChild(btn);
  });
}

function evaluateResponse(response) {
  applyScore(response.score, response.note);
}

function evaluateCustom() {
  const text = customInput.value.trim();
  if (!text) return;
  const polite = /sorry|thanks|thank you|maybe|another time|next time|alternative/i.test(text);
  const score = polite ? 1 : -1;
  const note = polite
    ? 'Sounds considerate or offers an alternative.'
    : 'Feels too direct or lacks empathy.';
  applyScore(score, note, text);
  customInput.value = '';
}

function applyScore(score, note, responseText = null) {
  health = Math.min(hearts, Math.max(0, health + score));
  activeMushroom.interacted = true;
  const tone = score > 0 ? '🌟 That felt kind!' : '💔 Ouch!';
  feedbackEl.textContent = `${tone} ${note}` + (responseText ? ` (You wrote: "${responseText}")` : '');
  renderHearts();
  renderMushrooms();
  feedbackEl.insertAdjacentHTML('beforeend', ' Press ↑ to jump over and continue.');
  checkCompletion();
}

function checkCompletion() {
  if (mushrooms.every((m) => m.interacted)) {
    feedbackEl.innerHTML += ` <span class="summary">All invites done! Dino's feeling ${health >= hearts / 2 ? 'encouraged' : 'a bit sad'}.</span>`;
    panel.hidden = false;
  }
}

function closeInteraction() {
  feedbackEl.textContent = 'Skipped this invite. Press ↑ to jump over and continue.';
  if (activeMushroom) {
    activeMushroom.interacted = true;
    renderMushrooms();
    checkCompletion();
  }
  panel.hidden = true;
}

function loop() {
  moveDino();
  checkCollision();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    pressed.add(e.key);
  }
  if (e.key === 'ArrowUp' && awaitingJump && !jumping) {
    startJump();
  }
});

window.addEventListener('keyup', (e) => {
  pressed.delete(e.key);
});

function startJump() {
  jumping = true;
  dinoEl.classList.add('jumping');
  setTimeout(() => {
    dinoEl.classList.remove('jumping');
    finishJump();
  }, 550);
}

function finishJump() {
  jumping = false;
  awaitingJump = false;
  speechBubble.classList.remove('visible');
  panel.hidden = true;
  if (activeMushroom && !activeMushroom.interacted) {
    activeMushroom.interacted = true;
    renderMushrooms();
    checkCompletion();
  }
  activeMushroom = null;
}

submitCustom.addEventListener('click', evaluateCustom);
closePanel.addEventListener('click', closeInteraction);

renderHearts();
renderMushrooms();
requestAnimationFrame(loop);
