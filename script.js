/* ==========================================================================
   A Menina do Sótão · preferências e perfil local (sem servidor)
   ========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const PREFIX = 'lele:v1:';
const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      /* modo privado / armazenamento cheio: o layout continua funcionando */
    }
  }
};

/* --------------------------------------------------------------------------
   Modo calmo
   -------------------------------------------------------------------------- */

const calmBtn = $('#calmBtn');
let calm = Boolean(store.get('calm', false));

function applyCalm(value) {
  calm = value;
  document.body.classList.toggle('calm', calm);
  calmBtn.setAttribute('aria-pressed', String(calm));
  calmBtn.setAttribute('aria-label', calm ? 'Desativar modo calmo' : 'Ativar modo calmo');
}

applyCalm(calm);
calmBtn.addEventListener('click', () => {
  applyCalm(!calm);
  store.set('calm', calm);
});

/* --------------------------------------------------------------------------
   Tamanho do texto (3 níveis)
   -------------------------------------------------------------------------- */

const fontBtn = $('#fontBtn');
let fontLevel = Number(store.get('font', 0)) || 0;

function applyFont(level) {
  fontLevel = level % 3;
  document.documentElement.dataset.font = String(fontLevel);
  fontBtn.setAttribute(
    'aria-label',
    fontLevel === 0 ? 'Aumentar o texto' : fontLevel === 1 ? 'Aumentar mais o texto' : 'Voltar ao texto normal'
  );
}

applyFont(fontLevel);
fontBtn.addEventListener('click', () => {
  applyFont(fontLevel + 1);
  store.set('font', fontLevel);
});

/* --------------------------------------------------------------------------
   Som (desligado por padrão; feedback suave opcional)
   -------------------------------------------------------------------------- */

const soundBtn = $('#soundBtn');
let soundOn = Boolean(store.get('sound', false));

function applySound(value) {
  soundOn = value;
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  soundBtn.setAttribute('aria-label', soundOn ? 'Desativar sons' : 'Ativar sons');
}

function chime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
    osc.addEventListener('ended', () => ctx.close());
  } catch (error) {
    /* som é um extra: nunca deve quebrar a navegação */
  }
}

applySound(soundOn);
soundBtn.addEventListener('click', () => {
  applySound(!soundOn);
  store.set('sound', soundOn);
  if (soundOn) chime();
});

/* Efeitos sonoros suaves (respeitam o mesmo botão de som do site) */
function sfx(kind) {
  if (!soundOn) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.05;
    master.connect(ctx.destination);
    const play = (freq, type, start, dur, vol = 1) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(master);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };
    if (kind === 'roll') [180, 230, 160, 260].forEach((f, i) => play(f, 'square', i * 0.07, 0.05, 0.45));
    else if (kind === 'step') play(330, 'sine', 0, 0.08, 0.6);
    else if (kind === 'flip') { play(520, 'triangle', 0, 0.12); play(760, 'triangle', 0.1, 0.15); }
    else if (kind === 'choose') play(660, 'sine', 0, 0.13);
    else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => play(f, 'sine', i * 0.14, 0.24));
    else if (kind === 'snap') { play(1200, 'square', 0, 0.05, 0.6); play(1500, 'square', 0.06, 0.06, 0.5); }
    else if (kind === 'error') play(150, 'sawtooth', 0, 0.2, 0.5);
    else if (kind === 'growl') { play(82, 'sawtooth', 0, 0.3, 0.7); play(73, 'sawtooth', 0.07, 0.3, 0.5); }
    setTimeout(() => ctx.close(), 1600);
  } catch (error) {
    /* som é um extra: nunca deve quebrar a navegação */
  }
}

/* --------------------------------------------------------------------------
   Perfil local: nome + companheiro, salvo só neste aparelho
   -------------------------------------------------------------------------- */

const avatars = {
  lele: 'assets/pawn-lele.webp',
  dragon: 'assets/pawn-dragon.webp',
  blue: 'assets/pawn-blue.webp',
  brown: 'assets/pawn-brown.webp'
};

