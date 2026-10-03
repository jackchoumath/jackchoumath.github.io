/* Run with modern Node.js: node pipe-dreams/interaction.test.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('./engine.js');
const STORAGE_KEY = 'pipe-dreams-game-v1';
const RULES_SEEN_KEY = 'pipe-dreams-rules-seen-v1';

// Exercise the real event handlers and persisted game, with only the DOM and
// storage replaced. No browser package or test-only app exports are required.
class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.style = {setProperty(name, value) { this[name] = String(value); }};
    this.className = '';
    this.disabled = false;
    this.hidden = false;
    this.open = false;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, enabled) => {
        const names = new Set(this.className.split(/\s+/).filter(Boolean));
        if (enabled === undefined) enabled = !names.has(name);
        if (enabled) names.add(name); else names.delete(name);
        this.className = [...names].join(' ');
      }
    };
  }
  set textContent(value) { this.text = String(value); }
  get textContent() { return this.text || ''; }
  get firstElementChild() { return this.children[0]; }
  append(...children) {
    children.forEach(child => { child.parentElement = this; this.children.push(child); });
  }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  async emit(name, event = {}) {
    if (name === 'click' && this.disabled) return;
    await Promise.all((this.listeners[name] || []).map(listener => listener({
      target: this, preventDefault() {}, ...event
    })));
  }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() {
    const wasOpen = this.open;
    this.open = false;
    if (wasOpen) void this.emit('close');
  }
}

function savedGame(permutation, history = [], stage = 1) {
  let board = E.bottomDream(permutation);
  history.forEach(move => { board = E.applyMove(board, move, permutation.length); });
  return {version: 1, stage, permutation, board, history, mode: 'k-ladder', seen: []};
}

function start(saved, engine = E, options = {}) {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const document = new Element();
  document.getElementById = id => elements.get(id) || null;
  document.createElement = tagName => new Element(tagName);
  const storage = options.storage || new Map();
  if (saved != null) storage.set(STORAGE_KEY, JSON.stringify(saved));
  const localStorage = {
    getItem(key) {
      assert([STORAGE_KEY, RULES_SEEN_KEY].includes(key));
      if (options.storageDenied) throw new Error('Storage unavailable');
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      assert([STORAGE_KEY, RULES_SEEN_KEY].includes(key));
      if (options.storageDenied) throw new Error('Storage unavailable');
      storage.set(key, String(value));
    }
  };
  // Hold completion delays until the test advances time. Hint delays remain
  // asynchronous, including the explicit timer hook used by race tests.
  const completionTimers = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
    window: {PipeDreamEngine: engine}, document, localStorage,
    setTimeout(callback, delay) {
      if (delay >= 500) {
        const timer = {callback, delay, active: true};
        completionTimers.push(timer);
        return timer;
      }
      return options.setTimeout ? options.setTimeout(callback, delay) : setImmediate(callback);
    },
    clearTimeout(timer) {
      if (completionTimers.includes(timer)) timer.active = false;
      else if (!options.setTimeout) clearImmediate(timer);
    }
  }, {filename: 'app.js'});
  return {
    get: id => elements.get(id),
    cell: index => elements.get('board').children[index],
    click: index => elements.get('board').children[index].emit('click'),
    button: id => elements.get(id).emit('click'),
    key: key => document.emit('keydown', {key}),
    state: () => JSON.parse(storage.get(STORAGE_KEY) ?? null),
    pendingAdvances: () => completionTimers.filter(timer => timer.active).length,
    async advance() {
      const pending = completionTimers.filter(timer => timer.active);
      for (const timer of pending) { timer.active = false; await timer.callback(); }
    },
    completionTimers,
    storage
  };
}

async function ladder(app, from, to) {
  await app.click(from);
  assert(app.cell(to).classList.contains('destination'), 'legal landing is highlighted');
  await app.click(to);
}

function assertBoardSize(app, n) {
  assert.equal(app.state().permutation.length, n);
  assert.equal(app.state().board.length, n * n);
  assert.equal(app.get('board').children.length, n * n, `render all ${n} × ${n} cells`);
  assert.equal(app.get('board').style.gridTemplateColumns, `repeat(${n}, minmax(0, 1fr))`);
  assert.equal(app.get('board').style.gridTemplateRows, `repeat(${n}, minmax(0, 1fr))`);
  assert.match(app.cell(n * n - 1).getAttribute('aria-label'), new RegExp(`Row ${n}, column ${n}:`));
}

function simplePermutation(n) {
  return Array.from({length: n}, (_, index) => index === 1 ? 3 : index === 2 ? 2 : index + 1);
}

async function dynamicSizeChecks() {
  assertBoardSize(start(), 5);
  assertBoardSize(start(null), 5);

  for (const [n, stage] of [[5, 1], [6, 4], [7, 7], [8, 11], [9, 16], [10, 21], [11, 26], [12, 31], [13, 36]]) {
    const permutation = simplePermutation(n);
    let app = start(savedGame(permutation, [], stage));
    assertBoardSize(app, n);
    await app.cell(0).emit('keydown', {key: 'ArrowDown'});
    assert.equal(app.cell(n).focused, true, `keyboard navigation uses size ${n}`);
    assert.equal(app.cell(n).tabIndex, 0);
    await app.cell(n).emit('keydown', {key: 'End'});
    assert.equal(app.cell(2 * n - 3).focused, true, 'End stops at the staircase boundary');
    assert.equal(app.cell(2 * n - 3).tabIndex, 0);
    await ladder(app, n, 1);
    app = start(app.state());
    assertBoardSize(app, n);
    assert(app.cell(n).classList.contains('k-origin'), `restore pending K-ladder at size ${n}`);
    await app.click(n);
    assert.equal(E.countCells(app.state().board), E.maximumCrossings(permutation));
    assert.deepEqual(E.demazurePermutation(app.state().board, n), permutation);
    assert.equal(app.pendingAdvances(), 1);
    app = start(app.state());
    assertBoardSize(app, n);
    assert.equal(app.state().history[0].type, 'k-ladder');
    await app.button('undo-button');
    assert.deepEqual(app.state().board, E.bottomDream(permutation), `Undo at size ${n}`);
    assert.equal(app.state().history.length, 0);
    assert.equal(app.pendingAdvances(), 0);
    await app.button('new-game-button');
    assertBoardSize(app, n);
    assert.equal(app.state().stage, stage, 'shuffle retains the stage and its prescribed size');
    assert.equal(E.isDominant(app.state().permutation), false);
    assert.equal(app.state().seen.at(-1), app.state().permutation.join(','), 'saved keys separate two-digit permutation values');
  }

  // Completing a stage rebuilds the board at each growth boundary. Use real,
  // legally completed histories so restoration validates the entire route.
  for (const [stage, n] of [[3, 5], [6, 6], [10, 7], [15, 8], [20, 9], [25, 10], [30, 11], [35, 12], [68, 13]]) {
    const permutation = simplePermutation(n);
    const app = start(savedGame(permutation, E.maximalPath(permutation), stage));
    assertBoardSize(app, n);
    assert.equal(app.pendingAdvances(), 1);
    await app.advance();
    assert.equal(app.state().stage, stage + 1);
    const nextSize = Math.min(n + 1, 13);
    assertBoardSize(app, nextSize);
    assert.equal(app.cell(0).focused, true, 'advancing focuses the rebuilt board');
    assert.equal(app.cell(0).tabIndex, 0);
    assert.equal(app.state().history.length, 0);
    assert.equal(app.pendingAdvances(), 0);
    const move = E.legalMoves(app.state().board, nextSize).find(candidate => candidate.type === 'ladder');
    assert(move, 'the enlarged board has a playable move');
    await ladder(app, move.from, move.to);
    assert.equal(app.state().history.length, 1, 'newly built cells have working event handlers');
    await app.button('undo-button');
    assert.deepEqual(app.state().board, E.bottomDream(app.state().permutation));
  }

  const oldPermutation = simplePermutation(7);
  const oldSave = savedGame(oldPermutation, [{from: 7, to: 1, type: 'ladder'}]);
  const app = start(oldSave);
  assertBoardSize(app, 7);
  assert.deepEqual(app.state().permutation, oldPermutation, 'an old S7 save keeps its permutation');
  assert.deepEqual(app.state().board, oldSave.board, 'an old S7 save keeps its progress');
  assert(app.cell(7).classList.contains('k-origin'));
  await app.button('new-game-button');
  assertBoardSize(app, 5);
  assert.equal(app.state().stage, 1, 'explicit shuffle adopts the current size progression');

  // Older versions capped all later stages at size eight. Preserve an active
  // puzzle until the player finishes it or explicitly requests another one.
  const cappedPermutation = simplePermutation(8);
  const cappedSave = savedGame(cappedPermutation, [{from: 8, to: 1, type: 'ladder'}], 68);
  const cappedApp = start(cappedSave);
  assertBoardSize(cappedApp, 8);
  assert.equal(cappedApp.state().stage, 68);
  assert.deepEqual(cappedApp.state().board, cappedSave.board, 'an old late-stage save keeps its progress');
  assert(cappedApp.cell(8).classList.contains('k-origin'));
  await cappedApp.click(8);
  await cappedApp.advance();
  assertBoardSize(cappedApp, 13);
  assert.equal(cappedApp.state().stage, 69);
  const reshuffledApp = start(cappedSave);
  await reshuffledApp.button('new-game-button');
  assertBoardSize(reshuffledApp, 13);
  assert.equal(reshuffledApp.state().stage, 68);
}

async function boundedHintChecks() {
  const permutation = [1, 3, 4, 2, 5, 6, 7];
  const saved = savedGame(permutation, [{from: 7, to: 1, type: 'ladder'}]);
  const ordinaryPath = E.findWinningPath(saved.board, E.maximumCrossings(permutation), 7);
  assert(ordinaryPath && ordinaryPath.length, 'fixture has a route without consuming the pending addition');
  const limited = () => Object.assign(new Error('Search budget exhausted'), {code: 'SEARCH_LIMIT'});

  for (const currentResult of ['path', 'limit', 'null']) {
    const attemptedBoards = [];
    const engine = {...E, findWinningPath(board, target, n, options) {
      attemptedBoards.push([...board]);
      assert.equal(target, E.maximumCrossings(permutation));
      assert.equal(n, 7);
      assert.deepEqual([...options.permutation], permutation);
      assert(options.maxStates > 0 && options.timeLimitMs > 0, 'hints use bounded search');
      if (attemptedBoards.length === 1 || currentResult === 'limit') throw limited();
      return currentResult === 'path' ? ordinaryPath : null;
    }};
    const app = start(saved, engine);
    await app.button('hint-button');
    assert.equal(attemptedBoards.length, 2, 'an unknown addition route still allows checking the current board');
    assert.equal(E.countCells(attemptedBoards[0]), E.countCells(saved.board) + 1);
    assert.deepEqual(attemptedBoards[1], saved.board);
    assert.deepEqual(app.state().board, saved.board, 'hints do not make moves');
    assert.equal(app.get('hint-button').disabled, false, 'search completion always re-enables hints');
    assert(!/No solution|cannot reach/.test(app.get('notice').textContent + app.get('status-message').textContent),
      'an incomplete search cannot be reported as proof of a dead end');
    if (currentResult === 'path') {
      assert(app.cell(ordinaryPath[0].from).classList.contains('hint-source'));
      assert(app.cell(ordinaryPath[0].to).classList.contains('destination'));
      assert.equal(app.get('notice').hidden, true);
    } else {
      assert.match(app.get('notice').textContent, /No hint found yet/);
    }
  }
}

async function restoredDifficultyChecks() {
  const fixtures = [
    // Contains both 132 and 13254, but avoiding 1432 always takes precedence.
    {permutation: [1, 3, 2, 5, 4, 6, 7], staleLabel: 'Expert', easy: true},
    // Contains 132, 1432, and 15342: an older saved Easy label is obsolete.
    {permutation: [1, 5, 3, 4, 2, 6, 7], staleLabel: 'Easy', easy: false}
  ];
  for (const {permutation, staleLabel, easy} of fixtures) {
    const expected = E.patternDifficulty(permutation);
    assert.equal(E.is1432Avoiding(permutation), easy);
    assert.equal(expected.label === 'Difficulty 1', easy);
    assert.equal(expected.tier === 1, easy);
    const saved = {...savedGame(permutation, [], 68), difficulty: {label: staleLabel, score: 999}};
    let app = start(saved);
    assert.equal(app.get('difficulty-label').textContent, expected.label,
      'restored difficulty is derived from the permutation, not stale saved metadata');
    assert.equal(app.state().stage, 68, 'reclassifying an old puzzle keeps its stage');
    assert.deepEqual(app.state().board, saved.board, 'reclassifying an old puzzle keeps its board');
    const move = E.legalMoves(app.state().board, permutation.length).find(candidate => candidate.type === 'ladder');
    await ladder(app, move.from, move.to);
    assert.equal(app.get('difficulty-label').textContent, expected.label, 'moving cells retains the permutation-based classification');
    await app.click(move.from);
    assert.equal(app.get('difficulty-label').textContent, expected.label, 'adding cells retains the permutation-based classification');
    const progressed = app.state();
    app = start({...progressed, difficulty: {label: staleLabel}});
    assert.deepEqual(app.state().board, progressed.board);
    assert.equal(app.get('difficulty-label').textContent, expected.label, 'reloading progress also replaces stale difficulty labels');
  }
}

async function firstVisitRulesChecks() {
  let app = start();
  assert.equal(app.get('rules-dialog').open, true, 'the rules open automatically on the first visit');
  assert.equal(app.storage.get(RULES_SEEN_KEY), '1', 'the first visit is recorded');
  assertBoardSize(app, 5);
  await app.button('close-rules');
  assert.equal(app.get('rules-dialog').open, false, 'the close icon dismisses the rules');
  const saved = app.state();
  app = start(undefined, E, {storage: app.storage});
  assert.equal(app.get('rules-dialog').open, false, 'reloading does not reopen the rules');
  assert.deepEqual(app.state(), saved, 'reloading preserves the game');
  await app.button('rules-button');
  assert.equal(app.get('rules-dialog').open, true, 'the rules icon can reopen the rules');
  await app.button('close-rules');
  assert.equal(app.get('rules-dialog').open, false);

  const oldSave = savedGame(simplePermutation(8), [{from: 8, to: 1, type: 'ladder'}], 68);
  const returning = start(oldSave);
  assert.equal(returning.get('rules-dialog').open, false,
    'an existing saved game without a rules flag is treated as a returning player');
  assert.deepEqual(returning.state().board, oldSave.board);
  assert.equal(returning.storage.get(RULES_SEEN_KEY), '1');

  const previouslySeen = start(undefined, E, {storage: new Map([[RULES_SEEN_KEY, '1']])});
  assert.equal(previouslySeen.get('rules-dialog').open, false,
    'a rules flag also prevents repetition when no game save remains');

  const unavailable = start(undefined, E, {storageDenied: true});
  assert.equal(unavailable.get('rules-dialog').open, true,
    'denied storage does not prevent the first-visit rules from opening');
  assert.equal(unavailable.get('board').children.length, 25);
  await unavailable.button('close-rules');
  const from = unavailable.get('board').children.findIndex(cell => cell.classList.contains('movable'));
  assert(from >= 0, 'a playable board is still created without storage');
  await unavailable.click(from);
  const to = unavailable.get('board').children.findIndex(cell => cell.classList.contains('destination'));
  assert(to >= 0);
  await unavailable.click(to);
  assert(unavailable.cell(from).classList.contains('k-origin'), 'play continues after dismissing the rules without storage');
}

async function resetStageChecks() {
  const permutation = [1, 4, 3, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const pending = savedGame(permutation, [{from: 14, to: 2, type: 'ladder'}], 68);
  pending.seen = ['1,3,2,4,5', permutation.join(',')];
  let hintCalls = 0;
  const engine = {...E, findWinningPath() { hintCalls += 1; return []; }};
  let app = start(pending, engine);
  assertBoardSize(app, 13);
  assert(app.cell(14).classList.contains('k-origin'));
  await app.click(13);
  assert(app.cell(13).classList.contains('selected'));
  assert(app.cell(1).classList.contains('destination'));
  const before = app.state();

  // Merely viewing or declining the confirmation must preserve all progress,
  // including the selected move and the unconsumed option to add a cell.
  await app.button('reset-stage-yes');
  assert.deepEqual(app.state(), before, 'Yes cannot reset progress without an open confirmation');
  await app.button('reset-stage-button');
  assert.equal(app.get('reset-stage-dialog').open, true);
  assert.deepEqual(app.state(), before, 'opening the confirmation does not reset progress');
  for (const key of ['u', 'h', 'Escape']) await app.key(key);
  assert.deepEqual(app.state(), before, 'game shortcuts are inactive while confirmation is open');
  assert.equal(hintCalls, 0, 'the hint shortcut cannot start a search behind the confirmation');
  assert(app.cell(13).classList.contains('selected'), 'Escape does not clear the underlying selection');
  await app.button('reset-stage-no');
  assert.equal(app.get('reset-stage-dialog').open, false);
  assert.deepEqual(app.state(), before, 'No keeps the stage, permutation, board, history, and seen puzzles');
  assert(app.cell(14).classList.contains('k-origin'), 'No keeps the option to add a cell');
  assert(app.cell(13).classList.contains('selected'), 'No keeps the selected cell');
  assert(app.cell(1).classList.contains('destination'), 'No keeps the selected destination');

  await app.button('reset-stage-button');
  await app.button('reset-stage-yes');
  assert.equal(app.get('reset-stage-dialog').open, false);
  assert.equal(app.state().stage, 1);
  assert.equal(app.get('stage-number').textContent, '01');
  assertBoardSize(app, 5);
  assert.equal(app.get('difficulty-label').textContent, 'Difficulty 1');
  assert.equal(app.state().history.length, 0);
  assert.deepEqual(app.state().board, E.bottomDream(app.state().permutation));
  assert.deepEqual(app.state().seen, [app.state().permutation.join(',')], 'a reset starts a fresh puzzle history');
  assert(!app.get('board').children.some(cell => /k-origin|selected|destination|hint-source/.test(cell.className)),
    'a reset clears the pending addition, selection, and hints');
  assert.equal(app.cell(0).focused, true, 'a reset focuses the new board');
  assert.equal(app.get('undo-button').disabled, true);
  assert.equal(app.get('restart-button').disabled, true);
  assert.equal(app.storage.get(RULES_SEEN_KEY), '1', 'a reset retains the first-visit rules preference');
  const reset = app.state();
  app = start(undefined, E, {storage: app.storage});
  assert.deepEqual(app.state(), reset, 'reset progress survives reload');
  assert.equal(app.get('rules-dialog').open, false, 'a stage reset does not turn a returning player into a first-time visitor');

  const restarted = start(pending);
  await restarted.button('restart-button');
  assert.equal(restarted.state().stage, 68, 'the existing restart button retains the current stage');
  assert.deepEqual(restarted.state().permutation, permutation);
  assert.deepEqual(restarted.state().board, E.bottomDream(permutation));
  assert.equal(restarted.state().history.length, 0);
  assert.deepEqual(restarted.state().seen, pending.seen);

  // A reset can generate the same bottom board. An already queued hint still
  // belongs to the previous game and must not select cells in the new one.
  const samePermutation = simplePermutation(5);
  const timers = [];
  let staleSearchCalls = 0;
  const samePuzzleEngine = {...E,
    progressiveStage() {
      return {permutation: samePermutation, board: E.bottomDream(samePermutation),
        difficulty: E.patternDifficulty(samePermutation)};
    },
    findWinningPath(...args) { staleSearchCalls += 1; return E.findWinningPath(...args); }
  };
  const racing = start(savedGame(samePermutation, [], 4), samePuzzleEngine, {
    setTimeout: callback => timers.push(callback)
  });
  const queuedHint = racing.button('hint-button');
  assert.equal(timers.length, 1);
  await racing.button('reset-stage-button');
  await racing.button('reset-stage-yes');
  const resetAnnouncement = racing.get('status-message').textContent;
  timers.shift()();
  await queuedHint;
  assert.equal(staleSearchCalls, 0, 'a pending hint is discarded even when the replacement board is identical');
  assert.equal(racing.state().stage, 1);
  assert.equal(racing.get('status-message').textContent, resetAnnouncement, 'a stale hint cannot replace the reset announcement');
  assert.equal(racing.get('hint-button').disabled, false);
  assert(!racing.get('board').children.some(cell => /selected|destination|hint-source/.test(cell.className)));
}

async function automaticAdvanceChecks() {
  const permutation = simplePermutation(5);
  const won = savedGame(permutation, E.maximalPath(permutation), 3);
  let app = start(savedGame(permutation, [], 3));
  assert.equal(app.get('next-button'), undefined, 'completion no longer requires a button');
  assert.equal(app.pendingAdvances(), 0, 'an unfinished board cannot advance');
  await app.advance();
  assert.equal(app.state().stage, 3);
  await ladder(app, 5, 1);
  assert.equal(app.pendingAdvances(), 0, 'moving a cell below the target does not advance');
  await app.click(5);
  assert.equal(app.state().stage, 3, 'the completed board remains visible during the short delay');
  assert.equal(app.pendingAdvances(), 1);
  await app.click(1);
  assert.equal(app.pendingAdvances(), 1, 'additional clicks cannot queue duplicate advancement');
  await app.advance();
  assert.equal(app.state().stage, 4, 'reaching the maximum advances without another click');
  assertBoardSize(app, 6);
  assert.deepEqual(app.state().board, E.bottomDream(app.state().permutation));
  assert.equal(app.cell(0).focused, true);
  assert.equal(app.pendingAdvances(), 0);
  await app.advance();
  assert.equal(app.state().stage, 4, 'one completion advances exactly one stage');

  app = start(won);
  assert.equal(app.pendingAdvances(), 1, 'a completed saved board resumes automatic advancement');
  await app.advance();
  assert.equal(app.state().stage, 4);

  for (const button of ['undo-button', 'restart-button', 'new-game-button']) {
    app = start(won);
    const stale = app.completionTimers.at(-1).callback;
    await app.button(button);
    assert.equal(app.pendingAdvances(), 0, `${button} cancels completion`);
    const changed = app.state();
    await stale();
    await app.advance();
    assert.deepEqual(app.state(), changed, `${button} cannot be undone by an old completion callback`);
  }

  // Undo and completion can reuse the very same game object. A callback for
  // the earlier completion must not consume the new completion's delay.
  app = start(won);
  const staleCompletion = app.completionTimers.at(-1).callback;
  await app.button('undo-button');
  await ladder(app, 5, 1);
  await app.click(5);
  assert.equal(app.pendingAdvances(), 1);
  await staleCompletion();
  assert.equal(app.state().stage, 3, 'an older completion cannot advance a newly solved board');
  assert.equal(app.pendingAdvances(), 1);
  await app.advance();
  assert.equal(app.state().stage, 4);

  for (const [open, close, dialog] of [
    ['rules-button', 'close-rules', 'rules-dialog'],
    ['reset-stage-button', 'reset-stage-no', 'reset-stage-dialog']
  ]) {
    app = start(won);
    await app.button(open);
    assert.equal(app.get(dialog).open, true);
    await app.advance();
    assert.equal(app.state().stage, 3, 'an open dialog pauses automatic advancement');
    await app.button(close);
    assert.equal(app.pendingAdvances(), 1, 'closing a dialog resumes completion');
    await app.advance();
    assert.equal(app.state().stage, 4);
  }

  app = start(won);
  const beforeReset = app.completionTimers.at(-1).callback;
  await app.button('reset-stage-button');
  await app.button('reset-stage-yes');
  const reset = app.state();
  assert.equal(reset.stage, 1);
  assert.equal(app.pendingAdvances(), 0, 'confirmed reset cancels completion');
  await beforeReset();
  await app.advance();
  assert.deepEqual(app.state(), reset, 'old completion cannot advance the reset game');
}

async function main() {
  const simple = [1, 3, 2, 4, 5, 6, 7];
  let app = start(savedGame(simple));
  assert.equal(app.get('mode-ladder'), undefined);
  assert.equal(app.get('mode-k'), undefined);
  assert.equal(app.get('permutation'), undefined, 'the permutation is omitted from the header');
  await ladder(app, 7, 1);
  assert.equal(E.countCells(app.state().board), 1, 'first action always moves, including old K-mode saves');
  assert.equal(app.state().history[0].type, 'ladder');
  assert(app.cell(7).classList.contains('k-origin'));
  assert.match(app.cell(7).getAttribute('aria-label'), /original position; add a cell here/);
  assert(!/No forward moves remain/.test(app.get('status-message').textContent));
  assert.equal(app.pendingAdvances(), 0);

  // No ordinary moves remain, but the pending conversion still solves it.
  assert.equal(E.legalMoves(app.state().board).length, 0);
  await app.button('hint-button');
  assert.match(app.get('status-message').textContent, /add a cell/i);
  assert(app.cell(7).classList.contains('hint-source'));
  await app.click(7);
  assert.equal(E.countCells(app.state().board), 2);
  assert.equal(app.state().history.length, 1, 'conversion counts as the same move');
  assert.equal(app.state().history[0].type, 'k-ladder');
  assert.deepEqual(E.demazurePermutation(app.state().board), simple);
  assert.equal(app.pendingAdvances(), 1);
  assert(!app.cell(7).classList.contains('k-origin'));
  await app.button('undo-button');
  assert.deepEqual(app.state().board, E.bottomDream(simple), 'Undo reverses the entire K-ladder');
  assert.equal(app.state().history.length, 0);
  assert.equal(app.pendingAdvances(), 0);

  await ladder(app, 7, 1);
  app = start(app.state());
  assert(app.cell(7).classList.contains('k-origin'), 'pending origin survives reload');
  const pendingBoard = app.state().board;
  await app.click(0);
  assert.deepEqual(app.state().board, pendingBoard, 'arbitrary empty-cell clicks cannot add cells');
  assert(app.cell(7).classList.contains('k-origin'), 'invalid clicks preserve the pending conversion');
  await app.click(1);
  assert(app.cell(7).classList.contains('k-origin'), 'selecting a blocked cell keeps the pending conversion visible');
  await app.click(0);
  assert.deepEqual(app.state().board, pendingBoard, 'an invalid click while selected cannot change the board');
  assert(app.cell(7).classList.contains('k-origin'), 'an invalid selected-cell move keeps the pending conversion');
  await app.click(1);
  assert(app.cell(7).classList.contains('k-origin'), 'clicking again to deselect keeps the pending conversion');
  await app.click(1);
  await app.key('Escape');
  assert(app.cell(7).classList.contains('k-origin'), 'Escape preserves the last conversion');
  await app.click(1);
  await app.click(7);
  assert.equal(app.state().history[0].type, 'k-ladder', 'pending conversion works while a blocked cell is selected');
  assert.equal(E.countCells(app.state().board), 2);
  await app.button('restart-button');
  assert.deepEqual(app.state().board, E.bottomDream(simple));
  assert(!app.cell(7).classList.contains('k-origin'));

  const multiple = [1, 4, 3, 2, 5, 6, 7];
  app = start(savedGame(multiple));
  await ladder(app, 8, 2);
  const pendingMultiple = app.state();
  await app.click(7);
  assert(app.cell(1).classList.contains('destination'), 'another filled cell has a legal ladder destination');
  assert(app.cell(8).classList.contains('k-origin'), 'selecting a movable cell keeps the pending conversion visible');
  await app.click(0);
  assert.deepEqual(app.state(), pendingMultiple, 'an invalid destination does not change the saved move or board');
  assert(app.cell(8).classList.contains('k-origin'), 'an invalid destination keeps the pending conversion visible');
  await app.click(8);
  assert.equal(app.state().history.length, 1);
  assert.equal(app.state().history[0].type, 'k-ladder', 'pending conversion works while another movable cell is selected');
  assert.deepEqual(E.demazurePermutation(app.state().board), multiple);
  app = start(pendingMultiple);
  await ladder(app, 7, 1);
  assert(!app.cell(8).classList.contains('k-origin'), 'another move expires the previous origin');
  assert(app.cell(7).classList.contains('k-origin'));
  const afterTwoMoves = app.state().board;
  await app.click(8);
  assert.deepEqual(app.state().board, afterTwoMoves, 'expired origins cannot be filled');
  await app.button('undo-button');
  assert(app.cell(8).classList.contains('k-origin'), 'Undo restores the preceding move conversion');
  await app.click(8);
  assert.equal(app.state().history.length, 1);
  assert.equal(app.state().history[0].type, 'k-ladder');

  // The same square can be a previous origin and the next legal landing.
  const collision = [1, 2, 3, 5, 4, 6, 7];
  app = start(savedGame(collision, [{from: 21, to: 15, type: 'k-ladder'}, {from: 15, to: 9, type: 'ladder'}]));
  const pendingCollision = app.state();
  assert(app.cell(15).classList.contains('k-origin'));
  await app.click(21);
  assert(app.cell(15).classList.contains('destination'));
  assert(app.cell(15).classList.contains('k-origin'), 'a next landing preserves the pending origin');
  assert.match(app.cell(15).getAttribute('aria-label'), /move here; press Escape to add a cell at the original position/, 'the selected move takes precedence at an overlapping landing');
  await app.key('Escape');
  assert(app.cell(15).classList.contains('k-origin'), 'deselecting an overlapping move leaves conversion available');
  assert(!app.cell(15).classList.contains('destination'));
  await app.click(15);
  assert.equal(app.state().history.length, 2);
  assert.equal(app.state().history[1].type, 'k-ladder', 'deselecting allows conversion at an overlapping landing');
  app = start(pendingCollision);
  await app.click(21);
  await app.click(15);
  assert.equal(app.state().history.length, 3, 'landing click makes the selected move');
  assert.equal(app.state().board[21], 0);
  assert.equal(app.state().board[15], 1);
  assert.equal(app.state().history[1].type, 'ladder', 'previous move was not converted');
  assert(app.cell(21).classList.contains('k-origin'));
  await app.click(21);
  assert.deepEqual(E.demazurePermutation(app.state().board), collision);
  assert.equal(app.state().history.length, 3);
  assert.equal(app.state().history[2].type, 'k-ladder');

  await dynamicSizeChecks();
  await boundedHintChecks();
  await restoredDifficultyChecks();
  await firstVisitRulesChecks();
  await resetStageChecks();
  await automaticAdvanceChecks();
  console.log('Interaction checks passed: legal moves, persistent cell addition, overlapping landings, bounded hints, undo/reload, dynamic sizes 5–13, growth boundaries, legacy saves, pattern-based difficulty restoration, first-visit rules, confirmed stage resets, and automatic advancement with cancellation and dialog pauses.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
