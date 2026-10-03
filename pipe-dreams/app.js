/* Browser interaction for the Chou–Yu pipe dream game. */
(() => {
  'use strict';
  const E = window.PipeDreamEngine;
  const STORAGE_KEY = 'pipe-dreams-game-v1';
  const RULES_SEEN_KEY = 'pipe-dreams-rules-seen-v1';
  const $ = id => document.getElementById(id);
  const cells = new Map();
  let selected = null;
  let lastAdded = null;
  let hintSource = null;
  let focusIndex = 0;
  let hintBusy = false;
  let advanceTimer = null;
  let advanceVersion = 0;
  let leaveAttemptVersion = 0;
  let game;

  function size() { return game.permutation.length; }

  function freshGame(stage = 1, seen = []) {
    const puzzle = E.progressiveStage(stage, undefined, Math.random, seen);
    return {
      version: 1, stage, permutation: puzzle.permutation, board: puzzle.board,
      history: [], difficulty: puzzle.difficulty,
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
      if (saved.history.length > n * (n - 1) * (n + 1) / 6) return null;
      let board = E.bottomDream(saved.permutation);
      // Validate the complete saved path, not just the number of cells.
      for (const move of saved.history) board = E.applyMove(board, move, saved.permutation.length);
      if (!Array.isArray(saved.board) || board.join('') !== saved.board.join('')) return null;
      return {
        version: 1, stage: saved.stage, permutation: saved.permutation, board,
        history: saved.history,
        difficulty: saved.difficulty && typeof saved.difficulty.label === 'string' ? saved.difficulty : null,
        seen: Array.isArray(saved.seen) ? saved.seen.filter(s => typeof s === 'string').slice(-100) : []
      };
    } catch { return null; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); }
    catch { /* Playing still works when storage is unavailable. */ }
  }

  function target() { return E.maximumCrossings(game.permutation); }
  function solved() { return E.countCells(game.board) === target(); }
  function dialogOpen() {
    return $('rules-dialog').open || $('reset-stage-dialog').open || $('leave-game-dialog').open;
  }
  function announce(message, notice = '') {
    $('status-message').textContent = message;
    $('notice').textContent = notice;
    $('notice').hidden = !notice;
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

  function render() {
    rebuildBoard();
    const n = size();
    const count = E.countCells(game.board);
    const maximum = target();
    const won = count === maximum;
    const moves = legalMoves();
    const movable = new Set(moves.map(move => move.from));
    const choice = chosenMove(moves);
    const conversion = pendingConversion();
    $('stage-number').textContent = String(game.stage).padStart(2, '0');
    $('difficulty-label').textContent = E.patternDifficulty(game.permutation).label;
    $('current-count').textContent = count;
    $('target-count').textContent = maximum;
    $('board-score').setAttribute('aria-label', `${count} of ${maximum} cells${won ? ', maximum reached' : ''}`);
    $('board-score').classList.toggle('complete', won);
    $('undo-button').disabled = !game.history.length;
    $('restart-button').disabled = !game.history.length;
    $('hint-button').disabled = won || hintBusy;
    $('board').classList.toggle('solved', won);

    cells.forEach((cell, index) => {
      const row = Math.floor(index / n);
      const col = index % n;
      const outside = row + col >= n - 1;
      const occupied = Boolean(game.board[index]);
      const destination = Boolean(choice && choice.to === index);
      const origin = Boolean(conversion && conversion.move.from === index);
      cell.className = ['cell', outside && 'outside', occupied && 'occupied',
        movable.has(index) && 'movable', selected === index && 'selected',
        destination && 'destination', origin && 'k-origin',
        lastAdded === index && 'last-added', hintSource === index && 'hint-source'].filter(Boolean).join(' ');
      cell.disabled = outside;
      cell.tabIndex = index === focusIndex && !outside ? 0 : -1;
      cell.setAttribute('aria-pressed', String(selected === index));
      cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}: ${outside ? 'outside the staircase' :
        destination ? `move here${origin ? '; press Escape to add a cell at the original position' : ''}` :
        origin ? 'original position; add a cell here' :
        occupied ? `filled${movable.has(index) ? ', can move' : ', no legal move'}${selected === index ? ', selected' : ''}` : 'empty'}`);
      cell.firstElementChild.textContent = '';
    });
    syncAutoAdvance();
  }

  function cancelAutoAdvance() {
    if (advanceTimer !== null) clearTimeout(advanceTimer);
    advanceTimer = null;
    advanceVersion += 1;
  }

  function syncAutoAdvance() {
    if (!solved() || dialogOpen()) {
      cancelAutoAdvance();
      return;
    }
    if (advanceTimer !== null) return;
    const completedGame = game;
    const version = advanceVersion;
    // Briefly show the completed board and count before starting the next stage.
    advanceTimer = setTimeout(() => {
      if (version !== advanceVersion || game !== completedGame) return;
      advanceTimer = null;
      if (solved() && !dialogOpen()) newStage();
    }, 650);
  }

  function clearSelection() { selected = null; hintSource = null; lastAdded = null; }

  function selectCell(index) {
    if (solved()) return;
    const move = chosenMove(legalMoves());
    if (move && move.to === index) {
      game.board = E.applyMove(game.board, move, size());
      game.history.push(move);
      clearSelection();
      lastAdded = move.to;
      focusIndex = move.to;
      save();
      render();
      announce(`Moved from ${coordinate(move.from)} to ${coordinate(move.to)}. Click the + to add a cell at its original position, or move another cell to continue.`);
      return;
    }
    const conversion = pendingConversion();
    if (conversion && conversion.move.from === index) {
      game.board = conversion.board;
      game.history[game.history.length - 1] = conversion.move;
      clearSelection();
      lastAdded = index;
      focusIndex = index;
      save();
      render();
      announce(solved()
        ? `Stage ${game.stage} complete! You reached the maximum of ${target()} cells. Moving to the next stage.`
        : `Added a cell at ${coordinate(index)}.${!legalMoves().length ? ' No forward moves remain. Undo or restart to try another route.' : ''}`);
      return;
    }
    hintSource = null;
    if (!game.board[index]) {
      announce('Choose a filled cell first, then tap its outlined destination.');
      return;
    }
    selected = selected === index ? null : index;
    focusIndex = index;
    render();
    announce(selected === null ? 'Selection cleared.' : chosenMove(legalMoves())
      ? 'Tap the outlined destination to move this cell. Then you can add a cell at its original position.'
      : 'This cell cannot move: the square to the right must be empty, with an empty pair above and full pairs in between.');
  }

  function undo() {
    if (!game.history.length) return;
    const move = game.history.pop();
    game.board = game.board.slice();
    game.board[move.to] = 0;
    game.board[move.from] = 1;
    clearSelection();
    focusIndex = move.from;
    save();
    render();
    announce('Last move undone. Try another route.');
  }

  function restart() {
    game.board = E.bottomDream(game.permutation);
    game.history = [];
    clearSelection();
    save();
    render();
    announce('Stage restarted.');
  }

  function newStage() {
    if (!solved()) return;
    game = freshGame(game.stage + 1, game.seen);
    clearSelection();
    focusIndex = 0;
    save();
    render();
    announce(`Stage ${game.stage}. Reach ${target()} cells.`);
    cells.get(0).focus();
  }

  function resetStage() {
    if (!$('reset-stage-dialog').open) return;
    game = freshGame(1);
    clearSelection();
    focusIndex = 0;
    save();
    render();
    $('reset-stage-dialog').close();
    cells.get(0).focus();
    announce(`Stage reset to 1. Reach ${target()} cells.`);
  }

  async function hint() {
    if (hintBusy || solved() || dialogOpen()) return;
    hintBusy = true;
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
        announce(`Click the + at ${coordinate(conversion.move.from)} to add a cell. This lies on a route to the maximum.`);
        return;
      }
      const path = route(game.board);
      if (path && path.length) {
        const move = path[0];
        selected = move.from;
        hintSource = move.from;
        focusIndex = move.from;
        announce(`Move ${coordinate(move.from)} to ${coordinate(move.to)}.${move.type === 'k-ladder' ? ` Then click the + at ${coordinate(move.from)} to add a cell.` : ' Leave the original cell empty and continue.'}`);
      } else if (conversionLimited) {
        announce('The hint search has not found a route yet. You can keep playing.', 'No hint found yet. You can keep playing.');
      } else {
        announce('This position cannot reach the maximum with forward moves. Undo a move, or restart this stage and try a different route.', 'No solution from here. Undo or restart.');
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
        const piece = document.createElement('span');
        piece.className = 'piece';
        piece.setAttribute('aria-hidden', 'true');
        cell.append(piece);
        cell.addEventListener('click', () => selectCell(index));
        cell.addEventListener('keydown', event => moveFocus(event, index));
        $('board').append(cell);
        cells.set(index, cell);
      }
    }
  }

  $('undo-button').addEventListener('click', undo);
  $('restart-button').addEventListener('click', restart);
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
    $('reset-stage-dialog').showModal();
    syncAutoAdvance();
  });
  $('reset-stage-no').addEventListener('click', () => $('reset-stage-dialog').close());
  $('reset-stage-yes').addEventListener('click', resetStage);
  $('hint-button').addEventListener('click', hint);
  $('rules-button').addEventListener('click', () => {
    $('rules-dialog').showModal();
    syncAutoAdvance();
  });
  $('close-rules').addEventListener('click', () => $('rules-dialog').close());
  $('rules-dialog').addEventListener('close', syncAutoAdvance);
  $('reset-stage-dialog').addEventListener('close', syncAutoAdvance);
  $('leave-game-dialog').addEventListener('close', () => {
    leaveAttemptVersion += 1;
    syncAutoAdvance();
  });
  $('rules-dialog').addEventListener('click', event => {
    if (event.target === $('rules-dialog')) {
      const bounds = $('rules-dialog').getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('rules-dialog').close();
    }
  });
  document.addEventListener('keydown', event => {
    if (dialogOpen() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.altKey) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); undo(); return; }
    if (event.ctrlKey || event.metaKey) return;
    const actions = {u: undo, h: hint};
    if (actions[key]) { event.preventDefault(); actions[key](); }
    if (event.key === 'Escape') { clearSelection(); render(); announce('Selection cleared.'); }
  });

  const restoredGame = readSavedGame();
  game = restoredGame || freshGame();
  let firstVisit = !restoredGame;
  try {
    firstVisit = firstVisit && localStorage.getItem(RULES_SEEN_KEY) !== '1';
    localStorage.setItem(RULES_SEEN_KEY, '1');
  } catch { /* The rules still open for a first visit when storage is unavailable. */ }
  save();
  render();
  announce(solved() ? 'Maximum reached! Moving to the next stage.' : game.history.length ? 'Your game is restored. Keep going.' : 'Start with a filled cell. Every stage begins at the bottom pipe dream.');
  if (firstVisit) $('rules-dialog').showModal();
})();