const profileChipImg = $('#profileChipImg');
const profileName = $('#profileName');
const nameInput = $('#name');
const profileForm = $('#profileForm');
const toastEl = $('#toast');
const cantinhoAvatar = $('.avatar-ring img');
let toastTimer;

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function renderProfile(profile) {
  if (!profile) {
    profileName.textContent = 'Cantinho';
    profileChipImg.src = avatars.lele;
    if (cantinhoAvatar) cantinhoAvatar.src = avatars.lele;
    return;
  }
  profileName.textContent = profile.name;
  profileChipImg.src = avatars[profile.avatar] || avatars.lele;
  if (cantinhoAvatar) cantinhoAvatar.src = avatars[profile.avatar] || avatars.lele;
}

const savedProfile = store.get('profile', null);
renderProfile(savedProfile);

if (savedProfile) {
  nameInput.value = savedProfile.name;
  const savedAvatar = $(`input[name="avatar"][value="${savedProfile.avatar}"]`);
  if (savedAvatar) savedAvatar.checked = true;
}

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim().slice(0, 20);

  if (!name) {
    nameInput.classList.remove('shake');
    void nameInput.offsetWidth;
    nameInput.classList.add('shake');
    nameInput.focus();
    toast('Escreva um nome ou apelido para continuar.');
    return;
  }

  const checked = $('input[name="avatar"]:checked');
  const profile = { name, avatar: checked ? checked.value : 'lele' };
  store.set('profile', profile);
  renderProfile(profile);
  toast(`Oi, ${name}! Seu cantinho está guardado.`);
});

$$('input[name="avatar"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (cantinhoAvatar) cantinhoAvatar.src = avatars[input.value] || avatars.lele;
  });
});

/* --------------------------------------------------------------------------
   Jogos: nesta fase, todos mostram o aviso de "em breve".
   Quando um jogo for implementado, basta adicionar o número em playableGames.
   -------------------------------------------------------------------------- */

const playableGames = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);

$$('.game-card').forEach((card) => {
  card.addEventListener('click', (event) => {
    if (playableGames.has(card.dataset.game)) return;
    event.preventDefault();
    toast('Este jogo chega na próxima fase. Por enquanto, explore o layout.');
    if (soundOn) chime();
  });
});

/* --- Utilitários gerais (fora das seções de jogo) --- */
$$('[data-close-game]').forEach((button) => {
  button.addEventListener('click', () => {
    closeGame1();
    closeGame2();
    closeGame3();
    closeGame4();
    closeGame5();
    closeGame6();
    closeGame7();
    closeGame8();
  });
});

/* --- Sincronização com o link (#jogo-N) e abertura inicial --- */
function syncGame7FromHash() {
  if (location.hash === '#jogo-7') openGame7();
  else if (game7.open) closeGame7();
}

function syncGame8FromHash() {
  if (location.hash === '#jogo-8') openGame8();
  else if (game8.open) closeGame8();
}

function syncGame6FromHash() {
  if (location.hash === '#jogo-6') openGame6();
  else if (game6.open) closeGame6();
}

function syncGame1FromHash() {
  if (location.hash === '#jogo-1') openGame1();
  else if (game1.open) closeGame1();
}

function syncGame2FromHash() {
  if (location.hash === '#jogo-2') openGame2();
  else if (game2.open) closeGame2();
}

function syncGame3FromHash() {
  if (location.hash === '#jogo-3') openGame3();
if (location.hash === '#jogo-4') openGame4();
if (location.hash === '#jogo-5') openGame5();
  else if (game3.open) closeGame3();
}

function syncGame4FromHash() {
  if (location.hash === '#jogo-4') openGame4();
if (location.hash === '#jogo-5') openGame5();
  else if (game4.open) closeGame4();
}

function syncGame5FromHash() {
  if (location.hash === '#jogo-5') openGame5();
  else if (game5.open) closeGame5();
}

