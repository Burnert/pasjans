// Utility functions

String.prototype.replaceAll = function(searchVal, replaceVal) {
  let newString = this;
  while (newString.includes(searchVal)) {
    newString = newString.replace(searchVal, replaceVal);
  }
  return newString;
}

/** Creates HTML Element with set attributes */
function createElement(type, attributes) {
  const element = document.createElement(type);
  attributes.forEach(attr => {
    const attribute = document.createAttribute(attr.name);
    attribute.value = attr.value;
    element.attributes.setNamedItem(attribute);
  });
  return element;
}

const pfx = ["webkit", "moz", "MS", "o", ""];
// Adds prefixed event listeners to element 
function PrefixedEvent(element, type, callback) {
	for (let p = 0; p < pfx.length; p++) {
		if (!pfx[p]) type = type.toLowerCase();
		element.addEventListener(pfx[p]+type, callback, false);
	}
}

const loadedImages = [];
function preloadImage(path) {
  return new Promise((resolve, reject) => {
    // Image already preloaded
    if (loadedImages.indexOf(path) != -1) resolve();

    const image = new Image();
    image.addEventListener('load', () => {
      resolve();
      loadedImages.push(path);
    });
    image.addEventListener('error', () => reject());
    image.src = path;
  });
}

// Variables and constants

