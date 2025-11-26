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
let awaitingResponse = false;
let canAdvance = false;
let jumping = false;
let spawnCounter = 0;
let spawnTarget = 120;

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

let mushrooms = [];
let nextMushroomId = mushrooms.length + 1;

const dino = {
  x: 40,
  speed: 6,
  width: 48,
};

const mushroomSpeed = 1.8;

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
    if (m.replyText) {
      const reply = document.createElement('div');
      reply.className = 'reply-bubble';
      reply.textContent = m.replyText;
      el.appendChild(reply);
    }
    mushroomContainer.appendChild(el);
  });
}

function moveDino() {
  const movingLeft = pressed.has('ArrowLeft');
  const movingRight = pressed.has('ArrowRight');
  if (movingLeft) dino.x -= dino.speed;
  if (movingRight) dino.x += dino.speed;
  if (awaitingResponse && activeMushroom) {
    const stopX = activeMushroom.x - dino.width - 6;
    dino.x = Math.min(dino.x, stopX);
  }
  dino.x = Math.max(0, Math.min(dino.x, gameArea.clientWidth - dino.width));
  dinoEl.style.setProperty('--x', `${dino.x}px`);
  speechBubble.style.setProperty('--x', `${dino.x}px`);
}

function getStopX() {
  return 40 + dino.x + dino.width + 6;
}

function spawnMushroom() {
  const offset = 60 + Math.random() * 140;
  mushrooms.push({
    id: nextMushroomId++,
    x: gameArea.clientWidth + offset,
    interacted: false,
    replyText: ''
  });
  spawnTarget = 90 + Math.floor(Math.random() * 120);
  spawnCounter = 0;
}

function updateMushrooms() {
  const walking = pressed.has('ArrowLeft') || pressed.has('ArrowRight');
  if (walking) {
    spawnCounter += 1;
    if (spawnCounter >= spawnTarget) {
      spawnMushroom();
    }
  }

  let haltedForInvite = null;
  mushrooms = mushrooms
    .map((m) => {
      if (activeMushroom && m.id === activeMushroom.id && awaitingResponse) {
        return m;
      }
      const nextX = m.x - mushroomSpeed;
      if (!haltedForInvite && !awaitingResponse && !m.interacted) {
        const stopX = getStopX();
        if (nextX <= stopX) {
          const halted = { ...m, x: stopX };
          haltedForInvite = halted;
          return halted;
        }
      }
      return {
        ...m,
        x: nextX
      };
    })
    .filter((m) => m.x > -80 || (activeMushroom && m.id === activeMushroom.id));

  if (activeMushroom) {
    const updated = mushrooms.find((m) => m.id === activeMushroom.id);
    if (updated) {
      activeMushroom = updated;
    }
  }

  if (haltedForInvite) {
    activeMushroom = haltedForInvite;
    openPanel(haltedForInvite);
  }

  renderMushrooms();
}

function checkCollision() {
  if (activeMushroom || awaitingResponse) return;
  const dinoRect = {
    x: dino.x + 40,
    width: dino.width,
  };
  const hit = mushrooms.find((m) =>
    !m.interacted && Math.abs(m.x - dinoRect.x) < dinoRect.width
  );
  if (hit) {
    hit.x = Math.min(hit.x, getStopX());
    mushrooms = mushrooms.map((m) => (m.id === hit.id ? hit : m));
    openPanel(hit);
  }
}

function openPanel(mushroom) {
  activeMushroom = mushroom;
  awaitingResponse = true;
  canAdvance = false;
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
  applyScore(response.score, response.note, response.text);
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
  activeMushroom.replyText = responseText || 'Thanks for letting me know!';
  canAdvance = true;
  const tone = score > 0 ? '🌟 That felt kind!' : '💔 Ouch!';
  feedbackEl.textContent = `${tone} ${note}` + (responseText ? ` (You wrote: "${responseText}")` : '');
  renderHearts();
  renderMushrooms();
  feedbackEl.insertAdjacentHTML('beforeend', ' Press ↑ to jump over and continue.');
  checkCompletion();
}

function checkCompletion() {
  if (mushrooms.length > 0 && mushrooms.every((m) => m.interacted)) {
    feedbackEl.innerHTML += ` <span class="summary">All invites done! Dino's feeling ${health >= hearts / 2 ? 'encouraged' : 'a bit sad'}.</span>`;
    panel.hidden = false;
  }
}

function closeInteraction() {
  feedbackEl.textContent = 'Please answer so the mushroom can reply before you jump over.';
}

function loop() {
  moveDino();
  updateMushrooms();
  checkCollision();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    pressed.add(e.key);
  }
  if (e.key === 'ArrowUp' && !jumping) {
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
  if (activeMushroom && canAdvance) {
    speechBubble.classList.remove('visible');
    panel.hidden = true;
    mushrooms = mushrooms.filter((m) => m.id !== activeMushroom.id);
    activeMushroom = null;
    awaitingResponse = false;
    canAdvance = false;
  }
}

submitCustom.addEventListener('click', evaluateCustom);
closePanel.addEventListener('click', closeInteraction);

renderHearts();
renderMushrooms();
requestAnimationFrame(loop);