function syncGamesFromHash() {
  syncGame1FromHash();
  syncGame2FromHash();
  syncGame3FromHash();
  syncGame4FromHash();
  syncGame5FromHash();
  syncGame6FromHash();
  syncGame7FromHash();
  syncGame8FromHash();
}

window.addEventListener('hashchange', syncGamesFromHash);

/* Jogo 6 removido da versao publica */
function openGame6() { /* jogo nao publicado nesta versao */ }
function closeGame6() { /* jogo nao publicado nesta versao */ }
function updateGame6SavedButton() { /* jogo nao publicado nesta versao */ }
function syncGame6FromHash() { /* jogo nao publicado nesta versao */ }

/* Jogo 8 removido da versao publica */
function openGame8() { /* jogo nao publicado nesta versao */ }
function closeGame8() { /* jogo nao publicado nesta versao */ }
function updateGame8SavedButton() { /* jogo nao publicado nesta versao */ }
function syncGame8FromHash() { /* jogo nao publicado nesta versao */ }

/* --------------------------------------------------------------------------
   Jogo 1 · Quem sou eu?
   Autorretrato interativo (Atividade 1 do livro). Guardado só no aparelho.
   -------------------------------------------------------------------------- */

const game1 = $('#game1');
const game1Body = $('#game1Body');
const game1Footer = $('#game1Footer');
const game1Steps = $$('.game-step', game1);
const game1Progress = $('#game1Progress');
const game1Status = $('#game1Status');
const game1SavedBtn = $('#game1SavedBtn');
const game1SavedCount = $('#game1SavedCount');
const game1Figure = $('#game1Figure');
const game1PortraitName = $('#game1PortraitName');
const game1PortraitSections = $('#game1PortraitSections');
const game1Error = $('#game1Error');

const GAME1_GROUPS = [
  { id: 'gostos', title: 'O que eu gosto', tags: [
    ['livros', 'Livros'], ['musica', 'Música'], ['brincar', 'Brincar'], ['desenhar', 'Desenhar'], ['dancar', 'Dançar'],
    ['esportes', 'Esportes'], ['animais', 'Animais'], ['jogos', 'Jogos'], ['natureza', 'Natureza'], ['historias', 'Histórias']
  ]},
  { id: 'emocoes', title: 'O que eu sinto', tags: [
    ['alegria', 'Alegria'], ['raiva', 'Raiva'], ['medo', 'Medo'], ['tristeza', 'Tristeza'],
    ['amor', 'Amor'], ['calma', 'Calma'], ['coragem', 'Coragem'], ['saudade', 'Saudade']
  ]},
  { id: 'qualidades', title: 'O que eu sou', tags: [
    ['criativo', 'Criativo(a)'], ['gentil', 'Gentil'], ['curioso', 'Curioso(a)'], ['forte', 'Forte'],
    ['inteligente', 'Inteligente'], ['engracado', 'Engraçado(a)'], ['paciente', 'Paciente'], ['amigo', 'Amigo(a)']
  ]},
  { id: 'medos', title: 'Meus medos', tags: [
    ['escuro', 'Escuro'], ['barulho', 'Barulho forte'], ['errar', 'Errar'], ['nao-aceito', 'Não ser aceito(a)'],
    ['solidao', 'Solidão'], ['monstros', 'Monstros'], ['sozinho', 'Ficar sozinho(a)'], ['tempestade', 'Tempestade']
  ]},
  { id: 'sonhos', title: 'Meus sonhos', tags: [
    ['viajar', 'Viajar'], ['amigos', 'Ter amigos'], ['ser-feliz', 'Ser feliz'], ['ajudar', 'Ajudar os outros'],
    ['talento', 'Ter um talento'], ['sorrir', 'Fazer alguém sorrir'], ['bichinho', 'Ter um bichinho'], ['vencer', 'Vencer desafios']
  ]}
];

const game1GroupById = (id) => GAME1_GROUPS.find((group) => group.id === id);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const game1ProgressSteps = { gostos: 1, emocoes: 2, qualidades: 3, medos: 4, rico: 5 };