const gameContainer = document.getElementById('game');
const scoreDisplay = document.getElementById('scoreDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const movesDisplay = document.getElementById('movesDisplay');

const btNewGame = document.querySelectorAll('.b-newgame');
const btRestartGame = document.querySelectorAll('.b-restartgame');
const btPauseGame = document.querySelectorAll('.b-pausegame');
const btSaveGame = document.querySelectorAll('.b-savegame');
const btLoadGame = document.querySelectorAll('.b-loadgame');
const btSettings = document.querySelectorAll('.b-settings');
const btUndo = document.querySelectorAll('.b-undo');

const modalSettings = document.getElementById('settings');

const modalGameOver = document.getElementById('game-over');
const btCloseGameOver = modalGameOver.querySelector('.close');

const modalPause = document.getElementById('pause');
const btClosePause = modalPause.querySelector('.close');

const modalLoad = document.getElementById('load');
const inputSaveFile = document.getElementById('in-savefile');
const btLoadSaveFile = document.getElementById('b-loadsavefile');
const fileDataDisplay = modalLoad.querySelector('.file-data');
const btCloseLoad = modalLoad.querySelector('.close');

const btCloseModalArray = document.querySelectorAll('.close');

const btNewGame2 = document.getElementById('b-newgame2');
const btRestartGame2 = document.getElementById('b-restartgame2');

const radGameType = modalSettings.querySelectorAll('[name="gametype"]');
const radCardBack = modalSettings.querySelectorAll('[name="cardback"]');

const cardObjects = [];
let cardBack = 'green';
let cursorPosition = { x: 0, y: 0 };
let score = 0;
let moves = 0;
let gameTime = 0;
let timeHandle = null;
let bGameStarted = false;
let bGameOver = false;

// const moveHistory = [];
const stateHistory = [];

let loadedSaveFile;

// Global card size

let cardWidth = 120;
let cardHeight = 180;
let cardCenterX = 60;
let cardCenterY = 90;

// Card collections

const stacks = [];
const piles = [];
let reservePile;

// Empty elements (empty spots)

const stacksEmpty = [];
const pilesEmpty = [];
let reserveEmpty;

// Game rules

let selectedGameType = 'kl1';
let currentGameType = 'kl1';
const gameRules = {
  stackNum: 7,
  reserveShow: 1,
  decks: 1,
};

function isCard(object) {
  return getObjectCollectionType(object) == 'card';
}

function getCardById(id) {
  return cardObjects.find(card => card.id == id);
}

function getCardFromElement(element) {
  return getCardById(element.id.slice(1));
}

function getObjectCollectionType(object) {
  const idType = object.element.id.slice(0, 1);

  switch (idType) {
    case 'c':
      return 'card';
    case 's':
      return 'stack';
    case 'p':
      return 'pile';
    case 'r':
      return 'reserve';
    default:
      return ''; 
  }
}

function getObjectFromElement(element) {
  const idNumber = element.id.slice(1);
  const idType = element.id.slice(0, 1);
  switch (idType) {
    case 'c':
      return getCardById(idNumber);
    case 's':
      return stacksEmpty[idNumber];
    case 'p':
      return pilesEmpty[idNumber];
    case 'r':
      return reserveEmpty;
    default:
      return undefined;
  }
}

function getReferenceFromEmpty(empty) {
  const idNumber = empty.id.slice(1);
  const idType = empty.id.slice(0, 1);
  switch (idType) {
    case 's':
      return stacks[idNumber];
    case 'p':
      return piles[idNumber];
    case 'r':
      return reservePile;
    default:
      return undefined;
  }
}

function getFloatingCards() {
  return cardObjects.filter(card => card.floating);
}

function compareOwnerObjects(owner1, owner2) {
  return (
    owner1.type == owner2.type && 
    owner1.reference == owner2.reference &&
    owner1.index == owner2.index
  );
}

function alterObject(owner, args) {
  return Object.assign({}, owner, args);
}

function updateScoreDisplay() {
  scoreDisplay.innerHTML = score;
}
function addScore(points) {
  score = Math.max(0, score + points);
  updateScoreDisplay();
}
function resetScore() {
  score = 0;
  updateScoreDisplay();
}

function updateMovesDisplay() {
  movesDisplay.innerHTML = moves;
}
function subtractMove() {
  moves--;
  updateMovesDisplay();
}
function addMove(move) {
  if (move.save) {
    // moveHistory.push(move);
    saveState();
  }
  if (!move.first && !(move.type == 'reserve' && move.reset)) {
    moves++;
  }
  updateMovesDisplay();
}

function serialiseCard(card) {
  return String.fromCharCode(card.id | (card.revealed << 7));
}
function unserialiseCard(char) {
  const bits = char.charCodeAt(0);
  const id = bits & 0x7F;
  const revealed = bits >>> 7;
  return {
    id,
    revealed,
  };
}

function decodeStateString(state) {
  const sections = state.split('\u000F');
  const splitSections = sections.map(sect => sect.split('\u001F'));
  return splitSections.map(section => section.map(str => str.split('').map(char => unserialiseCard(char))));
}

function isStateReserveReset(state, previousState) {
  const decodedState = decodeStateString(state);
  const decodedPreviousState = decodeStateString(previousState);

  // If current state has cards in hidden reserve 
  // and the previous move doesn't have cards in hidden reserve,
  // the move has to be a reserve reset.
  return decodedState[0][0].length > 0 && decodedPreviousState[0][0].length == 0;
}

// Saves game state to the history by serialising cards
function saveState() {
  const reserveHiddenCards = reservePile.hiddenStack.map(card => serialiseCard(card));
  const reserveCards = reservePile.stack.map(card => serialiseCard(card));
  const stacksCards = stacks.map(stack => stack.stack.map(card => serialiseCard(card)));
  const pilesCards = piles.map(pile => pile.stack.map(card => serialiseCard(card)));

  const reduceCardArray = array => array.length ? array.reduce((result, card) => result + card) : '';

  // 0xF  (\u000F) -> major split character
  // 0x1F (\u001F) -> minor split character

  const state = [
    reduceCardArray(reserveHiddenCards),
    reduceCardArray(reserveCards),
    stacksCards.map(stack => reduceCardArray(stack)).join('\u001F'),
    pilesCards.map(pile => reduceCardArray(pile)).join('\u001F'),
  ].join('\u000F');
  stateHistory.push(state);
}

// Loads game state by unserialising cards
function loadState(state) {
  // Clear everything first
  reservePile.hiddenStack.splice(0, reservePile.hiddenLength());
  reservePile.stack.splice(0, reservePile.getLength());
  stacks.forEach(stack => stack.stack.splice(0, stack.getLength()));
  piles.forEach(pile => pile.stack.splice(0, pile.getLength()));

  const unserialisedSections = decodeStateString(state);
  unserialisedSections.forEach((section, sectIndex) => {
    section.forEach((nestedSect, nestedIndex) => {
      nestedSect.forEach((card, index) => {
        const cardObject = getCardById(card.id);
        switch (sectIndex) {
          case 0:
            forcePutCard({ type: 'reserve', reference: reservePile, index: index + 100 }, cardObject);
            break;
          case 1:
            forcePutCard({ type: 'reserve', reference: reservePile, index: index }, cardObject);
            break;
          case 2:
            forcePutCard({ type: 'stack', reference: stacks[nestedIndex], index: index }, cardObject);
            break;
          case 3:
            forcePutCard({ type: 'pile', reference: piles[nestedIndex], index: index }, cardObject);
            break;
        }
        if (cardObject.revealed != card.revealed) {
          cardObject.setRevealedAnim(card.revealed);
        }
      });
    }); 
  });
}

function clearHistory() {
  // moveHistory.splice(0, moveHistory.length);
  stateHistory.splice(0, stateHistory.length);
  moves = 0;
  movesDisplay.innerHTML = moves;
}

function twoDigit(number) {
  return number < 10 ? '0' + number : number;
}

function timeToHMS(time) {
  const h = Math.floor(time / 3600) % 60;
  const m = Math.floor(time / 60) % 60;
  const s = time % 60;
  return { h, m, s };
}
function formatTime(hms) {
  const { h, m, s } = hms;
  return `${gameTime >= 3600 ? (twoDigit(h) + ':') : ''}${gameTime >= 3600 ? twoDigit(m) : m}:${twoDigit(s)}`;
}

function updateTimeDisplay() {
  timeDisplay.innerHTML = formatTime(timeToHMS(gameTime));
}
function startTime() {
  if (!timeHandle) {
    setTimeout(updateTime, 1000);
  }
}
function stopTime() {
  if (timeHandle) {
    clearTimeout(timeHandle);
    timeHandle = undefined;
  }
}
function updateTime() {
  gameTime += 1;
  timeHandle = setTimeout(updateTime, 1000);
  updateTimeDisplay();
}
function resetTime() {
  stopTime();
  gameTime = 0;
  updateTimeDisplay();
}

// Game object event listeners

let mouseOverObject = null;
const mouseOverListener = event => {
  const obj = getObjectFromElement(event.target);
  obj.mouseOver = true;
  mouseOverObject = obj;
};
const mouseOutListener = event => {
  const obj = getObjectFromElement(event.target);
  obj.mouseOver = false;
  mouseOverObject = null;
};

let canClick = true;
function lockClick() {
  canClick = false;
  setTimeout(() => canClick = true, 300);
}

// Reserve reset
const reserveMouseDownListener = event => {
  if (!canClick) return;
  reservePile.reset();
  addMove({ type: 'reserve', reset: true, save: true });
  updateVisuals();
  lockClick();
};

// Pickup
let lastCardClicked;
let cardClickedTimeout;

const cardMouseDownEvent = (event, card) => {
  // Check if the timeout is still counting and the card is the same.
  // Only in this case it is a double click.
  if (card == lastCardClicked && cardClickedTimeout) {
    clearTimeout(cardClickedTimeout);
    cardClickedTimeout = null;
    if (!(card.owner.type == 'reserve' && card.owner.index >= 100)) {
      pickupCards(getCardFromElement(event.target));
      autoPlaceCardOnPile(floatingCards[0]);
    }
  }
  // After checking set the new card to the last one.
  lastCardClicked = card;
  // Timeout before which the second click has to be done to say it's a double click.
  cardClickedTimeout = setTimeout(() => {
    cardClickedTimeout = null;
  }, 250);

  if (!canClick) return;

  pickupCards(getCardFromElement(event.target));
  lockClick();

  // Start game time
  if (!bGameStarted && (hasCardsInHand() || reservePile.getLength())) {
    bGameStarted = true;
    startTime();
  }
};

function addCardEventListeners() {
  const mouseOverEventListeners = [...cardObjects, ...stacksEmpty, ...pilesEmpty, reserveEmpty];
  mouseOverEventListeners.forEach(listener => {
    listener.addEventListener('mouseover', mouseOverListener);
  });
  mouseOverEventListeners.forEach(listener => {
    listener.addEventListener('mouseout', mouseOutListener);
  });

  reserveEmpty.addEventListener('mousedown', reserveMouseDownListener);

  cardObjects.forEach(card => {
    card.addEventListener('mousedown', event => cardMouseDownEvent(event, card));
  });
}

// Save game feature - binary file creation and parsing

function stringToUint8Array(string) {
  return new Uint8Array(string.split('').map(char => char.charCodeAt(0)));
}

function serialiseNumber(number) {
  if (number === undefined) return { result: '', byteCount: 0 }; 
  if (number == 0) return { result: '\u0000', byteCount: 1 };
  let num = number;
  let serialised = '';
  let byteCount = 0;
  while (num != 0) {
    const byte = num & 0xFF;
    num = num >>> 8;
    serialised += String.fromCharCode(byte);
    byteCount++;
  }
  return { result: serialised, byteCount };
}

function fillWithNull(bytes, count) {
  let full = bytes;
  for (let i = 0; i < count - bytes.length; i++) {
    full += '\u0000';
  }
  return full;
}

function reverseFillWithNull(bytes, count) {
  return fillWithNull(bytes, count).split('').reverse().join('');
}

function to4ByteInt(number) {
  return stringToUint8Array(reverseFillWithNull(serialiseNumber(number).result, 4));
}

// Savegame file constants

const pasjansSignature = stringToUint8Array('\u0083PsjSV$!');
const gameTypeHeader = stringToUint8Array('\u0083\u0001GT');
const scoreHeader = stringToUint8Array('\u0083SCR');
const timeHeader = stringToUint8Array('\u0083TIM');
const movesHeader = stringToUint8Array('\u0083MVS');
const historyHeader = stringToUint8Array('\u0083HIS');
const fileEnding = stringToUint8Array('\u0083END');

function createFileBuffer() {
  // Game type in 4 bytes
  let fullGameType = stringToUint8Array(fillWithNull(currentGameType, 4));
  // Score in 4 bytes
  const scoreSerialised = to4ByteInt(score);
  // Time in 4 bytes
  const timeSerialised = to4ByteInt(gameTime);
  // Moves in 4 bytes
  const movesSerialised = to4ByteInt(moves);
  // 0x2F (\u002F) -> History step split character
  const separatedHistory = stringToUint8Array(stateHistory.join('\u002F'));
  const historyByteCount = to4ByteInt(separatedHistory.length);

  const fileBuffer = [
    pasjansSignature,

    gameTypeHeader,
    fullGameType,

    scoreHeader,
    scoreSerialised,

    timeHeader,
    timeSerialised,

    movesHeader,
    movesSerialised,

    historyHeader,
    historyByteCount,
    separatedHistory,

    fileEnding,
  ];

  return fileBuffer;
}

function saveGame() {
  pauseGame();
  
  const buffer = createFileBuffer();
  const blob = new Blob(buffer, { type: 'application/octet-stream' });
  const fileName = `Pasjans-SaveGame-${new Date().toString().substring(4, 24).replaceAll(' ', '-')}.sav`;

  const a = document.createElement('a');
  document.querySelector('body').appendChild(a);
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  a.parentNode.removeChild(a);
}

function compareUint8Arrays(array1, array2) {
  if (array1.length != array2.length) return false;
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] != array2[i]) return false;
  }
  return true;
}

