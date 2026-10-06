/* Run with modern Node.js: node pipe-dreams/interaction.test.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('./engine.js');
const STORAGE_KEY = 'pipe-dreams-game-v1';
const RULES_SEEN_KEY = 'pipe-dreams-rules-seen-v1';
const SETTINGS_KEY = 'pipe-dreams-settings-v1';
const META_KEY = 'pipe-dreams-meta-v1';
const THEME_KEY = 'jack-chou-theme';
const STORAGE_KEYS = [STORAGE_KEY, RULES_SEEN_KEY, SETTINGS_KEY, META_KEY, THEME_KEY];

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
  const elements = new Map([...html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)].map(match => {
    const element = new Element(match[1]);
    for (const attribute of match[2].matchAll(/([\w-]+)="([^"]*)"/g)) element.setAttribute(attribute[1], attribute[2]);
    element.hidden = /(?:^|\s)hidden(?:\s|=|$)/.test(match[2]);
    return [match[3], element];
  }));
  const document = new Element();
  document.getElementById = id => elements.get(id) || null;
  document.createElement = tagName => new Element(tagName);
  const storage = options.storage || new Map();
  const browserEvents = [];
  if (saved != null) storage.set(STORAGE_KEY, JSON.stringify(saved));
  const localStorage = {
    getItem(key) {
      assert(STORAGE_KEYS.includes(key));
      if (options.storageDenied) throw new Error('Storage unavailable');
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      assert(STORAGE_KEYS.includes(key));
      if (options.storageDenied) throw new Error('Storage unavailable');
      storage.set(key, String(value));
      browserEvents.push({type: 'save', key});
    }
  };
  // Hold completion delays until the test advances time. Hint delays remain
  // asynchronous, including the explicit timer hook used by race tests.
  const completionTimers = [];
  const leaveFallbackTimers = [];
  const navigations = [];
  const closeCalls = [];
  const browserWindow = {
    PipeDreamEngine: engine, closed: false,
    location: {assign: destination => navigations.push(destination)},
    close() {
      closeCalls.push(JSON.parse(storage.get(STORAGE_KEY) ?? null));
      browserEvents.push({type: 'close'});
      if (!options.closeBlocked) this.closed = true;
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
    window: browserWindow, document, localStorage,
    setTimeout(callback, delay) {
      if (delay >= 500) {
        const timer = {callback, delay, active: true};
        completionTimers.push(timer);
        return timer;
      }
      if (delay >= 100) {
        const timer = {callback, delay, active: true};
        leaveFallbackTimers.push(timer);
        return timer;
      }
      return options.setTimeout ? options.setTimeout(callback, delay) : setImmediate(callback);
    },
    clearTimeout(timer) {
      if (completionTimers.includes(timer)) timer.active = false;
      else if (leaveFallbackTimers.includes(timer)) timer.active = false;
      else if (!options.setTimeout) clearImmediate(timer);
    }
  }, {filename: 'app.js'});
  const cellAt = index => elements.get('board').children.find(cell => Number(cell.dataset.index) === index);
  return {
    get: id => elements.get(id),
    cell: cellAt,
    click: index => cellAt(index).emit('click'),
    button: id => elements.get(id).emit('click'),
    key: key => document.emit('keydown', {key}),
    keyWith: (key, modifiers) => document.emit('keydown', {key, ...modifiers}),
    keyUp: (key, onPrevent) => document.emit('keyup', {key, preventDefault: onPrevent}),
    state: () => JSON.parse(storage.get(STORAGE_KEY) ?? null),
    pendingAdvances: () => completionTimers.filter(timer => timer.active).length,
    async advance() {
      const pending = completionTimers.filter(timer => timer.active);
      for (const timer of pending) { timer.active = false; await timer.callback(); }
    },
    completionTimers,
    leaveFallbackTimers,
    async leaveFallback() {
      for (const timer of leaveFallbackTimers.filter(timer => timer.active)) {
        timer.active = false;
        await timer.callback();
      }
    },
    closed: () => browserWindow.closed,
    closeCalls,
    browserEvents,
    navigations,
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
  assert.equal(app.state().board.length, n * n, 'saved boards retain the engine index stride');
  const side = n - 1;
  assert.equal(app.get('board').children.length, side * side, `render all ${side} × ${side} cells for S${n}`);
  assert.equal(app.get('board').style.gridTemplateColumns, `repeat(${side}, minmax(0, 1fr))`);
  assert.equal(app.get('board').style.gridTemplateRows, `repeat(${side}, minmax(0, 1fr))`);
  for (let row = 0; row < side; row += 1) {
    for (let col = 0; col < side; col += 1) {
      const cell = app.get('board').children[row * side + col];
      assert.equal(Number(cell.dataset.index), row * n + col, 'displayed positions map to unchanged engine indices');
      assert.match(cell.getAttribute('aria-label'), new RegExp(`Row ${row + 1}, column ${col + 1}:`));
    }
    assert.equal(app.cell(row * n + n - 1), undefined, 'the unused final column is not rendered');
    assert.equal(app.cell((n - 1) * n + row), undefined, 'the unused final row is not rendered');
  }
  assert.equal(app.cell(n * n - 1), undefined);
}

function simplePermutation(n) {
  return Array.from({length: n}, (_, index) => index === 1 ? 3 : index === 2 ? 2 : index + 1);
}

async function dynamicSizeChecks() {
  assertBoardSize(start(), 5);
  assertBoardSize(start(null), 5);
  const oversized = start(savedGame(simplePermutation(18), [], 68));
  assertBoardSize(oversized, 5);
  assert.equal(oversized.state().stage, 1, 'an unsupported size-18 save is replaced with a fresh game');

  for (const [n, stage] of [[5, 1], [6, 6], [7, 11], [8, 16], [9, 26], [10, 36], [11, 46], [12, 56], [13, 66], [14, 76], [15, 86], [16, 96], [17, 106]]) {
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
  }

  // Completing a stage rebuilds the board at every growth boundary. It also
  // raises difficulty halfway through each ten-stage size group. Use real,
  // legally completed histories so restoration validates the entire route.
  for (const [stage, n, nextSize, nextTier] of [
    [5, 5, 6, 2], [10, 6, 7, 3], [15, 7, 8, 4],
    [20, 8, 8, 5], [25, 8, 9, 6], [30, 9, 9, 7], [35, 9, 10, 8],
    [40, 10, 10, 9], [45, 10, 11, 10], [50, 11, 11, 11], [55, 11, 12, 12],
    [65, 12, 13, 12], [75, 13, 14, 12], [85, 14, 15, 12], [95, 15, 16, 12],
    [105, 16, 17, 12], [110, 17, 17, 12]
  ]) {
    const permutation = simplePermutation(n);
    const app = start(savedGame(permutation, E.maximalPath(permutation), stage));
    assertBoardSize(app, n);
    assert.equal(app.pendingAdvances(), 1);
    await app.advance();
    assert.equal(app.state().stage, stage + 1);
    assertBoardSize(app, nextSize);
    assert.equal(app.get('difficulty-label').textContent, `Difficulty ${nextTier}`);
    assert.equal(E.patternDifficulty(app.state().permutation).tier, nextTier,
      'the new stage has its scheduled pattern difficulty even when the board size stays the same');
    assert.equal(E.isDominant(app.state().permutation), false);
    assert.equal(app.state().seen.at(-1), app.state().permutation.join(','), 'saved keys separate two-digit permutation values');
    assert.equal(app.cell(0).focused, true, 'advancing focuses the rebuilt board');
    assert.equal(app.cell(0).tabIndex, 0);
    assert.equal(app.state().history.length, 0);
    assert.equal(app.pendingAdvances(), 0);
    const move = E.legalMoves(app.state().board, nextSize).find(candidate => candidate.type === 'ladder');
    assert(move, 'the next board has a playable move');
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
  await app.click(7);
  await app.advance();
  assertBoardSize(app, 5);
  assert.equal(app.state().stage, 2, 'finishing an old saved puzzle adopts the current size progression');

  // Preserve active puzzles from older eight/thirteen-cell caps or faster
  // growth to S17. Completion adopts the current size even if it decreases.
  for (const oldSize of [8, 13, 17]) {
    const cappedPermutation = simplePermutation(oldSize);
    const cappedSave = savedGame(cappedPermutation, [{from: oldSize, to: 1, type: 'ladder'}], 68);
    const cappedApp = start(cappedSave);
    assertBoardSize(cappedApp, oldSize);
    assert.equal(cappedApp.state().stage, 68);
    assert.deepEqual(cappedApp.state().board, cappedSave.board, 'an old late-stage save keeps its progress');
    assert(cappedApp.cell(oldSize).classList.contains('k-origin'));
    await cappedApp.click(oldSize);
    await cappedApp.advance();
    assertBoardSize(cappedApp, 13);
    assert.equal(cappedApp.state().stage, 69);
  }
}

async function outerCellChecks() {
  // The bottommost and rightmost playable squares are still visible. Walk a
  // cell between them to catch accidental use of the shorter display stride.
  for (let n = 5; n <= 17; n += 1) {
    const permutation = Array.from({length: n}, (_, index) => index + 1);
    [permutation[n - 2], permutation[n - 1]] = [permutation[n - 1], permutation[n - 2]];
    let app = start(savedGame(permutation));
    assertBoardSize(app, n);
    const bottom = (n - 2) * n;
    const right = n - 2;
    await app.cell(bottom).emit('keydown', {key: 'ArrowDown'});
    assert.equal(app.cell(bottom).tabIndex, 0, 'Down stays on the bottommost playable cell');
    await app.cell(bottom).emit('keydown', {key: 'End'});
    assert.equal(app.cell(bottom).tabIndex, 0, 'the last playable row ends at its first column');
    let from = bottom;
    while (from !== right) {
      const to = from - n + 1;
      await ladder(app, from, to);
      assert.equal(app.state().board[from], 0);
      assert.equal(app.state().board[to], 1);
      assert(app.cell(from).classList.contains('k-origin'));
      from = to;
    }
    assert.equal(app.state().history.length, n - 2);
    assert.equal(E.countCells(app.state().board), 1, 'moving across the board preserves the count');
    assert.deepEqual(E.demazurePermutation(app.state().board, n), permutation);
    const progressed = app.state();
    app = start(progressed);
    assertBoardSize(app, n);
    assert.deepEqual(app.state(), progressed, 'reloading preserves a move into the last visible column');
    await app.cell(0).emit('keydown', {key: 'End'});
    assert.equal(app.cell(right).tabIndex, 0, 'End reaches the rightmost playable cell');
    await app.cell(right).emit('keydown', {key: 'ArrowRight'});
    assert.equal(app.cell(right).tabIndex, 0, 'Right never focuses the removed final column');
    await app.cell(right).emit('keydown', {key: 'ArrowDown'});
    assert.equal(app.cell(right).tabIndex, 0, 'Down stays within the staircase at the right edge');
    const origin = n + n - 3;
    await app.click(origin);
    assert.equal(app.state().history.at(-1).type, 'k-ladder');
    assert.equal(E.countCells(app.state().board), 2);
    await app.button('undo-button');
    assert.equal(app.state().board[right], 0, 'Undo clears a destination in the last visible column');
    assert.equal(app.state().board[origin], 1, 'Undo restores the preceding source using engine indices');
  }
}

async function boundedHintChecks() {
  const permutation = [1, 3, 4, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const saved = savedGame(permutation, [{from: 17, to: 1, type: 'ladder'}], 68);
  const ordinaryPath = E.findWinningPath(saved.board, E.maximumCrossings(permutation), 17);
  assert(ordinaryPath && ordinaryPath.length, 'fixture has a route without consuming the pending addition');
  const limited = () => Object.assign(new Error('Search budget exhausted'), {code: 'SEARCH_LIMIT'});

  for (const currentResult of ['path', 'limit', 'null']) {
    const attemptedBoards = [];
    const engine = {...E, findWinningPath(board, target, n, options) {
      attemptedBoards.push([...board]);
      assert.equal(target, E.maximumCrossings(permutation));
      assert.equal(n, 17);
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
  assert.equal(unavailable.get('board').children.length, 16);
  await unavailable.button('close-rules');
  const sourceCell = unavailable.get('board').children.find(cell => cell.classList.contains('movable'));
  assert(sourceCell, 'a playable board is still created without storage');
  const from = Number(sourceCell.dataset.index);
  await unavailable.click(from);
  const destinationCell = unavailable.get('board').children.find(cell => cell.classList.contains('destination'));
  assert(destinationCell);
  const to = Number(destinationCell.dataset.index);
  await unavailable.click(to);
  assert(unavailable.cell(from).classList.contains('k-origin'), 'play continues after dismissing the rules without storage');
}

async function resetStageChecks() {
  const permutation = [1, 4, 3, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const pending = savedGame(permutation, [{from: 18, to: 2, type: 'ladder'}], 68);
  pending.seen = ['1,3,2,4,5', permutation.join(',')];
  let hintCalls = 0;
  const engine = {...E, findWinningPath() { hintCalls += 1; return []; }};
  let app = start(pending, engine);
  assertBoardSize(app, 17);
  assert(app.cell(18).classList.contains('k-origin'));
  await app.click(17);
  assert(app.cell(17).classList.contains('selected'));
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
  assert(app.cell(17).classList.contains('selected'), 'Escape does not clear the underlying selection');
  await app.button('reset-stage-no');
  assert.equal(app.get('reset-stage-dialog').open, false);
  assert.deepEqual(app.state(), before, 'No keeps the stage, permutation, board, history, and seen puzzles');
  assert(app.cell(18).classList.contains('k-origin'), 'No keeps the option to add a cell');
  assert(app.cell(17).classList.contains('selected'), 'No keeps the selected cell');
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
  assert.equal(app.get('next-button'), undefined, 'completion advances without a required button');
  assert.equal(app.get('complete-banner').hidden, true, 'the completion banner waits for a finished board');
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
  assert.deepEqual(app.state().permutation, [1, 4, 5, 2, 3], 'stage three advances to the fixed permutation');
  assertBoardSize(app, 5);
  assert.equal(app.get('difficulty-label').textContent, 'Difficulty 1', 'stage four remains Difficulty 1');
  assert.deepEqual(app.state().board, E.bottomDream(app.state().permutation));
  assert.equal(app.cell(0).focused, true);
  assert.equal(app.pendingAdvances(), 0);
  await app.advance();
  assert.equal(app.state().stage, 4, 'one completion advances exactly one stage');

  app = start(won);
  assert.equal(app.pendingAdvances(), 1, 'a completed saved board resumes automatic advancement');
  await app.advance();
  assert.equal(app.state().stage, 4);

  for (const button of ['undo-button', 'restart-button']) {
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
    ['reset-stage-button', 'reset-stage-no', 'reset-stage-dialog'],
    ['leave-game-button', 'leave-game-no', 'leave-game-dialog']
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

async function fixedTeachingStageChecks() {
  const previous = simplePermutation(5);
  const completed = savedGame(previous, E.maximalPath(previous), 3);
  completed.seen = [previous.join(',')];
  let app = start(completed);
  await app.advance();
  assert.equal(app.state().stage, 4);
  assert.deepEqual(app.state().permutation, [1, 4, 5, 2, 3], 'stage three advances to fixed stage four');
  assertBoardSize(app, 5);
  assert.equal(app.get('difficulty-label').textContent, 'Difficulty 1');
  assert.equal(app.get('current-count').textContent, '4');
  assert.equal(app.get('target-count').textContent, '6');
  for (let stage = 4; stage <= 7; stage += 1) {
    assert.equal(app.state().stage, stage);
    assertBoardSize(app, stage <= 5 ? 5 : 6);
    const tier = stage <= 5 ? 1 : 2;
    const label = `Difficulty ${tier}`;
    assert.equal(app.get('difficulty-label').textContent, label);
    assert.equal(E.patternDifficulty(app.state().permutation).tier, tier, 'displayed difficulty matches the actual patterns');
    assert.equal(app.state().history.length, 0);
    assert.equal(app.pendingAdvances(), 0);
    if (stage === 5) {
      assert.equal(E.is1432Avoiding(app.state().permutation), true, 'stage five draws an actual Difficulty 1 puzzle');
      assert.equal(E.isDominant(app.state().permutation), false);
      assert.notDeepEqual(app.state().permutation, [1, 4, 5, 2, 3], 'stage five does not repeat the completed fixed stage four');
    }
    if (stage === 6) assert.notDeepEqual(app.state().permutation, [1, 2, 5, 4, 3, 6], 'stage six leaves the stage-seven puzzle reserved');
    if (stage === 7) {
      assert.deepEqual(app.state().permutation, [1, 2, 5, 4, 3, 6], 'stage six advances to fixed stage seven');
      assert.equal(app.get('current-count').textContent, '3');
      assert.equal(app.get('target-count').textContent, '7');
    }
    const fresh = app.state();
    app = start({...fresh, difficulty: {label: 'Stale difficulty'}});
    assert.deepEqual(app.state().permutation, fresh.permutation, `stage ${stage} retains its puzzle on reload`);
    assert.deepEqual(app.state().board, fresh.board);
    assert.equal(app.get('difficulty-label').textContent, label, 'reloading derives the current pattern classification');
    for (const move of E.maximalPath(fresh.permutation)) {
      await ladder(app, move.from, move.to);
      assert.equal(app.get('difficulty-label').textContent, label, 'moving cells keeps the actual classification');
      if (move.type === 'k-ladder') await app.click(move.from);
      assert.equal(app.get('difficulty-label').textContent, label, 'adding cells keeps the actual classification');
    }
    assert.equal(E.countCells(app.state().board), E.maximumCrossings(fresh.permutation));
    assert.equal(app.pendingAdvances(), 1, `stage ${stage} completes with normal cell interactions`);
    await app.advance();
  }
  assert.equal(app.state().stage, 8);
  assertBoardSize(app, 6);
  assert.equal(app.get('difficulty-label').textContent, 'Difficulty 2');
  assert.notDeepEqual(app.state().permutation, [1, 2, 5, 4, 3, 6], 'stage eight does not repeat completed stage seven');
  assert.equal(app.state().history.length, 0);
  assert.equal(app.pendingAdvances(), 0);

  const oldStageFour = savedGame(previous, [{from: 5, to: 1, type: 'ladder'}], 4);
  const restored = start(oldStageFour);
  assert.deepEqual(restored.state().permutation, previous, 'an existing stage-four puzzle is not replaced mid-play');
  assert.deepEqual(restored.state().board, oldStageFour.board);
  assert.deepEqual(restored.state().history, oldStageFour.history);
  assert(restored.cell(5).classList.contains('k-origin'), 'an existing stage-four move keeps its optional addition');

  const oldStageFive = savedGame([1, 2, 5, 4, 3], [{from: 11, to: 7, type: 'ladder'}], 5);
  const oldFive = start({...oldStageFive, difficulty: {label: 'Difficulty 1'}});
  assert.deepEqual(oldFive.state().permutation, oldStageFive.permutation, 'the former fixed stage-five puzzle is not replaced mid-play');
  assert.deepEqual(oldFive.state().board, oldStageFive.board);
  assert.deepEqual(oldFive.state().history, oldStageFive.history);
  assert(oldFive.cell(11).classList.contains('k-origin'), 'an existing stage-five move keeps its optional addition');
  assert.equal(oldFive.get('difficulty-label').textContent, 'Difficulty 2', 'the former stage-five exception now shows its true pattern difficulty');
  await oldFive.click(11);
  assert.equal(oldFive.state().history[0].type, 'k-ladder', 'old stage-five progress remains playable');
  assert.equal(oldFive.get('difficulty-label').textContent, 'Difficulty 2');
  assert(oldFive.state().seen.includes('1,2,5,4,3'), 'restoring an old save with an empty seen list remembers its current puzzle');
  for (const permutation of [simplePermutation(6), [1, 2, 5, 4, 3, 6]]) {
    const first = {...E.maximalPath(permutation)[0], type: 'ladder'};
    const pending = savedGame(permutation, [first], 7);
    const restoredSeven = start(pending);
    assert.deepEqual(restoredSeven.state().permutation, permutation, 'an existing stage-seven puzzle is not replaced mid-play');
    assert.deepEqual(restoredSeven.state().board, pending.board);
    assert.deepEqual(restoredSeven.state().history, pending.history);
    assert(restoredSeven.cell(first.from).classList.contains('k-origin'), 'stage-seven progress retains its pending addition');
    assert.equal(restoredSeven.get('difficulty-label').textContent, E.patternDifficulty(permutation).label);
    await restoredSeven.click(first.from);
    assert.equal(restoredSeven.state().history[0].type, 'k-ladder', 'restored stage-seven progress remains playable');
  }

  for (const [number, size, earlierFixed, excluded, tier] of [
    [3, 5, [1, 4, 5, 2, 3, 6], [1, 4, 5, 2, 3], 1],
    [6, 6, [1, 2, 5, 4, 3], [1, 2, 5, 4, 3, 6], 2]
  ]) {
    const permutation = simplePermutation(size);
    const legacy = savedGame(permutation, E.maximalPath(permutation), number);
    legacy.seen = [earlierFixed.join(',')];
    const restored = start(legacy);
    await restored.advance();
    assert.equal(restored.state().stage, number + 1);
    assertBoardSize(restored, size);
    assert.notDeepEqual(restored.state().permutation, excluded,
      'a fixed stage does not replay a puzzle already encountered in another symmetric group');
    assert.equal(restored.get('difficulty-label').textContent, `Difficulty ${tier}`);
    assert.equal(E.patternDifficulty(restored.state().permutation).tier, tier);
  }
}

async function leaveGameChecks() {
  const permutation = [1, 4, 3, 2, 5];
  const pending = savedGame(permutation, [{from: 6, to: 2, type: 'ladder'}], 3);
  let hintCalls = 0;
  const engine = {...E, findWinningPath() { hintCalls += 1; return []; }};
  const app = start(pending, engine);
  await app.click(5);
  assert(app.cell(5).classList.contains('selected'));
  const before = app.state();
  const rulesPreference = app.storage.get(RULES_SEEN_KEY);

  await app.button('leave-game-yes');
  assert.equal(app.closeCalls.length, 0, 'a hidden Yes button cannot close the game');
  await app.button('leave-game-button');
  assert.equal(app.get('leave-game-dialog').open, true);
  assert.equal(app.closeCalls.length, 0, 'opening the confirmation does not close the game');
  for (const key of ['u', 'h', 'Escape']) await app.key(key);
  await app.button('hint-button');
  assert.equal(hintCalls, 0, 'shortcuts and direct hints stay inactive while deciding whether to leave');
  assert.deepEqual(app.state(), before);
  assert(app.cell(5).classList.contains('selected'), 'Escape does not clear the board selection behind the dialog');
  await app.button('leave-game-no');
  assert.equal(app.get('leave-game-dialog').open, false);
  assert.equal(app.closeCalls.length, 0, 'No stays in the game');
  assert.deepEqual(app.state(), before, 'No preserves the stage and all saved progress');
  assert(app.cell(6).classList.contains('k-origin'), 'No preserves the option to add a cell');
  assert(app.cell(5).classList.contains('selected'), 'No preserves the selected cell');

  await app.button('leave-game-button');
  // Native <dialog> Escape emits cancel, then closes when not prevented.
  await app.get('leave-game-dialog').emit('cancel');
  app.get('leave-game-dialog').close();
  assert.equal(app.closeCalls.length, 0, 'native Escape dismissal does not leave the game');
  assert.deepEqual(app.state(), before);
  await app.button('leave-game-button');
  await app.button('leave-game-yes');
  assert.equal(app.closed(), true, 'Yes closes the game tab when the browser permits it');
  assert.deepEqual(app.closeCalls, [before], 'Yes saves the current game before closing');
  assert.deepEqual(app.browserEvents.slice(-2), [{type: 'save', key: STORAGE_KEY}, {type: 'close'}],
    'the final save happens before the close request');
  assert.deepEqual(app.navigations, [], 'leaving does not replace the game tab with another website');
  assert.deepEqual(app.state(), before, 'leaving keeps saved progress intact');
  assert.equal(app.storage.get(RULES_SEEN_KEY), rulesPreference);
  await app.leaveFallback();
  assert.equal(app.get('leave-game-help').hidden, true, 'a successful close does not show browser instructions');

  const simple = simplePermutation(5);
  const won = savedGame(simple, E.maximalPath(simple), 3);
  const completed = start(won);
  const staleCompletion = completed.completionTimers.at(-1).callback;
  await completed.button('leave-game-button');
  assert.equal(completed.pendingAdvances(), 0, 'the leave dialog cancels automatic advancement');
  await staleCompletion();
  await completed.advance();
  assert.equal(completed.state().stage, 3, 'a previously queued completion cannot advance behind the leave dialog');
  await completed.button('leave-game-yes');
  await staleCompletion();
  await completed.advance();
  assert.equal(completed.state().stage, 3, 'leaving cannot advance saved progress during tab closure');
  assert.equal(completed.closeCalls.length, 1);

  const blocked = start(won, E, {closeBlocked: true});
  const completedSave = blocked.state();
  await blocked.button('leave-game-button');
  await blocked.button('leave-game-yes');
  assert.equal(blocked.closed(), false);
  assert.deepEqual(blocked.closeCalls, [completedSave], 'a blocked close still saves progress first');
  assert.equal(blocked.get('leave-game-help').hidden, true, 'instructions wait for the attempted close');
  await blocked.leaveFallback();
  assert.equal(blocked.get('leave-game-help').hidden, false, 'a blocked close explains how to close the tab');
  assert.equal(blocked.get('leave-game-dialog').open, true, 'the player retains the confirmation options');
  assert.equal(blocked.pendingAdvances(), 0, 'a blocked close keeps completion paused');
  await blocked.advance();
  assert.deepEqual(blocked.state(), completedSave);
  assert.deepEqual(blocked.navigations, [], 'a blocked close does not navigate elsewhere');
  await blocked.button('leave-game-no');
  assert.equal(blocked.get('leave-game-dialog').open, false, 'No remains available when closing is blocked');
  assert.equal(blocked.pendingAdvances(), 1, 'No resumes completion after a blocked close');
  await blocked.button('leave-game-button');
  assert.equal(blocked.get('leave-game-help').hidden, true, 'reopening the dialog clears the old instructions');
  await blocked.button('leave-game-yes');
  const staleFallback = blocked.leaveFallbackTimers.at(-1).callback;
  await blocked.button('leave-game-no');
  await staleFallback();
  assert.equal(blocked.get('leave-game-help').hidden, true, 'a dismissed close attempt cannot show instructions');
  await blocked.button('leave-game-button');
  await staleFallback();
  assert.equal(blocked.get('leave-game-help').hidden, true, 'an earlier close attempt cannot change a reopened dialog');
  assert.equal(blocked.pendingAdvances(), 0);
  await blocked.button('leave-game-yes');
  await blocked.leaveFallback();
  assert.equal(blocked.get('leave-game-help').hidden, false, 'a fresh blocked attempt still shows instructions');
  await blocked.get('leave-game-dialog').emit('cancel');
  blocked.get('leave-game-dialog').close();
  assert.equal(blocked.get('leave-game-dialog').open, false, 'Escape remains available after a blocked close');
  assert.equal(blocked.pendingAdvances(), 1);
  assert.deepEqual(blocked.state(), completedSave);

  const timers = [];
  const racing = start(pending, engine, {setTimeout: callback => timers.push(callback)});
  const beforeHint = racing.state();
  const queuedHint = racing.button('hint-button');
  assert.equal(timers.length, 1);
  await racing.button('leave-game-button');
  timers.shift()();
  await queuedHint;
  assert.equal(hintCalls, 0, 'a queued hint is discarded when the leave dialog opens');
  assert.deepEqual(racing.state(), beforeHint);
  assert.equal(racing.get('hint-button').disabled, false);
  assert(!racing.get('board').children.some(cell => /selected|destination|hint-source/.test(cell.className)));
}

async function redoChecks() {
  const permutation = [1, 4, 3, 2, 5, 6, 7];
  const path = E.maximalPath(permutation);
  let app = start(savedGame(permutation, [], 68));
  for (const move of path.slice(0, 2)) {
    await ladder(app, move.from, move.to);
    if (move.type === 'k-ladder') await app.click(move.from);
  }
  const played = app.state();
  assert.equal(played.history.length, 2);
  assert.equal(app.get('redo-button').disabled, true, 'nothing to redo before an undo');
  await app.button('undo-button');
  assert.equal(app.state().redo.length, 1);
  assert.equal(app.get('redo-button').disabled, false);
  await app.button('redo-button');
  assert.deepEqual(app.state().board, played.board, 'redo reapplies the undone move');
  assert.deepEqual(app.state().history, played.history);
  assert.deepEqual(app.state().redo, []);

  await app.button('restart-button');
  assert.deepEqual(app.state().board, E.bottomDream(permutation));
  assert.equal(app.state().history.length, 0);
  assert.equal(app.state().redo.length, 2, 'restart keeps the moves for redo');
  await app.button('redo-button');
  await app.button('redo-button');
  assert.deepEqual(app.state().board, played.board, 'restart can be undone move by move');
  assert.deepEqual(app.state().history, played.history);

  await app.key('r');
  assert.equal(app.state().history.length, 0, 'R restarts');
  await app.keyWith('U', {shiftKey: true});
  assert.equal(app.state().history.length, 1, 'Shift+U redoes');
  await app.keyWith('y', {ctrlKey: true});
  assert.equal(app.state().history.length, 2, 'Ctrl+Y redoes');
  await app.keyWith('z', {ctrlKey: true});
  assert.equal(app.state().history.length, 1, 'Ctrl+Z undoes');
  await app.keyWith('z', {metaKey: true, shiftKey: true});
  assert.equal(app.state().history.length, 2, 'Cmd+Shift+Z redoes');

  await app.button('undo-button');
  const withRedo = app.state();
  app = start(withRedo);
  assert.deepEqual(app.state().redo, withRedo.redo, 'the redo stack survives a reload');
  assert.equal(app.get('redo-button').disabled, false);
  const top = withRedo.redo.at(-1);
  await ladder(app, top.from, top.to);
  assert.deepEqual(app.state().redo, [], 'a new move clears the redo stack');

  app = start({...withRedo, redo: [{from: 0, to: 1, type: 'ladder'}]});
  assert.deepEqual(app.state().redo, [], 'an illegal saved redo stack is discarded');
  assert.deepEqual(app.state().board, withRedo.board, 'discarding redo keeps the restored board');
  assert.deepEqual(app.state().history, withRedo.history);
  app = start({...withRedo, redo: 'not a list'});
  assert.deepEqual(app.state().redo, []);
  assert.deepEqual(app.state().board, withRedo.board);
}

async function completionChecks() {
  const simple = simplePermutation(5);
  const path = E.maximalPath(simple);
  let app = start(savedGame(simple, path, 3));
  assert.equal(app.get('complete-banner').hidden, false, 'a finished board shows its summary');
  assert.equal(app.get('complete-title').textContent, 'Stage 3 complete');
  assert.match(app.get('complete-stats').textContent, new RegExp(`^${path.length} moves? · \\d+:\\d\\d · no hints$`));
  assert.equal(app.get('redo-button').disabled, true);
  await app.button('next-stage-button');
  assert.equal(app.state().stage, 4, 'Next starts the following stage immediately');
  assert.equal(app.pendingAdvances(), 0);
  await app.advance();
  assert.equal(app.state().stage, 4, 'the skipped delay cannot advance a second time');
  assert.equal(app.get('complete-banner').hidden, true);
  assert.equal(app.cell(0).focused, true);
  await app.button('next-stage-button');
  assert.equal(app.state().stage, 4, 'Next does nothing on an unfinished board');
  const meta = JSON.parse(app.storage.get(META_KEY));
  assert.equal(meta.stats.cleared, 1, 'completions are counted');
  assert.equal(meta.stats.bestStage, 3);
  assert.equal(meta.stats.moves, path.length);
  assert.deepEqual(meta.stats.recent.map(item => [item.stage, item.n, item.moves, item.hints]), [[3, 5, path.length, 0]]);
  assert.equal(meta.current.id, `4:${app.state().permutation.join(',')}`, 'the stage clock starts afresh');
  assert.equal(meta.current.hints, 0);

  app = start(savedGame(simple, path, 3));
  await app.key('n');
  assert.equal(app.state().stage, 4, 'N continues to the next stage');

  for (const [open, close, dialog] of [['settings-button', 'close-settings', 'settings-dialog']]) {
    app = start(savedGame(simple, path, 3));
    await app.button(open);
    assert.equal(app.get(dialog).open, true);
    assert.equal(app.pendingAdvances(), 0, `${dialog} pauses advancement`);
    await app.advance();
    assert.equal(app.state().stage, 3);
    await app.key('n');
    assert.equal(app.state().stage, 3, 'shortcuts wait behind the dialog');
    await app.button(close);
    assert.equal(app.pendingAdvances(), 1, `closing ${dialog} resumes advancement`);
    await app.advance();
    assert.equal(app.state().stage, 4);
  }

  // Hints are counted against the stage and reported when it is finished.
  const permutation = [1, 4, 3, 2, 5, 6, 7];
  app = start(savedGame(permutation, [], 68));
  await app.button('hint-button');
  assert.equal(JSON.parse(app.storage.get(META_KEY)).current.hints, 1, 'a shown hint is counted');
  await app.key('Escape');
  for (const move of E.maximalPath(permutation)) {
    await ladder(app, move.from, move.to);
    if (move.type === 'k-ladder') await app.click(move.from);
  }
  assert.match(app.get('complete-stats').textContent, /· 1 hint$/);
  await app.advance();
  assert.equal(JSON.parse(app.storage.get(META_KEY)).stats.hints, 1);
}

async function tutorialChecks() {
  const simple = simplePermutation(5);
  let app = start(savedGame(simple, [], 1));
  const coached = () => app.get('board').children.filter(cell => cell.classList.contains('coach')).map(cell => Number(cell.dataset.index));
  const first = E.maximalPath(simple)[0];
  assert.deepEqual(coached(), [first.from], 'a new player is guided to the first move');
  assert.match(app.get('status-line').className, /coach-line/);
  await app.click(first.from);
  assert.deepEqual(coached(), [first.to], 'the guide then points at the destination');
  await app.button('undo-button');
  for (let step = 0; step < 12 && E.countCells(app.state().board) < E.maximumCrossings(simple); step += 1) {
    const [index] = coached();
    assert(index !== undefined, 'every tutorial step highlights one cell');
    await app.click(index);
  }
  assert.equal(E.countCells(app.state().board), E.maximumCrossings(simple), 'following the guide solves stage one');
  assert.deepEqual(coached(), []);
  await app.advance();
  assert.equal(app.state().stage, 2);
  assert.deepEqual(coached(), [], 'the guide ends after the first cleared stage');

  app = start(savedGame([1, 4, 5, 2, 3], [], 1));
  const [index] = coached();
  assert(index !== undefined);
  const blocked = app.get('board').children.find(cell => cell.classList.contains('occupied') && !cell.classList.contains('movable'));
  await app.click(Number(blocked.dataset.index));
  assert.match(app.get('status-line').className, /warn/, 'feedback about a blocked cell outranks the guide');
  await app.key('Escape');
  assert.deepEqual(coached(), [index]);

  const veteran = new Map([[META_KEY, JSON.stringify({version: 1, stats: {cleared: 4}, current: {}})]]);
  app = start(savedGame(simple, [], 1), E, {storage: veteran});
  assert.deepEqual(coached(), [], 'players who cleared a stage before are not guided');
  assert.doesNotMatch(app.get('status-line').className, /coach-line/);
}

async function feedbackChecks() {
  let app = start(savedGame([1, 4, 3, 2, 5, 6, 7], [], 68));
  await app.click(7);
  assert.match(app.get('status-line').textContent, /square to its right is filled/);
  assert.match(app.get('status-line').className, /warn/);
  app = start(savedGame([2, 1, 4, 3, 5], [], 68));
  await app.click(0);
  assert.match(app.get('status-line').textContent, /top row/);
  app = start(savedGame([1, 3, 2, 5, 4], [], 68));
  await app.click(5);
  assert.match(app.get('status-line').textContent, /outlined square/);
  assert.match(app.get('board-overlay').innerHTML, /move-arrow/, 'the selected move is drawn as an arrow');
  await app.key('Escape');
  assert.doesNotMatch(app.get('board-overlay').innerHTML, /move-arrow/);

  // Cells on the last diagonal can move (the square beyond the staircase
  // counts as empty), so a blocked one is explained by the rows above it.
  let diagonal = null;
  for (let k = 0; k < 720 && !diagonal; k += 1) {
    const w = E.nthPermutation(6, k);
    if (E.isDominant(w)) continue;
    const stack = [[E.bottomDream(w), []]];
    const visited = new Set();
    while (stack.length && !diagonal) {
      const [board, history] = stack.pop();
      if (visited.has(board.join(''))) continue;
      visited.add(board.join(''));
      for (let row = 1; row < 5 && !diagonal; row += 1) {
        const index = row * 6 + 4 - row;
        if (board[index] && !E.legalMoves(board, 6).some(move => move.from === index)) diagonal = {w, history, index};
      }
      for (const move of E.legalMoves(board, 6)) if (history.length < 6) stack.push([E.applyMove(board, move, 6), [...history, move]]);
    }
  }
  assert(diagonal, 'fixture: a blocked cell on the last diagonal');
  app = start(savedGame(diagonal.w, diagonal.history, 68));
  await app.click(diagonal.index);
  assert.match(app.get('status-line').textContent, /row \d+ has only one filled square|no empty pair/);
  assert.doesNotMatch(app.get('status-line').textContent, /outside the staircase/);
  let movableDiagonal = null;
  for (let k = 0; k < 720 && !movableDiagonal; k += 1) {
    const w = E.nthPermutation(6, k);
    if (E.isDominant(w)) continue;
    const move = E.legalMoves(E.bottomDream(w), 6).find(candidate => candidate.fromRow + candidate.fromCol === 4 && candidate.type === 'ladder');
    if (move) movableDiagonal = {w, move};
  }
  app = start(savedGame(movableDiagonal.w, [], 68));
  assert(app.cell(movableDiagonal.move.from).classList.contains('movable'), 'a last-diagonal cell can move');
  await ladder(app, movableDiagonal.move.from, movableDiagonal.move.to);
  assert.equal(app.state().history.length, 1);

  // Find a K-ladder that leaves no forward moves below the maximum.
  let found = null;
  for (let k = 0; k < 720 && !found; k += 1) {
    const w = E.nthPermutation(6, k);
    if (E.isDominant(w)) continue;
    const target = E.maximumCrossings(w);
    const stack = [{board: E.bottomDream(w), history: []}];
    const seen = new Set();
    while (stack.length && !found) {
      const {board, history} = stack.pop();
      if (seen.has(board.join(''))) continue;
      seen.add(board.join(''));
      for (const move of E.legalMoves(board, 6)) {
        const next = E.applyMove(board, move, 6);
        if (move.type === 'k-ladder' && E.countCells(next) < target && !E.legalMoves(next, 6).length) {
          found = {w, history: [...history, {...move, type: 'ladder'}], origin: move.from};
          break;
        }
        stack.push({board: next, history: [...history, move]});
      }
    }
  }
  assert(found, 'fixture: a K-ladder can strand the board below its maximum');
  app = start(savedGame(found.w, found.history, 68));
  await app.click(found.origin);
  assert.equal(app.get('notice').hidden, false, 'a stranded board is reported visibly');
  assert.match(app.get('notice').textContent, /No moves left/);
  assert.match(app.get('status-line').textContent, /No moves left/, 'the warning appears beneath the board');
  assert.match(app.get('status-line').className, /warn/);
  assert.match(app.get('status-message').textContent, /No forward moves remain/);
  await app.button('undo-button');
  assert.equal(app.get('notice').hidden, true);
}

async function viewChecks() {
  const permutation = [1, 4, 3, 2, 5, 6, 7];
  let app = start(savedGame(permutation, [], 68));
  const pipes = () => (app.get('board-overlay').innerHTML.match(/class="pipe"/g) || []).length;
  assert.equal(pipes(), 0, 'tiles are the default view');
  assert.equal(app.get('board-size-label'), undefined, 'the header shows no board size');
  app.get('style-pipes').checked = true;
  await app.get('style-pipes').emit('change');
  assert.equal(pipes(), 7, 'the pipes view draws one path per pipe');
  assert(app.get('board').classList.contains('pipes'));
  assert.equal(JSON.parse(app.storage.get(SETTINGS_KEY)).pipes, true);
  const storage = app.storage;
  app = start(undefined, E, {storage});
  assert.equal(pipes(), 7, 'the view choice persists');
  await app.button('settings-button');
  assert.equal(app.get('style-pipes').checked, true, 'settings reflect the saved view');
  assert.equal(app.get('theme-system').checked, true);
  assert.equal(app.get('sound-toggle').checked, true, 'sound is on by default');
  app.get('sound-toggle').checked = false;
  await app.get('sound-toggle').emit('change');
  assert.equal(JSON.parse(app.storage.get(SETTINGS_KEY)).sound, false);
  app.get('style-tiles').checked = true;
  await app.get('style-tiles').emit('change');
  assert.equal(pipes(), 0);
  await app.button('close-settings');

  assert.equal(app.get('progress-button'), undefined, 'there is no Progress button');
  assert.equal(app.get('progress-dialog'), undefined, 'there is no Progress dialog');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const rules = html.slice(html.indexOf('<dialog id="rules-dialog"'), html.indexOf('</dialog>', html.indexOf('<dialog id="rules-dialog"')));
  assert.match(rules, /<p class="paper-credit">Based on Chen-An Chou and Tianyi Yu, <a href="https:\/\/www\.combinatorics\.org\/ojs\/index\.php\/eljc\/article\/view\/v31i3p15"[^>]*>Constructing Maximal Pipedreams of Double Grothendieck Polynomials<\/a>, Electron\. J\. Combin\. 31 \(2024\), P3\.15\.<\/p>\s*$/,
    'the paper citation ends the rules');

  await app.button('settings-button');
  await app.button('reset-stage-button');
  assert.equal(app.get('settings-dialog').open, false, 'starting over leaves settings for the confirmation');
  assert.equal(app.get('reset-stage-dialog').open, true);
  await app.button('reset-stage-no');
  assert.equal(app.state().stage, 68);
}

async function spaceChecks() {
  const multiple = [1, 4, 3, 2, 5, 6, 7];
  let app = start(savedGame(multiple, [], 68));
  const before = app.state();
  await app.key(' ');
  assert.deepEqual(app.state(), before, 'Space does nothing without a pending addition');
  await ladder(app, 8, 2);
  assert(app.cell(8).classList.contains('k-origin'));
  let swallowed = false;
  await app.key(' ');
  assert.equal(app.state().history.length, 1, 'Space keeps the move count');
  assert.equal(app.state().history[0].type, 'k-ladder', 'Space adds the cell at the green +');
  assert.equal(app.state().board[8], 1);
  assert.equal(E.countCells(app.state().board), E.countCells(before.board) + 1);
  assert(!app.cell(8).classList.contains('k-origin'));
  await app.keyUp(' ', () => { swallowed = true; });
  assert.equal(swallowed, true, 'the keyup is swallowed so no focused button is pressed too');
  swallowed = false;
  await app.keyUp(' ', () => { swallowed = true; });
  assert.equal(swallowed, false, 'only the Space that added a cell is swallowed');
  await app.key(' ');
  assert.equal(app.state().history.length, 1, 'a second Space has nothing to add');
  await app.button('undo-button');
  assert.deepEqual(app.state().board, before.board, 'Undo removes the move and the added cell together');

  // Space works while another cell is selected, including when that cell's
  // landing overlaps the origin (where a click would make the move instead).
  const collision = [1, 2, 3, 5, 4, 6, 7];
  app = start(savedGame(collision, [{from: 21, to: 15, type: 'k-ladder'}, {from: 15, to: 9, type: 'ladder'}]));
  await app.click(21);
  assert(app.cell(15).classList.contains('destination'));
  assert(app.cell(15).classList.contains('k-origin'));
  await app.key(' ');
  assert.equal(app.state().history.length, 2, 'Space converts instead of moving');
  assert.equal(app.state().history[1].type, 'k-ladder');
  assert.equal(app.state().board[21], 1, 'the selected cell did not move');
  assert(!app.get('board').children.some(cell => cell.classList.contains('selected')), 'adding clears the selection');

  // Dialogs keep Space for their own controls.
  app = start(savedGame(multiple, [{from: 8, to: 2, type: 'ladder'}], 68));
  await app.button('rules-button');
  await app.key(' ');
  assert.equal(app.state().history[0].type, 'ladder', 'Space is inert behind a dialog');
  await app.button('close-rules');
  await app.key(' ');
  assert.equal(app.state().history[0].type, 'k-ladder');

  // Space finishes a stage when the addition reaches the maximum.
  const simple = simplePermutation(5);
  const path = E.maximalPath(simple);
  const last = path.at(-1);
  app = start(savedGame(simple, [...path.slice(0, -1), {...last, type: 'ladder'}], 3));
  assert.equal(last.type, 'k-ladder');
  await app.key(' ');
  assert.equal(E.countCells(app.state().board), E.maximumCrossings(simple));
  assert.equal(app.get('complete-banner').hidden, false);
  assert.equal(app.pendingAdvances(), 1);
  assert.match(app.cell(last.from).getAttribute('aria-label') || '', /filled/);
  await app.keyWith(' ', {repeat: true});
  assert.equal(app.state().stage, 3, 'a held Space does not skip the finished board');
  await app.key(' ');
  assert.equal(app.state().stage, 4, 'Space presses Next stage on a finished board');
  assert.equal(app.pendingAdvances(), 0);
  await app.advance();
  assert.equal(app.state().stage, 4, 'the skipped countdown cannot advance again');
  assert.equal(app.cell(0).focused, true);
  let swallowedNext = false;
  await app.keyUp(' ', () => { swallowedNext = true; });
  assert.equal(swallowedNext, true, 'the keyup cannot also press a focused button');
  await app.key(' ');
  assert.equal(app.state().stage, 4, 'Space on an unfinished board without a + does not advance');

  app = start(savedGame(simple, path, 3));
  await app.button('settings-button');
  await app.key(' ');
  assert.equal(app.state().stage, 3, 'Space waits behind a dialog');
  await app.button('close-settings');
  await app.key(' ');
  assert.equal(app.state().stage, 4);
}

async function main() {
  const simple = [1, 3, 2, 4, 5, 6, 7];
  let app = start(savedGame(simple));
  assert.equal(app.get('mode-ladder'), undefined);
  assert.equal(app.get('mode-k'), undefined);
  assert.equal(app.get('permutation'), undefined, 'the permutation is omitted from the header');
  assert.equal(app.get('new-game-button'), undefined, 'the different-puzzle button is removed');
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
  await outerCellChecks();
  await boundedHintChecks();
  await restoredDifficultyChecks();
  await firstVisitRulesChecks();
  await resetStageChecks();
  await automaticAdvanceChecks();
  await fixedTeachingStageChecks();
  await leaveGameChecks();
  await redoChecks();
  await completionChecks();
  await tutorialChecks();
  await feedbackChecks();
  await viewChecks();
  await spaceChecks();
  console.log('Interaction checks passed: the Space shortcut for adding cells and Next stage, redo and undoable restarts, completion summaries and Next, statistics, the first-stage tutorial, blocked-cell and stranded-board feedback, the pipes view, settings, and the citation at the end of the rules; legal moves, persistent cell addition, overlapping landings, bounded hints, undo/reload, S5–S17 displayed on 4×4–16×16 grids, outer playable cells and keyboard boundaries, growth boundaries, legacy saves, size-18 save rejection, pattern-based difficulty restoration, first-visit rules, confirmed stage resets, confirmed tab closure with blocked-close recovery, and automatic advancement with cancellation and dialog pauses.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