let portrait = store.get('autorretrato', null);
if (!portrait || typeof portrait !== 'object') portrait = { figure: 'lele', groups: {} };
if (!portrait.groups || typeof portrait.groups !== 'object') portrait.groups = {};
const selectedTags = {};
GAME1_GROUPS.forEach((group) => {
  const saved = Array.isArray(portrait.groups[group.id]) ? portrait.groups[group.id].filter((item) => typeof item === 'string') : [];
  selectedTags[group.id] = new Set(saved);
});
let game1ReturnFocus = null;
let game1CurrentStep = 'intro';
const GAME1_NEXT = { gostos: 'emocoes', emocoes: 'qualidades', qualidades: 'medos', medos: 'rico' };
const game1SaveBtn = $('#game1Save');

function game1TagLabel(group, id) {
  const found = group.tags.find(([tagId]) => tagId === id);
  return found ? found[1] : id;
}

function renderGame1Group(group) {
  const container = $(`#game1${cap(group.id)}`);
  container.innerHTML = '';
  const tagIds = new Set(group.tags.map(([id]) => id));

  group.tags.forEach(([id, label]) => {
    const pressed = selectedTags[group.id].has(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.tag = id;
    button.setAttribute('aria-pressed', String(pressed));
    button.textContent = label;
    button.addEventListener('click', () => {
      if (selectedTags[group.id].has(id)) selectedTags[group.id].delete(id);
      else selectedTags[group.id].add(id);
      button.setAttribute('aria-pressed', String(!pressed));
      game1Error.hidden = true;
      updateGame1SavedButton();
    });
    container.appendChild(button);
  });

  selectedTags[group.id].forEach((id) => {
    if (tagIds.has(id)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip chip-custom';
    button.dataset.custom = id;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', `Remover ${id}`);
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-sparkle');
    icon.appendChild(use);
    button.append(icon, document.createTextNode(id));
    button.addEventListener('click', () => {
      selectedTags[group.id].delete(id);
      renderGame1Group(group);
      updateGame1SavedButton();
    });
    container.appendChild(button);
  });
}

function renderGame1All() {
  GAME1_GROUPS.forEach(renderGame1Group);
}

function game1SelectedCount() {
  return GAME1_GROUPS.reduce((total, group) => total + selectedTags[group.id].size, 0);
}

function updateGame1SavedButton() {
  const total = game1SelectedCount();
  game1SavedBtn.hidden = total === 0;
  game1SavedCount.textContent = total ? `(${total})` : '';
}

function renderGame1Portrait() {
  const figureAvatar = savedProfile && savedProfile.avatar && avatars[savedProfile.avatar] ? savedProfile.avatar : 'lele';
  game1Figure.src = avatars[figureAvatar] || avatars.lele;
  game1Figure.alt = savedProfile && savedProfile.name ? `A figura de ${savedProfile.name}` : 'Personagem do retrato';
  game1PortraitName.textContent = (savedProfile && savedProfile.name) || 'Você';

  game1PortraitSections.innerHTML = '';
  GAME1_GROUPS.forEach((group) => {
    const chosen = [...selectedTags[group.id]].map((id) => game1TagLabel(group, id));
    if (!chosen.length) return;
    const section = document.createElement('div');
    section.className = 'portrait-section';
    const heading = document.createElement('h3');
    heading.textContent = group.title;
    const list = document.createElement('ul');
    list.className = 'portrait-chips';
    chosen.forEach((text) => {
      const item = document.createElement('li');
      item.className = 'portrait-chip';
      item.textContent = text;
      list.appendChild(item);
    });
    section.append(heading, list);
    game1PortraitSections.appendChild(section);
  });

  if (!game1PortraitSections.children.length) {
    const hint = document.createElement('p');
    hint.className = 'game-hint';
    hint.textContent = 'Nada marcado ainda — volte e escolha o que te descreve.';
    game1PortraitSections.appendChild(hint);
  }
}

function setGame1Step(step) {
  game1Steps.forEach((section) => {
    section.hidden = section.dataset.step !== step;
  });

  const progressStep = game1ProgressSteps[step];
  game1Progress.hidden = !progressStep;
  if (progressStep) {
    $$('span', game1Progress).forEach((bar, index) => {
      bar.classList.toggle('on', index < progressStep);
    });
  }

  const showFooter = step === 'rico' || Boolean(GAME1_NEXT[step]);
  game1Footer.hidden = !showFooter;
  game1SaveBtn.textContent = step === 'rico' ? 'Guardar meu autorretrato' : 'Continuar';
  if (step === 'rico') renderGame1Portrait();
  game1CurrentStep = step;
  game1Body.scrollTop = 0;
  const heading = $('.game-step:not([hidden]) h2', game1);
  if (heading) heading.focus({ preventScroll: true });
}

function openGame1() {
  if (!game1 || game1.open) return;
  game1ReturnFocus = document.activeElement;
  updateGame1SavedButton();
  renderGame1All();
  game1.showModal();
  document.body.classList.add('game-open');
  setGame1Step('intro');
}

function closeGame1() {
  if (game1 && game1.open) game1.close();
}

game1.addEventListener('close', () => {
  document.body.classList.remove('game-open');
  if (location.hash === '#jogo-1') {
    history.replaceState(null, '', `${location.pathname}${location.search}#jogos`);
  }
  if (game1ReturnFocus && typeof game1ReturnFocus.focus === 'function') {
    game1ReturnFocus.focus({ preventScroll: true });
  }
});

game1.addEventListener('click', (event) => {
  if (event.target === game1) closeGame1();
});

$$('[data-game1-back]', game1).forEach((button) => {
  button.addEventListener('click', () => setGame1Step(button.dataset.game1Back));
});

$('[data-game1-start]', game1).addEventListener('click', () => {
  game1Error.hidden = true;
  renderGame1All();
  setGame1Step('gostos');
});

game1SavedBtn.addEventListener('click', () => {
  setGame1Step('rico');
});

$$('[data-game1-custom]', game1).forEach((button) => {
  button.addEventListener('click', () => addGame1Custom(button.dataset.game1Custom));
});

$$('.custom-tag-row input', game1).forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const groupId = input.id.replace('game1Custom', '').toLowerCase();
      addGame1Custom(groupId);
    }
  });
});