function decode4ByteIntBE(bytes) {
  const bytesLE = bytes.reverse();
  let int32 = 0;
  for (let i = 0; i < 4; i++) {
    int32 += (bytesLE[i] << (i * 8));
  }
  return int32;
}

function cutNullChars(str) {
  let newStr = str;
  while (newStr.endsWith('\u0000')) {
    newStr = newStr.substr(0, newStr.length - 1);
  }
  return newStr;
}

function decodeString(bytes) {
  let str = '';
  bytes.forEach(byte => str += String.fromCharCode(byte));
  return str;
}

function parseFile(buffer) {
  const corruptedObject = { error: true };

  let currentBytes;
  let offset = 0;
  const readBytes = byteCount => {
    const bytes = buffer.subarray(offset, offset + byteCount);
    offset += byteCount;
    return bytes;
  };
  const check = correctBytes => compareUint8Arrays(currentBytes, correctBytes);
  const readSimpleDataBlock = header => {
    currentBytes = readBytes(4);
    return check(header) ? readBytes(4) : undefined;
  };

  // Read signature
  currentBytes = readBytes(8);
  if (!check(pasjansSignature)) return corruptedObject;
  // Read game type
  const gameTypeBytes = readSimpleDataBlock(gameTypeHeader);
  if (gameTypeBytes === undefined) return corruptedObject;
  // Read score
  const scoreBytes = readSimpleDataBlock(scoreHeader);
  if (scoreBytes === undefined) return corruptedObject;
  // Read game time
  const timeBytes = readSimpleDataBlock(timeHeader);
  if (timeBytes === undefined) return corruptedObject;
  // Read moves
  const movesBytes = readSimpleDataBlock(movesHeader);
  if (movesBytes === undefined) return corruptedObject;
  // Read history (variable byte count)
  currentBytes = readBytes(4);
  if (!check(historyHeader)) return corruptedObject;
  const historyByteCount = decode4ByteIntBE(readBytes(4));
  const historyBytes = readBytes(historyByteCount);
  // Read file ending
  currentBytes = readBytes(4);
  if (!check(fileEnding)) return corruptedObject;

  const decodedGameType = cutNullChars(decodeString(gameTypeBytes));
  const decodedScore = decode4ByteIntBE(scoreBytes);
  const decodedTime = decode4ByteIntBE(timeBytes);
  const decodedMoves = decode4ByteIntBE(movesBytes);
  const decodedHistory = decodeString(historyBytes).split('\u002F');

  return {
    gameType: decodedGameType,
    score: decodedScore,
    time: decodedTime,
    moves: decodedMoves,
    history: decodedHistory,
  };
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', event => {
      const buffer = new Uint8Array(event.target.result);
      const gameSaveObject = parseFile(buffer);
      resolve(gameSaveObject);
    });
    reader.readAsArrayBuffer(file);
  });
}

