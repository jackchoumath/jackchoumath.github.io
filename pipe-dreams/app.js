/* Browser interaction for the Chou–Yu pipe dream game. */
(() => {
  'use strict';
  const E = window.PipeDreamEngine;
  const STORAGE_KEY = 'pipe-dreams-game-v1';
  const RULES_SEEN_KEY = 'pipe-dreams-rules-seen-v1';
  const SETTINGS_KEY = 'pipe-dreams-settings-v1';
  const META_KEY = 'pipe-dreams-meta-v1';
  // Shared with the homepage's light/dark toggle, so both stay in step.
  const THEME_KEY = 'jack-chou-theme';
  // Long enough to enjoy the finished board; Next skips the wait.
  const ADVANCE_DELAY = 2600;
  // Time spent idle beyond this between two actions is not counted.
  const IDLE_GAP_MS = 30000;
  const $ = id => document.getElementById(id);
  const cells = new Map();
  let selected = null;
  let justAdded = null;
  let hintSource = null;
  let previewIndex = null;
  let focusIndex = 0;
  let hintBusy = false;
  let advanceTimer = null;
  let advanceVersion = 0;
  let leaveAttemptVersion = 0;
  let ladderBySource = new Map();
  let pendingEffect = null;
  let celebrating = false;
  let lastRender = null;
  let coachState = null;
  let line = {text: '', tone: ''};
  let drag = null;
  // The browser follows a finished drag with one click on the cell where it
  // started (now the green +). Only that click is ignored; a new press clears it.
  let swallowDragClick = 0;
  // Touch taps act as the finger lifts instead of waiting for the browser's
  // click, which can be dropped when a tap closely follows another touch.
  // The click that may still follow such a tap is then ignored.
  let touchTap = null;
  let tapHandled = null;
  let spaceHandled = false;
  let lastTick = null;
  let game;

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Playing still works when storage is unavailable. */ }
  }

  const settings = (() => {
    const saved = readJSON(SETTINGS_KEY) || {};
    return {pipes: saved.pipes === true, sound: saved.sound !== false};
  })();
  function saveSettings() { writeJSON(SETTINGS_KEY, settings); }

  function freshMeta() {
    return {
      version: 1,
      stats: {cleared: 0, hints: 0, moves: 0, timeMs: 0, bestStage: 0, recent: []},
      current: {id: '', ms: 0, hints: 0}
    };
  }
  function readMeta() {
    const meta = freshMeta();
    const saved = readJSON(META_KEY);
    if (!saved || saved.version !== 1) return meta;
    const stats = saved.stats || {};
    for (const key of ['cleared', 'hints', 'moves', 'timeMs', 'bestStage']) {
      if (Number.isSafeInteger(stats[key]) && stats[key] >= 0) meta.stats[key] = stats[key];
    }
    if (Array.isArray(stats.recent)) meta.stats.recent = stats.recent.filter(item => item && Number.isSafeInteger(item.stage)).slice(-30);
    const current = saved.current || {};
    if (typeof current.id === 'string') {
      meta.current = {
        id: current.id,
        ms: Number.isFinite(current.ms) && current.ms >= 0 ? current.ms : 0,
        hints: Number.isSafeInteger(current.hints) && current.hints >= 0 ? current.hints : 0
      };
    }
    return meta;
  }
  const meta = readMeta();
  function puzzleId() { return `${game.stage}:${game.permutation.join(',')}`; }
  function syncMetaCurrent() {
    if (meta.current.id !== puzzleId()) meta.current = {id: puzzleId(), ms: 0, hints: 0};
  }
  function startStageClock() {
    meta.current = {id: puzzleId(), ms: 0, hints: 0};
    lastTick = Date.now();
  }
  // Count active play only: long pauses between actions are capped.
  function tick() {
    const now = Date.now();
    if (lastTick !== null && !solved()) meta.current.ms += Math.min(Math.max(0, now - lastTick), IDLE_GAP_MS);
    lastTick = now;
  }

  const media = query => (typeof window.matchMedia === 'function' ? window.matchMedia(query) : null);
  const darkQuery = media('(prefers-color-scheme: dark)');
  const motionQuery = media('(prefers-reduced-motion: reduce)');
  function reduceMotion() { return Boolean(motionQuery && motionQuery.matches); }
  const hoverQuery = media('(hover: hover)');
  function keyboardLikely() { return Boolean(hoverQuery && hoverQuery.matches); }
  function themePreference() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch { return 'system'; }
  }
  const root = document.documentElement;
  // A page embedding the game may already have chosen a theme; "System"
  // keeps that choice, and otherwise the stylesheet follows the device.
  const hostTheme = root && root.getAttribute && themePreference() === 'system' ? root.getAttribute('data-theme') : null;
  function applyTheme() {
    const preference = themePreference();
    const chosen = preference === 'system' ? hostTheme : preference;
    if (root && root.dataset) {
      if (chosen) root.dataset.theme = chosen;
      else delete root.dataset.theme;
    }
    const dark = chosen ? chosen === 'dark' : Boolean(darkQuery && darkQuery.matches);
    const color = document.querySelector ? document.querySelector('meta[name="theme-color"]') : null;
    if (color) color.setAttribute('content', dark ? '#161814' : '#f3f0e7');
  }
  function setTheme(preference) {
    try {
      if (preference === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, preference);
    } catch { /* The choice still applies to this visit. */ }
    applyTheme();
  }

  // Short synthesized cues; nothing is downloaded and silence is the fallback.
  const sound = (() => {
    let context = null;
    function audio() {
      if (!settings.sound) return null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!context) context = new AudioContextClass();
      if (context.state === 'suspended') context.resume();
      return context;
    }
    function tone(ctx, frequency, start, duration, options = {}) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + start;
      oscillator.type = options.type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, at + duration);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(options.gain || 0.05, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.03);
    }
    const effects = {
      select: ctx => tone(ctx, 740, 0, 0.06, {gain: 0.03}),
      move: ctx => tone(ctx, 392, 0, 0.13, {type: 'triangle', to: 587, gain: 0.05}),
      add: ctx => { tone(ctx, 659, 0, 0.1, {gain: 0.05}); tone(ctx, 988, 0.07, 0.18, {gain: 0.045}); },
      undo: ctx => tone(ctx, 494, 0, 0.12, {type: 'triangle', to: 330, gain: 0.04}),
      invalid: ctx => tone(ctx, 147, 0, 0.13, {type: 'triangle', gain: 0.06}),
      hint: ctx => { tone(ctx, 880, 0, 0.14, {gain: 0.025}); tone(ctx, 1175, 0.08, 0.22, {gain: 0.02}); },
      complete: ctx => [523, 659, 784, 1047].forEach((frequency, i) =>
        tone(ctx, frequency, i * 0.09, 0.34, {type: i === 3 ? 'sine' : 'triangle', gain: 0.045}))
    };
    return name => {
      try { const ctx = audio(); if (ctx) effects[name](ctx); }
      catch { /* Sound is optional. */ }
    };
  })();
  function buzz(pattern) {
    try { if (settings.sound && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); }
    catch { /* Vibration is optional. */ }
  }

  function size() { return game.permutation.length; }

  function freshGame(stage = 1, seen = []) {
    const puzzle = E.progressiveStage(stage, undefined, Math.random, seen);
    return {
      version: 1, stage, permutation: puzzle.permutation, board: puzzle.board,
      history: [], redo: [], difficulty: puzzle.difficulty,
      seen: [...seen.slice(-99), puzzle.permutation.join(',')]
    };
  }

  function readSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1 || !Number.isSafeInteger(saved.stage) || saved.stage < 1 ||
          !Array.isArray(saved.permutation) || saved.permutation.length < 5 || saved.permutation.length > 17 ||
          ![...saved.permutation].sort((a, b) => a - b).every((value, index) => value === index + 1) ||
          E.isDominant(saved.permutation) || !Array.isArray(saved.history)) return null;
      const n = saved.permutation.length;
      // Every move increases the sum of occupied (column + 1), which is
      // bounded by this staircase sum even on the largest boards.
      const longest = n * (n - 1) * (n + 1) / 6;
      if (saved.history.length > longest) return null;
      let board = E.bottomDream(saved.permutation);
      // Validate the complete saved path, not just the number of cells.
      for (const move of saved.history) board = E.applyMove(board, move, saved.permutation.length);
      if (!Array.isArray(saved.board) || board.join('') !== saved.board.join('')) return null;
      // Redo moves must also replay legally from the restored board.
      let redo = [];
      if (Array.isArray(saved.redo) && saved.history.length + saved.redo.length <= longest) {
        try {
          let ahead = board;
          for (let i = saved.redo.length - 1; i >= 0; i -= 1) ahead = E.applyMove(ahead, saved.redo[i], n);
          redo = saved.redo;
        } catch { redo = []; }
      }
      const seen = Array.isArray(saved.seen) ? saved.seen.filter(s => typeof s === 'string').slice(-100) : [];
      const currentKey = saved.permutation.join(',');
      if (!seen.includes(currentKey)) seen.push(currentKey);
      return {
        version: 1, stage: saved.stage, permutation: saved.permutation, board,
        history: saved.history, redo,
        difficulty: saved.difficulty && typeof saved.difficulty.label === 'string' ? saved.difficulty : null,
        seen: seen.slice(-100)
      };
    } catch { return null; }
  }

  function save() {
    // Statistics first: the game itself is always the final write.
    writeJSON(META_KEY, meta);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); }
    catch { /* Playing still works when storage is unavailable. */ }
  }

  function target() { return E.maximumCrossings(game.permutation); }
  function solved() { return E.countCells(game.board) === target(); }
  function dialogOpen() {
    return ['rules-dialog', 'reset-stage-dialog', 'leave-game-dialog', 'settings-dialog']
      .some(id => $(id) && $(id).open);
  }
  // The status line beneath the board is the visible message; a notice
  // marks a warning there and stays in the page for assistive technology.
  function announce(message, notice = '', visible = message, tone = '') {
    $('status-message').textContent = message;
    $('notice').textContent = notice;
    $('notice').hidden = !notice;
    line = notice && visible === message ? {text: notice, tone: 'warn'} : {text: visible, tone: tone || (notice ? 'warn' : '')};
    paintStatusLine();
  }
  function paintStatusLine() {
    let text = line.text;
    let tone = line.tone;
    if (solved()) { text = ''; tone = ''; }
    else if (coachState && tone !== 'warn') { text = coachState.text; tone = 'coach-line'; }
    $('status-line').textContent = text;
    $('status-line').className = ['status-line', tone].filter(Boolean).join(' ');
  }
  function coordinate(index) { return `(${Math.floor(index / size()) + 1}, ${index % size() + 1})`; }
  function legalMoves() { return solved() ? [] : E.legalMoves(game.board, size()); }
  function chosenMove(moves) {
    return moves.find(move => move.from === selected && move.type === 'ladder');
  }

  function pendingConversion() {
    const last = game.history[game.history.length - 1];
    if (solved() || !last || last.type !== 'ladder' || game.board[last.from] || !game.board[last.to]) return null;
    // A conversion replaces the last mathematical move. Validate the K-ladder
    // against the board BEFORE that move, not as an arbitrary new placement.
    const before = game.board.slice();
    before[last.from] = 1;
    before[last.to] = 0;
    const move = {...last, type: 'k-ladder'};
    try { return {move, board: E.applyMove(before, move, size())}; }
    catch { return null; }
  }

  // Explain exactly why a filled cell has no move.
  function blockedReason(index) {
    const n = size();
    const row = Math.floor(index / n);
    const col = index % n;
    if (row === 0) return 'Cells in the top row cannot move.';
    // Squares right of the staircase count as empty, so only a filled one blocks.
    if (game.board[index + 1]) return 'This cell cannot move: the square to its right is filled.';
    for (let above = row - 1; above >= 0; above -= 1) {
      const left = game.board[above * n + col];
      const right = game.board[above * n + col + 1];
      if (!left && !right) break;
      if (!left || !right) return `This cell cannot move: row ${above + 1} has only one filled square in these two columns.`;
    }
    return 'This cell cannot move: there is no empty pair of squares above it.';
  }

  // A guided first stage for new players, following the paper's construction.
  function coachStep(conversion) {
    if (game.stage !== 1 || meta.stats.cleared > 0 || solved()) return null;
    const n = size();
    const current = game.board.join('');
    let board = E.bottomDream(game.permutation);
    const path = E.maximalPath(game.permutation);
    for (let k = 0; k < path.length; k += 1) {
      const move = path[k];
      if (board.join('') === current) {
        if (selected === move.from) return {index: move.to, text: 'Tap the outlined square to move the cell there.'};
        return {
          index: move.from,
          text: k === 0 ? 'Tap the glowing cell to select it. A dot marks cells that can move.'
            : move.type === 'k-ladder' ? 'Now select the glowing cell. After it moves, you can add a new cell behind it.'
              : 'Select the glowing cell next.'
        };
      }
      if (move.type === 'k-ladder' && conversion && conversion.move.from === move.from &&
          E.applyMove(board, {...move, type: 'ladder'}, n).join('') === current) {
        return {index: move.from, text: `Tap the +${keyboardLikely() ? ' (or press Space)' : ''} to add a cell where it started. That is how the count grows.`};
      }
      board = E.applyMove(board, move, n);
    }
    return {index: null, text: 'This route leaves the tutorial path. Tap Undo to step back, or keep exploring.'};
  }

  function render() {
    rebuildBoard();
    const n = size();
    const count = E.countCells(game.board);
    const maximum = target();
    const won = count === maximum;
    const moves = legalMoves();
    ladderBySource = new Map(moves.filter(move => move.type === 'ladder').map(move => [move.from, move]));
    const landings = new Set([...ladderBySource.values()].map(move => move.to));
    if (previewIndex !== null && !landings.has(previewIndex)) previewIndex = null;
    const choice = chosenMove(moves);
    const conversion = pendingConversion();
    coachState = coachStep(conversion);
    const sameGame = lastRender && lastRender.game === game;
    if (won && sameGame && !lastRender.won) {
      celebrating = true;
      sound('complete');
      buzz([12, 50, 20]);
    }
    if (!won) celebrating = false;
    const countRose = sameGame && count > lastRender.count;
    lastRender = {game, won, count};

    $('stage-number').textContent = String(game.stage).padStart(2, '0');
    $('difficulty-label').textContent = E.patternDifficulty(game.permutation).label;
    $('current-count').textContent = count;
    $('target-count').textContent = maximum;
    if (countRose) restartAnimation($('current-count'), 'bump');
    $('board-score').setAttribute('aria-label', `${count} of ${maximum} cells${won ? ', maximum reached' : ''}`);
    $('board-score').classList.toggle('complete', won);
    renderProgress(count, maximum);
    $('undo-button').disabled = !game.history.length;
    $('redo-button').disabled = !game.redo.length || won;
    $('restart-button').disabled = !game.history.length;
    $('hint-button').disabled = won || hintBusy;
    $('hint-button').classList.toggle('busy', hintBusy);
    $('board').classList.toggle('solved', won);
    $('board').classList.toggle('celebrate', celebrating);
    $('board').classList.toggle('pipes', settings.pipes);

    cells.forEach((cell, index) => {
      const row = Math.floor(index / n);
      const col = index % n;
      const outside = row + col >= n - 1;
      const occupied = Boolean(game.board[index]);
      const movable = ladderBySource.has(index);
      const destination = Boolean(choice && choice.to === index);
      const origin = Boolean(conversion && conversion.move.from === index);
      const preview = previewIndex === index && selected === null;
      cell.className = ['cell', outside && 'outside', occupied && 'occupied',
        movable && 'movable', selected === index && 'selected',
        destination && 'destination', origin && 'k-origin', preview && 'preview',
        justAdded === index && 'just-added', hintSource === index && 'hint-source',
        coachState && coachState.index === index && 'coach'].filter(Boolean).join(' ');
      cell.disabled = outside;
      cell.tabIndex = index === focusIndex && !outside ? 0 : -1;
      cell.setAttribute('aria-pressed', String(selected === index));
      cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}: ${outside ? 'outside the staircase' :
        destination ? `move here${origin ? '; press Escape to add a cell at the original position' : ''}` :
        origin ? 'original position; add a cell here (Space)' :
        occupied ? `filled${movable ? ', can move' : ', no legal move'}${selected === index ? ', selected' : ''}` : 'empty'}`);
      cell.firstElementChild.textContent = '';
    });
    renderOverlay(choice);
    renderBanner(won);
    paintStatusLine();
    syncAutoAdvance();
    runEffect();
  }

  function restartAnimation(element, name) {
    element.classList.toggle(name, false);
    void element.offsetWidth;
    element.classList.toggle(name, true);
  }

  // One small square per cell still to be added; a bar for long stages.
  function renderProgress(count, maximum) {
    const start = E.countCells(E.bottomDream(game.permutation));
    const needed = Math.max(0, maximum - start);
    const done = Math.min(needed, Math.max(0, count - start));
    const container = $('progress-pips');
    const key = `${needed}:${done}`;
    if (container.dataset.key === key) return;
    container.dataset.key = key;
    container.innerHTML = needed <= 16
      ? Array.from({length: needed}, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')
      : `<span class="bar"><b style="width:${(100 * done / needed).toFixed(1)}%"></b></span>`;
  }

  function pipeColor(label, n) {
    return `hsl(${Math.round(((label - 1) * 360) / n + 8)} var(--pipe-s) var(--pipe-l))`;
  }

  // Pipes (optional view) and an arrow for the selected move share one SVG.
  function renderOverlay(choice) {
    const overlay = $('board-overlay');
    const n = size();
    const side = n - 1;
    let markup = '';
    if (settings.pipes) {
      markup += E.pipeLayout(game.board, n).map(pipe =>
        `<path class="pipe" d="${pipe.d}" style="stroke: ${pipeColor(pipe.label, n)}"/>`).join('');
    }
    if (choice) {
      const x1 = choice.fromCol + 0.5;
      const y1 = choice.fromRow + 0.5;
      const x2 = choice.toCol + 0.5;
      const y2 = choice.toRow + 0.5;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / length;
      const uy = (y2 - y1) / length;
      const sx = x1 + ux * 0.3;
      const sy = y1 + uy * 0.3;
      const tx = x2 - ux * 0.3;
      const ty = y2 - uy * 0.3;
      const bx = tx - ux * 0.16;
      const by = ty - uy * 0.16;
      const f = value => value.toFixed(3);
      markup += `<path class="move-arrow" d="M${f(sx)} ${f(sy)}L${f(bx)} ${f(by)}"/>` +
        `<path class="move-arrow-head" d="M${f(tx)} ${f(ty)}L${f(bx - uy * 0.08)} ${f(by + ux * 0.08)}L${f(bx + uy * 0.08)} ${f(by - ux * 0.08)}Z"/>`;
    }
    const key = `${side}|${markup}`;
    if (overlay.dataset.key === key) return;
    overlay.dataset.key = key;
    overlay.setAttribute('viewBox', `0 0 ${side} ${side}`);
    overlay.setAttribute('preserveAspectRatio', 'none');
    overlay.innerHTML = markup;
  }

  function formatTime(ms) {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const pad = value => String(value).padStart(2, '0');
    return minutes >= 60 ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:${pad(seconds % 60)}` : `${minutes}:${pad(seconds % 60)}`;
  }
  function plural(count, word) { return `${count} ${word}${count === 1 ? '' : 's'}`; }

  function renderBanner(won) {
    $('complete-banner').hidden = !won;
    if (!won) return;
    $('complete-title').textContent = `Stage ${game.stage} complete`;
    const hints = meta.current.hints;
    $('complete-stats').textContent = [plural(game.history.length, 'move'), formatTime(meta.current.ms),
      hints ? plural(hints, 'hint') : 'no hints'].join(' · ');
  }

  function rectOf(index) {
    const cell = cells.get(index);
    const piece = cell && cell.firstElementChild;
    return piece && piece.getBoundingClientRect ? piece.getBoundingClientRect() : null;
  }

  function runEffect() {
    const effect = pendingEffect;
    pendingEffect = null;
    if (!effect || reduceMotion()) return;
    const cell = cells.get(effect.index);
    const piece = cell && cell.firstElementChild;
    if (!piece || !piece.animate) return;
    if (effect.type === 'slide') {
      const to = rectOf(effect.index);
      if (!effect.fromRect || !to) return;
      const dx = effect.fromRect.left - to.left;
      const dy = effect.fromRect.top - to.top;
      piece.animate([{transform: `translate(${dx}px, ${dy}px)`}, {transform: 'translate(0, 0)'}],
        {duration: Math.min(460, 200 + Math.hypot(dx, dy) * 0.22), easing: 'cubic-bezier(.2, .85, .25, 1)'});
    } else if (effect.type === 'shake') {
      piece.animate([{transform: 'translateX(0)'}, {transform: 'translateX(-7%)'}, {transform: 'translateX(6%)'},
        {transform: 'translateX(-4%)'}, {transform: 'translateX(2%)'}, {transform: 'translateX(0)'}], {duration: 320, easing: 'ease-out'});
    }
  }

  function cancelAutoAdvance() {
    if (advanceTimer !== null) clearTimeout(advanceTimer);
    advanceTimer = null;
    advanceVersion += 1;
    $('complete-banner').classList.toggle('counting', false);
  }

  function syncAutoAdvance() {
    if (!solved() || dialogOpen()) {
      cancelAutoAdvance();
      return;
    }
    if (advanceTimer !== null) return;
    const completedGame = game;
    const version = advanceVersion;
    $('complete-banner').style.setProperty('--advance-ms', `${ADVANCE_DELAY}ms`);
    restartAnimation($('complete-banner'), 'counting');
    // Show the completed board and its summary before starting the next stage.
    advanceTimer = setTimeout(() => {
      if (version !== advanceVersion || game !== completedGame) return;
      advanceTimer = null;
      if (solved() && !dialogOpen()) newStage();
    }, ADVANCE_DELAY);
  }

  function clearSelection() { selected = null; hintSource = null; justAdded = null; }

  function performMove(move, fromRect = rectOf(move.from)) {
    game.board = E.applyMove(game.board, move, size());
    game.history.push(move);
    game.redo = [];
    clearSelection();
    focusIndex = move.to;
    pendingEffect = {type: 'slide', index: move.to, fromRect};
    sound('move');
    buzz(8);
    save();
    render();
    announce(`Moved from ${coordinate(move.from)} to ${coordinate(move.to)}. Click the + to add a cell at its original position, or move another cell to continue.`,
      '', `Tap the +${keyboardLikely() ? ' (or press Space)' : ''} to add a cell where it started, or move another cell.`);
  }

  function stuckMessage() {
    return !solved() && !legalMoves().length && !pendingConversion();
  }

  // Add a cell at the last move's origin: the ladder becomes a K-ladder.
  function addAtOrigin(conversion) {
    const index = conversion.move.from;
    game.board = conversion.board;
    game.history[game.history.length - 1] = conversion.move;
    game.redo = [];
    clearSelection();
    justAdded = index;
    focusIndex = index;
    if (!solved()) { sound('add'); buzz(12); }
    save();
    render();
    const stuck = stuckMessage();
    announce(solved()
      ? `Stage ${game.stage} complete! You reached the maximum of ${target()} cells. Moving to the next stage.`
      : `Added a cell at ${coordinate(index)}.${stuck ? ' No forward moves remain. Undo or restart to try another route.' : ''}`,
    stuck ? 'No moves left. Undo or restart to try another route.' : '',
    stuck ? 'No moves left from here. Undo or restart to try another route.' : 'Cell added.',
    stuck ? 'warn' : '');
  }

  function selectCell(index) {
    if (swallowDragClick) {
      const stray = Date.now() < swallowDragClick;
      swallowDragClick = 0;
      if (stray) return;
    }
    if (solved()) return;
    tick();
    const move = chosenMove(legalMoves());
    if (move && move.to === index) {
      performMove(move);
      return;
    }
    const conversion = pendingConversion();
    if (conversion && conversion.move.from === index) {
      addAtOrigin(conversion);
      return;
    }
    hintSource = null;
    if (!game.board[index]) {
      render();
      announce('Choose a filled cell first, then tap its outlined destination.', '',
        selected === null ? 'Choose a filled cell with a dot first.' : 'That square is not this cell’s destination. Tap the outlined square.');
      return;
    }
    selected = selected === index ? null : index;
    focusIndex = index;
    const canMove = selected !== null && Boolean(chosenMove(legalMoves()));
    if (selected !== null && !canMove) pendingEffect = {type: 'shake', index};
    render();
    if (selected === null) announce('Selection cleared.', '', '');
    else if (canMove) {
      sound('select');
      announce('Tap the outlined destination to move this cell. Then you can add a cell at its original position.',
        '', 'Tap the outlined square to move this cell.');
    } else {
      sound('invalid');
      announce('This cell cannot move: the square to the right must be empty, with an empty pair above and full pairs in between.',
        '', blockedReason(index), 'warn');
    }
  }

  function undo() {
    if (!game.history.length) return;
    tick();
    const move = game.history.pop();
    const fromRect = move.type === 'ladder' ? rectOf(move.to) : null;
    game.board = game.board.slice();
    game.board[move.to] = 0;
    game.board[move.from] = 1;
    game.redo.push(move);
    clearSelection();
    focusIndex = move.from;
    if (fromRect) pendingEffect = {type: 'slide', index: move.from, fromRect};
    sound('undo');
    save();
    render();
    announce('Last move undone. Try another route.', '', 'Move undone. Redo puts it back.');
  }

  function redo() {
    if (!game.redo.length || solved() || dialogOpen()) return;
    tick();
    const move = game.redo[game.redo.length - 1];
    let board;
    try { board = E.applyMove(game.board, move, size()); }
    catch {
      game.redo = [];
      save();
      render();
      return;
    }
    const fromRect = rectOf(move.from);
    game.redo.pop();
    game.board = board;
    game.history.push(move);
    clearSelection();
    focusIndex = move.to;
    pendingEffect = {type: 'slide', index: move.to, fromRect};
    if (move.type === 'k-ladder') justAdded = move.from;
    if (!solved()) sound(move.type === 'k-ladder' ? 'add' : 'move');
    save();
    render();
    announce(`Redid the move from ${coordinate(move.from)} to ${coordinate(move.to)}${move.type === 'k-ladder' ? ', adding a cell' : ''}.`,
      '', `Move redone${game.redo.length ? ` · ${plural(game.redo.length, 'more move')} to redo` : ''}.`);
  }

  // Restarting is undoable: the moves move onto the redo stack in order.
  function restart() {
    if (!game.history.length) return;
    tick();
    game.redo = game.redo.concat(game.history.slice().reverse());
    game.board = E.bottomDream(game.permutation);
    game.history = [];
    clearSelection();
    sound('undo');
    save();
    render();
    announce('Stage restarted.', '', 'Stage restarted. Redo replays your moves.');
  }

  function recordCompletion() {
    const stats = meta.stats;
    stats.cleared += 1;
    stats.hints += meta.current.hints;
    stats.moves += game.history.length;
    stats.timeMs += Math.round(meta.current.ms);
    stats.bestStage = Math.max(stats.bestStage, game.stage);
    stats.recent = [...stats.recent, {
      stage: game.stage, n: size(), moves: game.history.length, hints: meta.current.hints, ms: Math.round(meta.current.ms)
    }].slice(-30);
  }

  function newStage() {
    if (!solved()) return;
    const previous = {n: size(), tier: E.patternDifficulty(game.permutation).tier};
    // Build the next puzzle first, so a failure cannot count this stage twice.
    const next = freshGame(game.stage + 1, game.seen);
    recordCompletion();
    game = next;
    clearSelection();
    focusIndex = 0;
    startStageClock();
    line = {text: '', tone: ''};
    save();
    render();
    restartAnimation($('board'), 'enter');
    const n = size();
    const tier = E.patternDifficulty(game.permutation).tier;
    announce(`Stage ${game.stage}. Reach ${target()} cells.`, '',
      n > previous.n ? `New ${n - 1}×${n - 1} board! Reach ${target()} cells.`
        : tier > previous.tier ? `Difficulty ${tier} begins. Reach ${target()} cells.`
          : `Stage ${game.stage}: reach ${target()} cells.`);
    cells.get(0).focus();
    prepareNextCatalog();
  }

  function resetStage() {
    if (!$('reset-stage-dialog').open) return;
    game = freshGame(1);
    clearSelection();
    focusIndex = 0;
    startStageClock();
    save();
    render();
    $('reset-stage-dialog').close();
    cells.get(0).focus();
    announce(`Stage reset to 1. Reach ${target()} cells.`);
  }

  // Build the next board size's puzzle catalog in idle slices, so reaching
  // a larger board never pauses the page.
  function prepareNextCatalog() {
    const idle = window.requestIdleCallback ? callback => window.requestIdleCallback(callback, {timeout: 1500})
      : window.setTimeout ? callback => window.setTimeout(callback, 60) : null;
    if (!idle || typeof E.prepareStageCatalog !== 'function') return;
    let nextSize;
    try { nextSize = E.stageSize(game.stage + 1); }
    catch { return; }
    const step = deadline => {
      const remaining = deadline && deadline.timeRemaining ? deadline.timeRemaining() : 10;
      try { if (!E.prepareStageCatalog(nextSize, Math.max(4, Math.min(12, remaining)))) idle(step); }
      catch { /* The catalog is built on demand instead. */ }
    };
    if (!(E.isStageCatalogReady && E.isStageCatalogReady(nextSize))) idle(step);
  }

  async function hint() {
    if (hintBusy || solved() || dialogOpen()) return;
    hintBusy = true;
    tick();
    const hintGame = game;
    const snapshot = game.board.join('');
    announce('Finding a route to the maximum…');
    render();
    // Yield a paint before searching, with a bounded budget for larger boards.
    await new Promise(resolve => setTimeout(resolve, 30));
    if (hintGame !== game || snapshot !== game.board.join('') || dialogOpen()) {
      hintBusy = false;
      render();
      return;
    }
    try {
      const options = {permutation: game.permutation, maxStates: 25000, timeLimitMs: 250};
      const route = board => E.findWinningPath(board, target(), size(), options);
      const conversion = pendingConversion();
      let conversionPath = null;
      let conversionLimited = false;
      // The last origin is still an option even when no ordinary ladders
      // remain. A hint must consider completing this K-ladder first.
      if (conversion) {
        try { conversionPath = route(conversion.board); }
        catch (error) {
          if (error.code !== 'SEARCH_LIMIT') throw error;
          conversionLimited = true;
        }
      }
      if (conversionPath !== null) {
        selected = null;
        hintSource = conversion.move.from;
        focusIndex = conversion.move.from;
        meta.current.hints += 1;
        sound('hint');
        announce(`Click the + at ${coordinate(conversion.move.from)} to add a cell. This lies on a route to the maximum.`,
          '', 'Hint: tap the highlighted + to add a cell.');
        return;
      }
      const path = route(game.board);
      if (path && path.length) {
        const move = path[0];
        selected = move.from;
        hintSource = move.from;
        focusIndex = move.from;
        meta.current.hints += 1;
        sound('hint');
        announce(`Move ${coordinate(move.from)} to ${coordinate(move.to)}.${move.type === 'k-ladder' ? ` Then click the + at ${coordinate(move.from)} to add a cell.` : ' Leave the original cell empty and continue.'}`,
          '', move.type === 'k-ladder' ? 'Hint: move the highlighted cell to the outlined square, then tap + to add a cell.'
            : 'Hint: move the highlighted cell to the outlined square, and leave its old square empty.');
      } else if (conversionLimited) {
        announce('The hint search has not found a route yet. You can keep playing.', 'No hint found yet. You can keep playing.');
      } else {
        announce('This position cannot reach the maximum with forward moves. Undo a move, or restart this stage and try a different route.',
          'No solution from here. Undo or restart.', 'This position cannot reach the maximum. Undo or restart to try another route.', 'warn');
      }
    } catch (error) {
      if (error.code === 'SEARCH_LIMIT') {
        announce('The hint search has not found a route yet. You can keep playing.', 'No hint found yet. You can keep playing.');
      } else {
        announce('The hint could not be calculated. You can keep playing, undo, or restart.', 'Hint unavailable. Try again.');
      }
    } finally {
      hintBusy = false;
      save();
      render();
    }
  }

  function moveFocus(event, index) {
    const n = size();
    const row = Math.floor(index / n), col = index % n;
    let destination = index;
    if (event.key === 'ArrowRight') destination = row * n + Math.min(col + 1, n - row - 2);
    else if (event.key === 'ArrowLeft') destination = row * n + Math.max(col - 1, 0);
    else if (event.key === 'ArrowUp') destination = Math.max(row - 1, 0) * n + col;
    else if (event.key === 'ArrowDown') destination = Math.min(row + 1, n - col - 2) * n + col;
    else if (event.key === 'Home') destination = row * n;
    else if (event.key === 'End') destination = row * n + n - row - 2;
    else return;
    event.preventDefault();
    focusIndex = destination;
    cells.forEach((cell, i) => { cell.tabIndex = i === destination ? 0 : -1; });
    cells.get(destination).focus();
  }

  function rebuildBoard() {
    const n = size();
    const side = n - 1;
    if (cells.size === side * side) return;
    cells.clear();
    previewIndex = null;
    $('board').replaceChildren();
    $('board').style.gridTemplateColumns = `repeat(${side}, minmax(0, 1fr))`;
    $('board').style.gridTemplateRows = `repeat(${side}, minmax(0, 1fr))`;
    $('board').setAttribute('aria-label', `${side} by ${side} pipe dream board`);
    for (let row = 0; row < side; row += 1) {
      for (let col = 0; col < side; col += 1) {
        // Keep the engine's n-wide indices so existing moves and saves still match.
        const index = row * n + col;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.index = index;
        cell.style.setProperty('--wave', row + col);
        const piece = document.createElement('span');
        piece.className = 'piece';
        piece.setAttribute('aria-hidden', 'true');
        cell.append(piece);
        cell.addEventListener('click', () => {
          const handled = tapHandled && tapHandled.index === index && Date.now() < tapHandled.until;
          tapHandled = null;
          if (!handled) selectCell(index);
        });
        cell.addEventListener('keydown', event => moveFocus(event, index));
        $('board').append(cell);
        cells.set(index, cell);
      }
    }
  }

  // Hover previews and drag-to-move, layered on the tap interaction.
  function indexFrom(element) {
    for (let node = element; node && node !== $('board'); node = node.parentElement) {
      if (node.dataset && node.dataset.index !== undefined) return Number(node.dataset.index);
    }
    return null;
  }
  function setPreview(index) {
    if (previewIndex === index) return;
    if (previewIndex !== null && cells.get(previewIndex)) cells.get(previewIndex).classList.toggle('preview', false);
    previewIndex = index;
    if (index !== null && cells.get(index) && selected === null) cells.get(index).classList.toggle('preview', true);
  }
  $('board').addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse' || drag) return;
    const index = indexFrom(event.target);
    const move = index === null ? null : ladderBySource.get(index);
    setPreview(move && selected === null && !solved() ? move.to : null);
  });
  $('board').addEventListener('pointerleave', () => setPreview(null));
  $('board').addEventListener('pointerdown', event => {
    swallowDragClick = 0;
    tapHandled = null;
    touchTap = event.pointerType && event.pointerType !== 'mouse' && event.isPrimary !== false
      ? {index: indexFrom(event.target), pointerId: event.pointerId, x: event.clientX, y: event.clientY} : null;
    if (event.button !== 0 || event.isPrimary === false || solved() || dialogOpen()) return;
    const index = indexFrom(event.target);
    if (index === null || !ladderBySource.has(index)) return;
    drag = {index, move: ladderBySource.get(index), pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false};
  });
  function dragTarget(event) {
    const element = document.elementFromPoint ? document.elementFromPoint(event.clientX, event.clientY) : null;
    return element ? indexFrom(element) : null;
  }
  // A drop succeeds once the dragged square touches the destination square
  // anywhere, or the pointer itself is over it.
  function dropLands(event, pieceRect, destination) {
    if (dragTarget(event) === destination) return true;
    const cell = cells.get(destination);
    if (!cell || !pieceRect) return false;
    const target = cell.getBoundingClientRect();
    return pieceRect.left < target.right && target.left < pieceRect.right &&
      pieceRect.top < target.bottom && target.top < pieceRect.bottom;
  }
  function endDrag(event, cancelled) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;
    if (!current.active) return;
    swallowDragClick = Date.now() + 400;
    const cell = cells.get(current.index);
    const piece = cell.firstElementChild;
    const offset = piece.style.transform;
    const dropRect = piece.getBoundingClientRect();
    piece.style.transform = '';
    cell.classList.toggle('dragging', false);
    if (cells.get(current.move.to)) cells.get(current.move.to).classList.toggle('drop-ready', false);
    const move = chosenMove(legalMoves());
    if (!cancelled && move && move.from === current.index && dropLands(event, dropRect, move.to)) {
      performMove(move, dropRect);
      return;
    }
    if (piece.animate && offset && !reduceMotion()) {
      piece.animate([{transform: offset}, {transform: 'translate(0, 0)'}], {duration: 220, easing: 'cubic-bezier(.2, .85, .25, 1)'});
    }
    announce('Drop the cell on its outlined destination to move it.', '', 'Drop the cell on its outlined square to move it, or tap the square.');
  }
  if (window.addEventListener) {
    window.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.hypot(dx, dy) < 8 || dialogOpen()) return;
        drag.active = true;
        tick();
        selected = drag.index;
        hintSource = null;
        setPreview(null);
        render();
        cells.get(drag.index).classList.toggle('dragging', true);
        sound('select');
      }
      const piece = cells.get(drag.index).firstElementChild;
      piece.style.transform = `translate(${dx}px, ${dy}px)`;
      const destination = cells.get(drag.move.to);
      if (destination) destination.classList.toggle('drop-ready', dropLands(event, piece.getBoundingClientRect(), drag.move.to));
    });
    window.addEventListener('pointerup', event => {
      const tap = touchTap;
      touchTap = null;
      const dragged = Boolean(drag && drag.active && drag.pointerId === event.pointerId);
      endDrag(event, false);
      if (!tap || dragged || tap.pointerId !== event.pointerId || tap.index === null || dialogOpen()) return;
      const cell = cells.get(tap.index);
      if (!cell || cell.disabled || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) return;
      tapHandled = {index: tap.index, until: Date.now() + 700};
      selectCell(tap.index);
    });
    window.addEventListener('pointercancel', event => {
      touchTap = null;
      endDrag(event, true);
    });
    // Another tab (such as the homepage) may change the shared theme.
    window.addEventListener('storage', event => { if (event.key === THEME_KEY) applyTheme(); });
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
  // Time in a hidden tab is not play time.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { lastTick = Date.now(); return; }
    if (document.visibilityState !== 'hidden') return;
    tick();
    lastTick = null;
    // Only the clock changed; every move already saved the game itself.
    writeJSON(META_KEY, meta);
  });

  function closeOnBackdrop(dialog) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog || !dialog.getBoundingClientRect) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  }
  function openDialog(id) {
    $(id).showModal();
    syncAutoAdvance();
  }

  function syncSettingsForm() {
    const theme = themePreference();
    for (const value of ['system', 'light', 'dark']) $(`theme-${value}`).checked = theme === value;
    $('style-tiles').checked = !settings.pipes;
    $('style-pipes').checked = settings.pipes;
    $('sound-toggle').checked = settings.sound;
  }

  $('undo-button').addEventListener('click', undo);
  $('redo-button').addEventListener('click', redo);
  $('restart-button').addEventListener('click', restart);
  $('next-stage-button').addEventListener('click', () => {
    if (solved() && !dialogOpen()) newStage();
  });
  $('leave-game-button').addEventListener('click', event => {
    event.preventDefault();
    leaveAttemptVersion += 1;
    $('leave-game-help').hidden = true;
    $('leave-game-dialog').showModal();
    syncAutoAdvance();
  });
  $('leave-game-no').addEventListener('click', () => $('leave-game-dialog').close());
  $('leave-game-yes').addEventListener('click', () => {
    if (!$('leave-game-dialog').open) return;
    cancelAutoAdvance();
    tick();
    save();
    const attempt = ++leaveAttemptVersion;
    window.close();
    // Directly opened tabs may not be closable by the page. Keep the choice
    // open and offer a manual close without navigating away or losing progress.
    setTimeout(() => {
      if (attempt === leaveAttemptVersion && !window.closed && $('leave-game-dialog').open) {
        $('leave-game-help').hidden = false;
      }
    }, 250);
  });
  $('reset-stage-button').addEventListener('click', () => {
    if ($('settings-dialog').open) $('settings-dialog').close();
    openDialog('reset-stage-dialog');
  });
  $('reset-stage-no').addEventListener('click', () => $('reset-stage-dialog').close());
  $('reset-stage-yes').addEventListener('click', resetStage);
  $('hint-button').addEventListener('click', hint);
  $('rules-button').addEventListener('click', () => openDialog('rules-dialog'));
  $('close-rules').addEventListener('click', () => $('rules-dialog').close());
  $('settings-button').addEventListener('click', () => {
    syncSettingsForm();
    openDialog('settings-dialog');
  });
  $('close-settings').addEventListener('click', () => $('settings-dialog').close());
  for (const value of ['system', 'light', 'dark']) $(`theme-${value}`).addEventListener('change', () => setTheme(value));
  $('style-tiles').addEventListener('change', () => { settings.pipes = false; saveSettings(); render(); });
  $('style-pipes').addEventListener('change', () => { settings.pipes = true; saveSettings(); render(); });
  $('sound-toggle').addEventListener('change', () => {
    settings.sound = Boolean($('sound-toggle').checked);
    saveSettings();
    sound('select');
  });
  for (const id of ['rules-dialog', 'reset-stage-dialog', 'settings-dialog']) $(id).addEventListener('close', syncAutoAdvance);
  $('leave-game-dialog').addEventListener('close', () => {
    leaveAttemptVersion += 1;
    syncAutoAdvance();
  });
  for (const id of ['rules-dialog', 'settings-dialog']) closeOnBackdrop($(id));
  document.addEventListener('keyup', event => {
    if (event.key === ' ' && spaceHandled) { event.preventDefault(); spaceHandled = false; }
  });
  document.addEventListener('keydown', event => {
    if (dialogOpen() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.altKey) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) { event.preventDefault(); redo(); return; }
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); undo(); return; }
    if (event.ctrlKey || event.metaKey) return;
    if (key === 'u' && event.shiftKey) { event.preventDefault(); redo(); return; }
    // Space adds the cell at the green + whenever one is offered, and on a
    // finished board it presses Next stage, wherever focus is. Its keyup is
    // swallowed so no focused button is also pressed. A held key's repeats
    // never skip past a just-finished board.
    if (event.key === ' ' && solved()) {
      event.preventDefault();
      spaceHandled = true;
      if (!event.repeat) newStage();
      return;
    }
    if (event.key === ' ') {
      const conversion = pendingConversion();
      if (conversion) {
        event.preventDefault();
        spaceHandled = true;
        tick();
        addAtOrigin(conversion);
        return;
      }
    }
    const actions = {u: undo, h: hint, r: restart};
    if (actions[key]) { event.preventDefault(); actions[key](); }
    if (key === 'n' && solved()) { event.preventDefault(); newStage(); }
    if (event.key === 'Escape') { clearSelection(); render(); announce('Selection cleared.', '', ''); }
  });

  applyTheme();
  const restoredGame = readSavedGame();
  game = restoredGame || freshGame();
  syncMetaCurrent();
  lastTick = Date.now();
  let firstVisit = !restoredGame;
  try {
    firstVisit = firstVisit && localStorage.getItem(RULES_SEEN_KEY) !== '1';
    localStorage.setItem(RULES_SEEN_KEY, '1');
  } catch { /* The rules still open for a first visit when storage is unavailable. */ }
  save();
  render();
  announce(solved() ? 'Maximum reached! Moving to the next stage.' : game.history.length ? 'Your game is restored. Keep going.' : 'Start with a filled cell. Every stage begins at the bottom pipe dream.',
    '', solved() ? '' : game.history.length ? 'Welcome back. Your game is restored.' : `Reach ${target()} cells. Select a cell with a dot to begin.`);
  if (firstVisit) $('rules-dialog').showModal();
  prepareNextCatalog();
})();