function addGame1Custom(groupId) {
  const group = game1GroupById(groupId);
  if (!group) return;
  const input = $(`#game1Custom${cap(groupId)}`);
  const text = input.value.trim().slice(0, 40);
  if (!text) {
    input.focus();
    return;
  }
  selectedTags[groupId].add(text);
  input.value = '';
  game1Error.hidden = true;
  renderGame1Group(group);
  updateGame1SavedButton();
  game1Status.textContent = 'Ideia sua adicionada.';
}

game1SaveBtn.addEventListener('click', () => {
  if (game1CurrentStep !== 'rico') {
    const next = GAME1_NEXT[game1CurrentStep];
    if (next) setGame1Step(next);
    return;
  }
  if (game1SelectedCount() === 0) {
    game1Error.hidden = false;
    return;
  }
  const groups = {};
  GAME1_GROUPS.forEach((group) => {
    groups[group.id] = [...selectedTags[group.id]];
  });
  portrait = {
    figure: (savedProfile && savedProfile.avatar) || 'lele',
    groups,
    updatedAt: new Date().toISOString()
  };
  store.set('autorretrato', portrait);
  updateGame1SavedButton();
  game1Status.textContent = 'Autorretrato guardado.';
  setGame1Step('finish');
});

$('#game1SeePortrait').addEventListener('click', () => setGame1Step('rico'));

/* --------------------------------------------------------------------------
   Jogo 2 · O que eu preciso agora?
   Quiz do livro (Atividade 2): 5 perguntas com respostas de A a E.
   Cada letra é uma necessidade emocional: vínculo, autonomia, limites,
   emoções ou lazer. Resultado guardado só no aparelho.
   -------------------------------------------------------------------------- */