function loadGame(gameSaveObject) {
  selectedGameType = gameSaveObject.gameType;
  newGame();
  clearHistory();
  score = gameSaveObject.score;
  gameTime = gameSaveObject.time;
  moves = gameSaveObject.moves;
  updateScoreDisplay();
  updateTimeDisplay();
  updateMovesDisplay();
  stateHistory.splice(0, 0, ...gameSaveObject.history);
  loadState(stateHistory[stateHistory.length - 1]);
  bGameStarted = true;
  pauseGame();
}

function showFileData(data) {
  fileDataDisplay.style.display = 'block';
  const displays = fileDataDisplay.querySelectorAll('td > b');
  const gameType = displays[0];
  const score = displays[1];
  const time = displays[2];
  const moves = displays[3];
  gameType.innerHTML = document.querySelector(`label[for*='${data.gameType}'] > span`).innerHTML;
  score.innerHTML = data.score;
  time.innerHTML = formatTime(timeToHMS(data.time));
  moves.innerHTML = data.moves;
}

function hideFileData() {
  fileDataDisplay.style.display = 'none';
}

// New game and initialization

function newGame() {
  bGameStarted = false;
  bGameOver = false;
  clearCards();
  clearCollections();
  clearEmpties();
  updateGameRules();
  initCards();
  createCardElements();
  setupStacks();
  setupPiles();
  const remainingCards = dealCards();
  // Put the rest of the cards in the reserve pile
  reservePile = new ReservePile(remainingCards);
  setupEmpties();
  clearHistory();
  resetTime();
  resetScore();
  addCardEventListeners();
  // Save the first state of the game
  addMove({ save: true, first: true });
  resizeCards();
  updateVisuals({ empty: true });
}