const game2 = $('#game2');
const game2Body = $('#game2Body');
const game2Steps = $$('.game-step', game2);
const game2Progress = $('#game2Progress');
const game2Status = $('#game2Status');
const game2SavedBtn = $('#game2SavedBtn');
const game2QuizEyebrow = $('#game2QuizEyebrow');
const game2QuizQuestion = $('#game2QuizQuestion');
const game2QuizOptions = $('#game2QuizOptions');
const game2QuizBack = $('#game2QuizBack');
const game2ResultLetter = $('#game2ResultLetter');
const game2ResultName = $('#game2ResultName');
const game2ResultText = $('#game2ResultText');
const game2ResultCounts = $('#game2ResultCounts');
const game2Vignette = $('#game2Vignette');
const game2ConfettiStage = $('#game2ConfettiStage');

const GAME2_QUESTIONS = [
  { q: 'Quando fico confuso…', options: [
    ['a', 'Peço ajuda.'],
    ['b', 'Penso sozinho.'],
    ['c', 'Sigo o que é certo.'],
    ['d', 'Quero desabafar, mas não consigo.'],
    ['e', 'Me distraio.']
  ]},
  { q: 'No meu dia livre, gosto de…', options: [
    ['a', 'Estar com pessoas queridas.'],
    ['b', 'Fazer algo sozinho.'],
    ['c', 'Organizar minhas coisas.'],
    ['d', 'Criar ou falar de sentimentos.'],
    ['e', 'Fazer algo leve e divertido.']
  ]},
  { q: 'Quero que entendam que…', options: [
    ['a', 'Preciso de amor.'],
    ['b', 'Gosto de liberdade.'],
    ['c', 'Preciso de limites.'],
    ['d', 'Tenho sentimentos fortes.'],
    ['e', 'Preciso de diversão.']
  ]},
  { q: 'Quando algo dá errado…', options: [
    ['a', 'Procuro alguém.'],
    ['b', 'Tento resolver sozinho.'],
    ['c', 'Vejo o que posso aprender.'],
    ['d', 'Fico muito mexido por dentro.'],
    ['e', 'Vou fazer algo que gosto.']
  ]},
  { q: 'Quando alguém me critica…', options: [
    ['a', 'Fico inseguro.'],
    ['b', 'Quero fazer do meu jeito.'],
    ['c', 'Vejo se a crítica faz sentido.'],
    ['d', 'Me sinto mal e guardo.'],
    ['e', 'Tento esquecer e me divertir.']
  ]}
];

const GAME2_RESULTS = {
  a: { name: 'Vínculo', art: 'quiz-vinculo', text: 'Você precisa de carinho, apoio e pessoas que te façam sentir seguro.' },
  b: { name: 'Autonomia', art: 'quiz-autonomia', text: 'Você gosta de ter espaço para decidir e fazer as coisas do seu jeito.' },
  c: { name: 'Limites', art: 'quiz-limites', text: 'Você fica melhor quando tudo está claro e com regras.' },
  d: { name: 'Emoções', art: 'quiz-emocoes', text: 'Você sente intensamente e precisa colocar para fora — falando, escrevendo ou criando.' },
  e: { name: 'Lazer', art: 'quiz-lazer', text: 'Você precisa de descanso, diversão e leveza para se equilibrar.' }
};

let quiz = store.get('quiz', null);
if (!quiz || typeof quiz !== 'object' || !quiz.answers || typeof quiz.answers !== 'object') quiz = null;
let game2Answers = quiz ? { ...quiz.answers } : {};
let game2Index = 0;
let game2ReturnFocus = null;

function setGame2Step(step) {
  game2Steps.forEach((section) => {
    section.hidden = section.dataset.step !== step;
  });
  game2Progress.hidden = step !== 'quiz';
  if (step === 'quiz') {
    $$('span', game2Progress).forEach((bar, index) => {
      bar.classList.toggle('on', index < game2Index);
    });
  }
  game2Body.scrollTop = 0;
  const heading = $('.game-step:not([hidden]) h2', game2);
  if (heading) heading.focus({ preventScroll: true });
}