function updateGameRules() {
  currentGameType = selectedGameType;
  gameRules.decks = selectedGameType.includes('d') ? 2 : 1;
  gameRules.reserveShow = parseInt(selectedGameType[selectedGameType.search(/\d/)]);
  gameRules.stackNum = selectedGameType.includes('d') ? 9 : 7;
  console.log('Gamerules changed to', gameRules);
}

function restartGame() {
  bGameStarted = false;
  bGameOver = false;
  loadState(stateHistory[0]);
  clearHistory();
  resetTime();
  resetScore();
  // Save the first state of the game
  addMove({ save: true, first: true });
}

function pauseGame() {
  openModal(modalPause);
  if (bGameStarted && !bGameOver) {
    clearInterval(timeHandle);
  }
}

function unpauseGame() {
  if (bGameStarted && !bGameOver) {
    updateTime();
  }
}

function clearCards() {
  cardObjects.forEach(card => {
    card.destroy();
  });
  cardObjects.splice(0, cardObjects.length);
}

function clearCollections() {
  stacks.forEach(stack => stack.clear());
  stacks.splice(0, stacks.length);
  piles.forEach(pile => pile.clear());
  piles.splice(0, piles.length);
  if (reservePile) {
    reservePile.clear();
    reservePile.clearHidden();
    reservePile = undefined;
  }
}

function clearEmpties() {
  stacksEmpty.forEach(empty => empty.destroy());
  stacksEmpty.splice(0, stacksEmpty.length);
  pilesEmpty.forEach(empty => empty.destroy());
  pilesEmpty.splice(0, pilesEmpty.length);
  if (reserveEmpty) {
    reserveEmpty.destroy();
    reserveEmpty = undefined;
  }
}

// Initialization
function initCards() {
  for (let n = 0; n < gameRules.decks; n++) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 13; j++) {
        cardObjects.push(new Card({ num: n, color: i, value: j }));
      }
    }
  }
}

function createCardElements() {
  cardObjects.forEach(card => {
    card.createElement(gameContainer);
    card.setRevealed(false);
  });
}

function setupStacks() {
  for (let i = 0; i < gameRules.stackNum; i++) {
    stacks.push(new Stack(i));
  }
}

function setupPiles() {
  for (let i = 0; i < gameRules.decks * 4; i++) {
    piles.push(new Pile(i));
  }
}

function dealCards() {
  const preShuffledCards = [...cardObjects];
  const shuffledCards = [];
  for (let i = 0; i < gameRules.decks * 52; i++) {
    const index = Math.floor(Math.random() * preShuffledCards.length);
    const selectedCard = preShuffledCards.splice(index, 1)[0];
    shuffledCards.push(selectedCard);
  }

  stacks.forEach(stack => {
    for (let i = 0; i < stack.maxFirstDealCards; i++) {
      const card = shuffledCards.pop();
      if (i == stack.maxFirstDealCards - 1) { // Last card in stack
        card.setRevealed(true);
      }
      stack.putCard(card);
      card.owner = { type: 'stack', reference: stack, index: i };
    }
  });

  return shuffledCards;
}

newGame();

// Position on screen

function translateOrigin(x, y, originX, originY) {
  const x2 = x - originX;
  const y2 = y - originY;
  return { x: x2, y: y2 };
}

function translateCardOrigin(x, y) {
  return translateOrigin(x, y, cardCenterX, cardCenterY);
}

function getMaxPossibleCardWidth(widths) {
  return widths.reverse().find(width => {
    const row = (gameRules.decks * 4 + 3);
    const cardSpacing = width * (3 - gameRules.decks) * 0.1;
    const fullWidth = row * width + (row - 1) * cardSpacing;
    const widthDifference = window.innerWidth - fullWidth;
    return widthDifference >= width * 1.4;
  });
}

function getStackHPos(stack, nStacks) {
  const cardSpacing = cardWidth * (3 - gameRules.decks) * 0.1;
  const fullWidth = cardWidth * nStacks + cardSpacing * (nStacks - 1);
  const widthDifference = window.innerWidth - fullWidth;
  const cardPos = widthDifference * 0.5 + (cardWidth + cardSpacing) * stack + cardWidth * 0.5;
  return cardPos;
}

function getPileHPos(pile) {
  return getStackHPos(pile + 3, 3 + gameRules.decks * 4);

}

function getStackVPos() {
  return window.innerHeight * 0.2 + cardHeight;
}

function getReserveHPos() {
  return getStackHPos(0, 3 + gameRules.decks * 4);
}

function getReserveShownHPos() {
  return getStackHPos(1, 3 + gameRules.decks * 4);
}

function getReserveVPos() {
  return window.innerHeight * 0.15;
}

function calcCardVSpacing() {
  return cardHeight * 0.15;
}

function calcCardHSpacing() {
  const trimmedWidth = window.innerWidth * 0.8;
  return Math.min(trimmedWidth / gameRules.stackNum - cardWidth, cardWidth / 2);
}

// Add empty stack elements

function createEmptyElement(id) {
  const empty = new GameObject(id);
  empty.imageName = 'empty';
  empty.createElement(gameContainer, 'img', id, 'empty' + (id == 'r0' ? ' reserve' : ''));
  return empty;
}

function setupEmpties() {
  stacks.forEach((stack, index) => {
    stacksEmpty.push(createEmptyElement(`s${index}`));
  });
  piles.forEach((pile, index) => {
    pilesEmpty.push(createEmptyElement(`p${index}`));
  });
  reserveEmpty = createEmptyElement(`r0`); 
}

function setElementPosition(element, x2, y2) {
  const { x, y } = translateCardOrigin(x2, y2);
  element.setPosition(x, y);
}

function updatePosition() {
  stacks.forEach(stack => {
    stack.forEach((card, index) => {
      setElementPosition(card,
        getStackHPos(stack.id, gameRules.stackNum),
        getStackVPos() + index * calcCardVSpacing());
    });
  });
  stacksEmpty.forEach((empty, index) => {
    setElementPosition(empty,
      getStackHPos(index, gameRules.stackNum),
      getStackVPos());
  });

  piles.forEach((pile, index) => {
    pile.forEach(card => {
      setElementPosition(card,
        getPileHPos(index),
        getReserveVPos());
    });
  });
  pilesEmpty.forEach((empty, index) => {
    setElementPosition(empty,
      getPileHPos(index),
      getReserveVPos());
  });

  const rx = getReserveHPos();
  const ry = getReserveVPos();
  reservePile.hiddenStack.forEach(card => {
    setElementPosition(card, rx, ry);
  });
  reservePile.forEach((card, index) => {
    const cardPosition = (gameRules.reserveShow - 1 - ((card.owner.reference.getLength() - 1 - index) % gameRules.reserveShow)); // Advanced maths
    setElementPosition(card, getReserveShownHPos() + Math.min(calcCardHSpacing(), cardWidth * 0.2) * cardPosition, ry);
  });
  setElementPosition(reserveEmpty, rx, ry);
}

function resizeCards() {
  const sizes = [
    { w: 20,  h: 30 },
    { w: 50,  h: 75 },
    { w: 90,  h: 135 },
    { w: 120, h: 180 },
  ];
  const resizeTo = sizes.find(size => size.w == getMaxPossibleCardWidth(sizes.map(size => size.w)));
  if (!resizeTo) return;

  cardWidth = resizeTo.w;
  cardHeight = resizeTo.h;
  cardCenterX = cardWidth / 2;
  cardCenterY = cardHeight / 2;

  [...cardObjects, ...pilesEmpty, ...stacksEmpty, reserveEmpty].forEach(element => {
    element.setWidth(cardWidth);
    element.setHeight(cardHeight);
  });
}

// Update elements position on window resize

window.addEventListener('resize', event => {
  resizeCards();
  updatePosition();
  updatePlayerSize(window.innerWidth - 80);
});

// Z-Index

function sortZIndex() {
  stacks.forEach(stack => {
    stack.forEach((card, index) => {
      card.setZIndex(500 + index);
    });
  });

  piles.forEach(pile => {
    pile.forEach((card, index) => {
      card.setZIndex(500 + index);
    });
  });

  reservePile.hiddenStack.forEach((card, index) => {
    card.setZIndex(100 + index);
    if (index >= reservePile.hiddenLength() - gameRules.reserveShow) {
      card.setZIndex(500 + index);
    }
  });
  reservePile.forEach((card, index) => {
    card.setZIndex(200 + index);
  });
}

// Visibility

function updateVisibility(args) {
  cardObjects.forEach(card => card.setVisible(true));
  if (gameRules.reserveShow > 1) {
    reservePile.forEach((card, index) => {
      card.setVisible(index >= reservePile.getLength() - gameRules.reserveShow);
    });
  }
  if (args && args.empty) {
    stacksEmpty.forEach(empty => empty.setVisible(true));
    pilesEmpty.forEach(empty => empty.setVisible(true));
    reserveEmpty.setVisible(true);
  }
}

// General visuals update function

function updateVisuals(args) {
  sortZIndex();
  // For some reason ZIndex updates after the position even though it should happen before
  // Weird but this fixes it:
  setTimeout(() => {
    updatePosition();
    updateVisibility(args);
  }, 40);
}

// Cards pickup

let floatingCards = [];
let floatingTakenFrom = { type: '', reference: null, index: 0 };

function hasCardsInHand() {
  return floatingCards.length > 0;
}

let pickupPoint = { x: 0, y: 0 };
let relativePickupPoint = { x: 0, y: 0 };