function updateGame2SavedButton() {
  game2SavedBtn.hidden = !quiz;
}

function renderGame2Question() {
  const question = GAME2_QUESTIONS[game2Index];
  game2QuizEyebrow.textContent = `Pergunta ${game2Index + 1} de ${GAME2_QUESTIONS.length}`;
  game2QuizQuestion.textContent = question.q;
  game2QuizBack.hidden = game2Index === 0;
  game2QuizOptions.innerHTML = '';
  question.options.forEach(([letter, text]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.dataset.option = letter;
    button.innerHTML = `<span class="quiz-option-letter" aria-hidden="true">${letter.toUpperCase()}</span>`;
    const label = document.createElement('span');
    label.className = 'quiz-option-text';
    label.textContent = text;
    button.appendChild(label);
    button.addEventListener('click', () => {
      game2Answers[`q${game2Index + 1}`] = letter;
      sfx('choose');
      game2Index += 1;
      if (game2Index < GAME2_QUESTIONS.length) {
        renderGame2Question();
      } else {
        finishGame2Quiz();
      }
    });
    game2QuizOptions.appendChild(button);
  });
  game2Status.textContent = `Pergunta ${game2Index + 1} de ${GAME2_QUESTIONS.length}`;
}

function renderGame2Result(data) {
  const result = GAME2_RESULTS[data.result];
  game2Vignette.src = `assets/ai/${result.art}.webp`;
  game2Vignette.alt = `Ilustração da necessidade ${result.name}`;
  game2ResultLetter.textContent = data.result.toUpperCase();
  game2ResultName.textContent = result.name;
  game2ResultText.textContent = result.text;
  game2ResultCounts.innerHTML = '';
  ['a', 'b', 'c', 'd', 'e'].forEach((letter) => {
    const count = data.counts[letter] || 0;
    const chip = document.createElement('span');
    chip.className = 'quiz-count' + (letter === data.result ? ' quiz-count-top' : '');
    chip.setAttribute('role', 'listitem');
    chip.innerHTML = `<b>${letter.toUpperCase()}</b> ${GAME2_RESULTS[letter].name} · ${count}`;
    game2ResultCounts.appendChild(chip);
  });
}

function finishGame2Quiz() {
  const counts = { a: 0, b: 0, c: 0, d: 0, e: 0 };
  Object.values(game2Answers).forEach((letter) => {
    if (counts[letter] !== undefined) counts[letter] += 1;
  });
  const result = ['a', 'b', 'c', 'd', 'e'].reduce((best, letter) => {
    return counts[letter] > counts[best] ? letter : best;
  }, 'a');
  quiz = { answers: { ...game2Answers }, counts, result, updatedAt: new Date().toISOString() };
  store.set('quiz', quiz);
  updateGame2SavedButton();
  renderGame2Result(quiz);
  game2Status.textContent = 'Quiz terminado.';
  setGame2Step('result');
}

function openGame2() {
  if (!game2 || game2.open) return;
  game2ReturnFocus = document.activeElement;
  updateGame2SavedButton();
  game2.showModal();
  document.body.classList.add('game-open');
  setGame2Step('intro');
}

function closeGame2() {
  if (game2 && game2.open) game2.close();
}

game2.addEventListener('close', () => {
  document.body.classList.remove('game-open');
  if (location.hash === '#jogo-2') {
    history.replaceState(null, '', `${location.pathname}${location.search}#jogos`);
  }
  if (game2ReturnFocus && typeof game2ReturnFocus.focus === 'function') {
    game2ReturnFocus.focus({ preventScroll: true });
  }
});

game2.addEventListener('click', (event) => {
  if (event.target === game2) closeGame2();
});

$('[data-game2-start]', game2).addEventListener('click', () => {
  game2Index = 0;
  game2Answers = {};
  renderGame2Question();
  setGame2Step('quiz');
});