// Called when clicking on a card
function pickupCards(card) {
  console.log('Clicked card', card);
  // Cannot pickup cards when already holding them.
  if (hasCardsInHand()) return;
  // Handle reserve before everything else
  if (card.owner.type == 'reserve' && isCardInReserveHidden(card)) {
    reservePile.reveal(gameRules.reserveShow);
    addMove({ type: 'reserve', save: true });
    updateVisuals();
    return;
  }

  if (!card.isMovable()) return;

  // Pickup point (so the card doesn't jump)
  pickupPoint = cursorPosition;
  const cardPosition = card.getPosition();
  relativePickupPoint = {
    x: pickupPoint.x - cardPosition.x,
    y: pickupPoint.y - cardPosition.y,
  };

  if (card.owner.type != '') {
    const owningStack = card.owner.reference;
    // Multiple cards
    if (card.owner.type == 'stack' && !card.isLastCardInStack()) {
      const poppedCards = owningStack.popCardMultiple(card.owner.index);
  
      floatingCards.push(...poppedCards);
      floatingCards.forEach((card, index) => card.setFloating(index + 1));
  
      console.log('Picked up multiple cards', floatingCards);
    }
    // One card
    else {
      const poppedCard = owningStack.popCard();

      floatingCards.push(poppedCard);
      poppedCard.setFloating(1);

      console.log('Picked up card', card);
    }
    floatingTakenFrom = { type: card.owner.type, reference: owningStack, index: card.owner.index };
  }
}

function pickupCardsAuto(card) {
  if (card.owner.type != '') {
    const owningStack = card.owner.reference;
    // Multiple cards
    if (card.owner.type == 'stack' && !card.isLastCardInStack()) {
      owningStack.popCardMultiple(card.owner.index);
    }
    // One card
    else {
      owningStack.popCard();
    }
  }
}

function canPlaceCard(card, target) {
  const cardValue = card.getValue();
  
  if (!isCard(target)) { // Target is empty (not a card)
    switch (getObjectCollectionType(target)) {
      case 'stack':
        return cardValue == 12; // Kings
      case 'pile':
        return cardValue == 0; // Aces
      default:
        return false;
    }
  }
  if (!target.isLastCardInStack() || !target.revealed) return false; // Can place only on top and not on unrevealed card
  
  const cardColor = card.getColor();
  const targetCardValue = target.getValue();
  const targetCardColor = target.getColor();

  const type = target.owner.type;

  if (type == 'stack')
    return (cardValue == targetCardValue - 1) && (cardColor % 2 != targetCardColor % 2);
  else if (type == 'pile')
    return (cardValue == targetCardValue + 1) && (cardColor == targetCardColor);
  
  return false;
}

function forcePutCard(target, card) {
  if (!target) return;

  // Check if the target is the reserve's hidden stack
  if (target.index >= 100) {
    target.reference.hiddenStack[target.index - 100] = card;
  }
  else {
    target.reference.stack[target.index] = card;
  }
  card.owner = { type: target.type, reference: target.reference, index: target.index };
  updateVisuals();
}

function placeCards(target, cards) {
  if (!target) return;

  const prevCard = cards[0].getPrevCardInStack();
  const from = cards[0].owner;
  let sameMove = false;

  const compareOwners = function() {
    return compareOwnerObjects(alterObject(target, { index: target.index + 1 }), cards[0].owner)
  };

  let revealed = false;
  // Reveal cards
  if (prevCard && !prevCard.revealed) {
    revealed = true;
    prevCard.setRevealedAnim(true);
    addScore(5);
  }
  if (compareOwners()) sameMove = true;

  switch (target.type) {
    case 'stack':
      target.reference.putCardMultiple(cards);
      if (cards[0].owner.type == 'reserve') {
        addScore(5);
      }
      else if (cards[0].owner.type == 'pile') {
        addScore(-10);
      }
      cards.forEach((card, i) => {
        card.owner = { type: 'stack', reference: target.reference, index: i + target.index + 1 };
      });
      break;
    case 'pile':
      if (cards.length > 1 || cards.length == 0) return;
      if (cards[0].owner.type == 'reserve') {
        addScore(5);
      }
      if (!sameMove) addScore(10);

      target.reference.putCard(cards[0]);
      cards[0].owner = { type: 'pile', reference: target.reference, index: target.index + 1 };
      break;
  }
  if (!sameMove) addMove({ type: 'place', card: cards[0], from, target, revealed, save: true });

  console.log('Placed cards on ', target.reference);

  if (!isAutoCompleting && canAutoComplete()) {
    isAutoCompleting = true;
    autoComplete();
  }

  if (checkWinCondition()) {
    gameOver();
  }
}

// Called when releasing held cards
function dropCards() {
  if (!floatingCards.length) return;

  if (mouseOverObject && canPlaceCard(floatingCards[0], mouseOverObject)) { // Drop cards in new place
    if (isCard(mouseOverObject)) { // Is card
      placeCards(mouseOverObject.owner, floatingCards);
    }
    else { // Is empty spot
      placeCards({ type: getObjectCollectionType(mouseOverObject), reference: getReferenceFromEmpty(mouseOverObject), index: -1 }, floatingCards);
    }
  }
  else {
    // Return cards
    if (floatingTakenFrom.type == 'stack') { 
      floatingTakenFrom.reference.putCardMultiple(floatingCards);
    }
    else {
      floatingTakenFrom.reference.putCard(floatingCards[0]);
    }
  }
  floatingCards.forEach(card => card.setFloating(0));
  updateVisuals();
  floatingCards = [];
}