game2QuizBack.addEventListener('click', () => {
  if (game2Index === 0) return;
  game2Index -= 1;
  sfx('flip');
  renderGame2Question();
});

game2SavedBtn.addEventListener('click', () => {
  if (!quiz) return;
  renderGame2Result(quiz);
  setGame2Step('result');
});

$('#game2Refazer').addEventListener('click', () => {
  game2Index = 0;
  game2Answers = {};
  renderGame2Question();
  setGame2Step('quiz');
});

$('#game2SeeResult').addEventListener('click', () => {
  if (quiz) renderGame2Result(quiz);
  setGame2Step('result');
});

$('#game2Finish').addEventListener('click', () => {
  setGame2Step('finish');
  sfx('win');
  spawnConfetti('game2ConfettiStage', ['#AFC8F0', '#7FB5B5', '#C4A3D4', '#F3B6C8', '#F2D05A']);
});

/* Jogo 3 removido da versao publica */
function openGame3() { /* jogo nao publicado nesta versao */ }
function closeGame3() { /* jogo nao publicado nesta versao */ }
function updateGame3SavedButton() { /* jogo nao publicado nesta versao */ }
function syncGame3FromHash() { /* jogo nao publicado nesta versao */ }

/* Jogo 4 removido da versao publica */
function openGame4() { /* jogo nao publicado nesta versao */ }
function closeGame4() { /* jogo nao publicado nesta versao */ }
function updateGame4SavedButton() { /* jogo nao publicado nesta versao */ }
function syncGame4FromHash() { /* jogo nao publicado nesta versao */ }

/* Jogo 5 removido da versao publica */
function openGame5() { /* jogo nao publicado nesta versao */ }
function closeGame5() { /* jogo nao publicado nesta versao */ }
function updateGame5SavedButton() { /* jogo nao publicado nesta versao */ }
function syncGame5FromHash() { /* jogo nao publicado nesta versao */ }

/* Jogo 7 removido da versao publica */
function openGame7() { /* jogo nao publicado nesta versao */ }
function closeGame7() { /* jogo nao publicado nesta versao */ }
function updateGame7SavedButton() { /* jogo nao publicado nesta versao */ }
function syncGame7FromHash() { /* jogo nao publicado nesta versao */ }

/* ===== FIM DAS SEÇÕES DE JOGO — não remover este bloco ===== */

/* --- Abertura inicial (depois das seções de jogo) --- */
updateGame1SavedButton();
updateGame2SavedButton();
updateGame3SavedButton();
updateGame4SavedButton();
updateGame5SavedButton();
updateGame8SavedButton();
if (location.hash === '#jogo-1') openGame1();
if (location.hash === '#jogo-2') openGame2();
if (location.hash === '#jogo-3') openGame3();
if (location.hash === '#jogo-4') openGame4();
if (location.hash === '#jogo-5') openGame5();
if (location.hash === '#jogo-6') openGame6();
if (location.hash === '#jogo-7') openGame7();
if (location.hash === '#jogo-8') openGame8();


/* --------------------------------------------------------------------------
   Navegação inferior: destaca a seção visível
   -------------------------------------------------------------------------- */

const navLinks = $$('.bottom-nav a');
const sections = ['inicio', 'jogos', 'cantinho', 'livro']
  .map((id) => document.getElementById(id))
  .filter(Boolean);

function setActiveNav(id) {
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updateActiveNav() {
  if (!sections.length) return;
  const marker = window.scrollY + 140;
  let current = sections[0];
  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (top <= marker) current = section;
  });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    current = sections[sections.length - 1];
  }
  setActiveNav(current.id);
}

let navTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(() => {
      updateActiveNav();
      navTicking = false;
    });
  },
  { passive: true }
);
window.addEventListener('resize', updateActiveNav);
navLinks.forEach((link) => {
  link.addEventListener('click', () => setActiveNav(link.getAttribute('href').slice(1)));
});
updateActiveNav();