function findTargetPile(card) {
  return piles.find(pile => canPlaceCard(card, (pile.getLength() > 0) ? pile.getLast() : pilesEmpty[pile.id]));
}

function autoPlaceCardOnPile(card) {
  const targetPile = findTargetPile(card);
  if (!targetPile) return; // Didn't find a pile

  const last = targetPile.getLast();
  placeCards(last ? last.owner : { type: 'pile', reference: targetPile, index: -1 }, [card]);

  floatingCards.forEach(card => card.setFloating(0));
  updateVisuals();
  floatingCards = [];
}

function getTopCardsForAutocomplete() {
  return stacks.filter(stack => stack.getLength() > 0)
    .map(stack => stack.getLast())
    .filter(card => findTargetPile(card));
}

let isAutoCompleting = false;
function canAutoComplete() {
  return !reservePile.getLength() && 
    !reservePile.hiddenLength() && 
    cardObjects.every(card => card.revealed) &&
    stacks.some(stack => stack.getLength());
}

function autoComplete() {
  const topCards = getTopCardsForAutocomplete();
  const card = topCards[Math.floor(Math.random() * topCards.length)];
  pickupCardsAuto(card);
  autoPlaceCardOnPile(card);
  if (!checkWinCondition()) {
    setTimeout(() => {
      autoComplete();
    }, 250);
  }
}

function checkWinCondition() {
  return piles.every(pile => pile.getLength() == 13);
}

function gameOver() {
  bGameOver = true;
  isAutoCompleting = false;
  stopTime();
  openModal(modalGameOver, () => ytPlayer.playVideo());
}

function openModal(modal, callback) {
  modal.style.display = 'flex';
  if (callback) callback();
}

function closeModal(modal, callback) {
  modal.style.display = 'none';
  if (callback) callback();
}

function selectGameType(type) {
  selectedGameType = type;
}

function selectCardBack(back) {
  cardBack = back;
  cardObjects.forEach(card => card.updateImage());
}

function undo() {
  if (stateHistory.length < 2) return;
  const state = stateHistory.pop();
  const previousState = stateHistory[stateHistory.length - 1];
  loadState(previousState);
  if (!isStateReserveReset(state, previousState)) {
    addScore(-20);
    subtractMove();
  }
}

// Button events

btNewGame.forEach(bt => bt.addEventListener('click', () => newGame()));
btRestartGame.forEach(bt => bt.addEventListener('click', () => restartGame()));
btPauseGame.forEach(bt => bt.addEventListener('click', () => pauseGame()));
btSaveGame.forEach(bt => bt.addEventListener('click', () => saveGame()));
btLoadGame.forEach(bt => bt.addEventListener('click', () => {
  openModal(modalLoad);
  pauseGame();
}));
btSettings.forEach(bt => bt.addEventListener('click', () => openModal(modalSettings)));
btUndo.forEach(bt => bt.addEventListener('click', () => undo()));

btNewGame2.addEventListener('click', () => {
  newGame();
  closeModal(modalGameOver, () => ytPlayer.stopVideo());
});
btRestartGame2.addEventListener('click', () => {
  restartGame();
  closeModal(modalGameOver, () => ytPlayer.stopVideo());
});

btCloseModalArray.forEach(bt => bt.addEventListener('click', event => closeModal(event.target.parentNode.parentNode.parentElement)));
btCloseGameOver.addEventListener('click', () => ytPlayer.stopVideo());
btClosePause.addEventListener('click', () => unpauseGame());
btCloseLoad.addEventListener('click', () => {
  hideFileData();
  inputSaveFile.value = '';
});

radGameType.forEach(radio => radio.addEventListener('click', event => selectGameType(event.target.id.substring(4))));
radCardBack.forEach(radio => radio.addEventListener('click', event => selectCardBack(event.target.id.substring(4))));

inputSaveFile.addEventListener('change', async event => {
  const fileList = event.target.files;
  loadedSaveFile = await readFile(fileList.item(0));
  showFileData(loadedSaveFile);
});
btLoadSaveFile.addEventListener('click', () => {
  closeModal(modalLoad);
  loadGame(loadedSaveFile);
  hideFileData();
  inputSaveFile.value = '';
});

// Drag
document.addEventListener('mousemove', event => {
  cursorPosition = { x: event.clientX, y: event.clientY };

  floatingCards.forEach(card => {
    card.updateMove();
  });
});

// Drop
document.addEventListener('mouseup', event => {
  dropCards();
});

document.addEventListener('DOMContentLoaded', () => {
  resizeCards();
  updatePosition();
});
