/* Run with a modern Node.js: node pipe-dreams/engine.test.js */
"use strict";
const assert = require("node:assert/strict");
const engine = require("./engine.js");

function* permutations(values, prefix = []) {
  if (!values.length) { yield prefix; return; }
  for (let i = 0; i < values.length; i += 1) {
    yield* permutations(values.slice(0, i).concat(values.slice(i + 1)), prefix.concat(values[i]));
  }
}

function inverse(permutation) {
  const result = Array(permutation.length);
  permutation.forEach((value, i) => { result[value - 1] = i + 1; });
  return result;
}

function avoids132(permutation) {
  for (let i = 0; i < permutation.length; i += 1) {
    for (let j = i + 1; j < permutation.length; j += 1) {
      for (let k = j + 1; k < permutation.length; k += 1) {
        if (permutation[i] < permutation[k] && permutation[k] < permutation[j]) return false;
      }
    }
  }
  return true;
}

// Independent oracle: standardize every four-element subsequence by rank.
function avoids1432(permutation) {
  for (let i = 0; i < permutation.length; i += 1) {
    for (let j = i + 1; j < permutation.length; j += 1) {
      for (let k = j + 1; k < permutation.length; k += 1) {
        for (let l = k + 1; l < permutation.length; l += 1) {
          const values = [permutation[i], permutation[j], permutation[k], permutation[l]];
          const sorted = values.slice().sort((a, b) => a - b);
          if (values.map(value => sorted.indexOf(value) + 1).join("") === "1432") return false;
        }
      }
    }
  }
  return true;
}

const listedPatterns = ["132", "1432", "13254", "14253", "14352", "15243", "15324", "15342", "15432", "24153", "25143", "35142"];
// Independent classification: enumerate all subsequences of each relevant
// length and standardize their values, instead of using constrained search.
function referencePatterns(permutation) {
  const found = new Set();
  function visit(start, chosen, length) {
    if (chosen.length === length) {
      const sorted = chosen.slice().sort((a, b) => a - b);
      found.add(chosen.map(value => sorted.indexOf(value) + 1).join(""));
      return;
    }
    for (let i = start; i <= permutation.length - (length - chosen.length); i += 1) {
      visit(i + 1, chosen.concat(permutation[i]), length);
    }
  }
  for (const length of [3, 4, 5]) visit(0, [], length);
  return listedPatterns.filter(pattern => found.has(pattern));
}

function referenceTier(patterns) {
  return !patterns.includes("132") ? 0 : !patterns.includes("1432") ? 1 : patterns.length;
}

// Independent version of Definition 12: build Rothe, pick rightmost dark
// clouds bottom-to-top, then fill every position above each cloud.
function snowRajcode(permutation) {
  const n = permutation.length;
  const rothe = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (permutation[j] < permutation[i]) rothe[i][permutation[j] - 1] = 1;
    }
  }
  const cloudColumns = new Set();
  const clouds = [];
  for (let row = n - 1; row >= 0; row -= 1) {
    for (let col = n - 1; col >= 0; col -= 1) {
      if (rothe[row][col] && !cloudColumns.has(col)) {
        clouds.push([row, col]);
        cloudColumns.add(col);
        break;
      }
    }
  }
  clouds.forEach(([row, col]) => {
    for (let above = 0; above < row; above += 1) rothe[above][col] = 1;
  });
  return rothe.map(row => row.reduce((a, b) => a + b, 0));
}

// Explicit local conditions, enumerating ALL potential top rows instead of
// using the engine's upward scan, provide a second check of the move rule.
function referenceMoves(board, n) {
  const result = [];
  for (let row = 1; row < n; row += 1) {
    for (let col = 0; col < n - 1; col += 1) {
      const from = row * n + col;
      if (!board[from] || board[from + 1]) continue;
      for (let above = 0; above < row; above += 1) {
        const to = above * n + col + 1;
        if (board[to] || board[to - 1]) continue;
        let fullBridge = true;
        for (let middle = above + 1; middle < row; middle += 1) {
          if (!board[middle * n + col] || !board[middle * n + col + 1]) fullBridge = false;
        }
        if (fullBridge) result.push(`${from}:${to}:ladder`, `${from}:${to}:k-ladder`);
      }
    }
  }
  return result.sort();
}

function boardFromMask(mask, n) {
  const board = Array(n * n).fill(0);
  let bit = 0;
  for (let row = 0; row < n - 1; row += 1) {
    for (let col = 0; col < n - row - 1; col += 1) {
      board[row * n + col] = (mask >>> bit) & 1;
      bit += 1;
    }
  }
  return board;
}

function maskFromBoard(board, n) {
  let mask = 0;
  let bit = 0;
  for (let row = 0; row < n - 1; row += 1) {
    for (let col = 0; col < n - row - 1; col += 1) {
      if (board[row * n + col]) mask |= 1 << bit;
      bit += 1;
    }
  }
  return mask;
}

function applyPath(board, path, n) {
  for (const move of path) board = engine.applyMove(board, move, n);
  return board;
}

const started = Date.now();
assert.deepEqual(engine.inversionCode([4, 6, 1, 7, 3, 5, 2]), [3, 4, 0, 3, 1, 1, 0]);
assert.deepEqual(engine.rajchgotCode([4, 6, 1, 7, 3, 5, 2]), [4, 4, 2, 3, 1, 1, 0]);
assert.equal(engine.maximumCrossings([1, 4, 5, 2, 3]), 6);
// Anchoring matters: [3,1,2] has unrestricted suffix LIS 2, anchored LIS 1.
assert.deepEqual(engine.rajchgotCode([3, 1, 2]), [2, 0, 0]);

let permutationCount = 0;
let canonicalMoveCount = 0;
let dominantCount = 0;
const easyPermutations = [];
const containingPermutations = [];
for (const permutation of permutations([1, 2, 3, 4, 5, 6, 7])) {
  const n = permutation.length;
  const key = permutation.join("");
  let board = engine.bottomDream(permutation);
  assert.deepEqual(engine.demazurePermutation(board, n), permutation, `bottom ${key}`);
  assert.deepEqual(engine.rajchgotCode(permutation), snowRajcode(permutation), `rajcode ${key}`);
  assert.equal(engine.isDominant(permutation), avoids132(permutation), `dominance ${key}`);
  assert.equal(engine.is1432Avoiding(permutation), avoids1432(permutation), `1432 avoidance ${key}`);
  const presentPatterns = referencePatterns(permutation);
  const classification = engine.patternDifficulty(permutation);
  assert.deepEqual(classification.patterns, presentPatterns, `full pattern set ${key}`);
  assert.equal(classification.patternCount, presentPatterns.length);
  assert.equal(classification.tier, referenceTier(presentPatterns));
  assert.equal(classification.band, classification.tier);
  assert.equal(classification.label, classification.tier === 0 ? "Excluded" : `Difficulty ${classification.tier}`);
  for (const pattern of listedPatterns) {
    assert.equal(engine.containsPattern(permutation, pattern.split("").map(Number)), presentPatterns.includes(pattern), `pattern ${pattern} in ${key}`);
  }
  const bottomCount = engine.countCells(board);
  const target = engine.maximumCrossings(permutation);
  if (engine.isDominant(permutation)) {
    dominantCount += 1;
    assert.equal(target, bottomCount);
  } else {
    assert.ok(target > bottomCount, `nontrivial stage ${key}`);
    (avoids1432(permutation) ? easyPermutations : containingPermutations).push(key);
  }

  for (const move of engine.maximalPath(permutation)) {
    const original = board.slice();
    const next = engine.applyMove(board, move, n);
    assert.deepEqual(board, original, `immutable ${key}`);
    assert.deepEqual(engine.demazurePermutation(next, n), permutation, `move permutation ${key}`);
    assert.equal(engine.countCells(next), engine.countCells(board) + (move.type === "k-ladder" ? 1 : 0));
    board = next;
    canonicalMoveCount += 1;
  }
  assert.equal(engine.countCells(board), target, `canonical target ${key}`);
  const rows = Array(n).fill(0);
  const columns = Array(n).fill(0);
  board.forEach((cell, index) => {
    rows[Math.floor(index / n)] += cell;
    columns[index % n] += cell;
  });
  assert.deepEqual(rows, engine.rajchgotCode(permutation), `canonical rows ${key}`);
  assert.deepEqual(columns, engine.rajchgotCode(inverse(permutation)), `canonical columns ${key}`);
  permutationCount += 1;
}
assert.equal(permutationCount, 5040);
assert.equal(dominantCount, 429); // Catalan number C_7.
console.log(`S7: all ${permutationCount} permutations, ${canonicalMoveCount} canonical moves, 429 dominant / 4611 non-dominant passed.`);

// Exhaust every possible crossing diagram in the S6 staircase. Partition by
// its Demazure permutation and independently observe the largest cell count.
const n = 6;
const groups = new Map();
let checkedTransitions = 0;
for (let mask = 0; mask < 1 << (n * (n - 1) / 2); mask += 1) {
  const board = boardFromMask(mask, n);
  const permutation = engine.demazurePermutation(board, n);
  const key = permutation.join("");
  const group = groups.get(key) || { permutation, count: 0, maximum: 0 };
  group.count += 1;
  group.maximum = Math.max(group.maximum, engine.countCells(board));
  groups.set(key, group);
  const moves = engine.legalMoves(board, n);
  assert.deepEqual(moves.map(move => `${move.from}:${move.to}:${move.type}`).sort(), referenceMoves(board, n));
  for (const move of moves) {
    const next = engine.applyMove(board, move, n);
    assert.deepEqual(engine.demazurePermutation(next, n), permutation, `S6 transition mask ${mask}`);
    checkedTransitions += 1;
  }
}

// Reachability from each Bottom must exactly match the independent partition
// of ALL staircase diagrams. This catches missing moves as well as extra ones.
let reachableCount = 0;
for (const { permutation, count, maximum } of groups.values()) {
  assert.equal(engine.maximumCrossings(permutation), maximum, `exhaustive maximum ${permutation}`);
  const bottom = engine.bottomDream(permutation);
  const queue = [bottom];
  const seen = new Set([maskFromBoard(bottom, n)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const board = queue[cursor];
    for (const move of engine.legalMoves(board, n)) {
      const next = engine.applyMove(board, move, n);
      const key = maskFromBoard(next, n);
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  assert.equal(seen.size, count, `complete reachability ${permutation}`);
  reachableCount += seen.size;
}
assert.equal(groups.size, 720);
assert.equal(reachableCount, 32768);
console.log(`S6: all 32,768 diagrams, ${checkedTransitions} legal transitions, all 720 degree maxima, and full Bottom reachability passed.`);

// Solver from every S5 diagram: independently memoize the largest reachable
// count, then require a valid winning path exactly when that count is global.
const bestReachable = new Map();
function reachableMaximum(board) {
  const key = maskFromBoard(board, 5);
  if (bestReachable.has(key)) return bestReachable.get(key);
  let maximum = engine.countCells(board);
  for (const move of engine.legalMoves(board, 5)) {
    maximum = Math.max(maximum, reachableMaximum(engine.applyMove(board, move, 5)));
  }
  bestReachable.set(key, maximum);
  return maximum;
}
let deadEnds = 0;
for (let mask = 0; mask < 1024; mask += 1) {
  const board = boardFromMask(mask, 5);
  const target = engine.maximumCrossings(engine.demazurePermutation(board, 5));
  const path = engine.findWinningPath(board, target, 5);
  assert.equal(path !== null, reachableMaximum(board) === target, `solver mask ${mask}`);
  if (path === null) deadEnds += 1;
  else assert.equal(engine.countCells(applyPath(board, path, 5)), target);
}
console.log(`S5 solver: all 1,024 starting diagrams passed (${deadEnds} positions need Undo/Reset).`);

let seed = 20261002;
function rng() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
for (let i = 0; i < 500; i += 1) {
  const stage = engine.randomStage(7, rng);
  assert.equal(stage.n, 7);
  assert.equal(stage.board.length, 49);
  assert.equal(stage.permutation.length, 7);
  assert.equal(engine.isDominant(stage.permutation), false);
  assert.deepEqual(stage.board, engine.bottomDream(stage.permutation));
  assert.equal(stage.target, engine.maximumCrossings(stage.permutation));
  assert.ok(stage.target > stage.bottomCount);
  const path = engine.findWinningPath(stage.board, stage.target, 7);
  assert.ok(path);
  assert.equal(engine.countCells(applyPath(stage.board, path, 7)), stage.target);
}
assert.throws(() => engine.bottomDream([1, 1, 3]), RangeError);
assert.throws(() => engine.is1432Avoiding([1, 1, 3]), RangeError);
assert.equal(engine.is1432Avoiding([1, 4, 3, 2]), false);
assert.equal(engine.is1432Avoiding([4, 3, 2, 1]), true);
assert.equal(engine.is1432Avoiding([1, 3, 2]), true);
assert.throws(() => engine.applyMove(Array(49).fill(0), { from: 7, to: 1, type: "k-ladder" }), RangeError);
assert.throws(() => engine.legalMoves(Array(49).fill(1)), RangeError);
assert.throws(() => engine.randomStage(2), RangeError);

// Adversarial input and every part of the multi-row ladder condition.
const longLadder = Array(49).fill(0);
longLadder[4 * 7] = 1;
for (let row = 1; row < 4; row += 1) {
  longLadder[row * 7] = 1;
  longLadder[row * 7 + 1] = 1;
}
const longMove = { from: 28, to: 1, type: "ladder" };
assert.ok(engine.legalMoves(longLadder).some(move => move.from === 28 && move.to === 1 && move.span === 4));
assert.equal(engine.countCells(engine.applyMove(longLadder, longMove)), engine.countCells(longLadder));
assert.equal(engine.countCells(engine.applyMove(longLadder, { ...longMove, type: "k-ladder" })), engine.countCells(longLadder) + 1);
for (const badMove of [
  { ...longMove, from: 27 }, // Empty source.
  { ...longMove, from: -1 },
  { ...longMove, from: 49 },
  { ...longMove, from: 28.5 },
  { ...longMove, from: "28" },
  { ...longMove, to: 2 }, // Wrong destination column.
  { ...longMove, to: 8 }, // Occupied destination.
  { ...longMove, to: 42 }, // Outside staircase.
  { ...longMove, to: 49 }, // Outside grid.
  { ...longMove, to: NaN },
  { ...longMove, to: Infinity },
  { ...longMove, type: "copy" },
  { ...longMove, type: "K-ladder" },
  null
]) assert.throws(() => engine.applyMove(longLadder, badMove), RangeError);
for (const blockedCell of [29, 0, 1]) {
  const blocked = longLadder.slice();
  blocked[blockedCell] = 1; // Source's right, top left, or top right.
  assert.throws(() => engine.applyMove(blocked, longMove), RangeError);
}
for (const hole of [14, 15]) {
  const partial = longLadder.slice();
  partial[hole] = 0; // A half-filled bridge row cannot be jumped over.
  assert.throws(() => engine.applyMove(partial, longMove), RangeError);
}
const gap = longLadder.slice();
gap[14] = 0;
gap[15] = 0;
assert.throws(() => engine.applyMove(gap, longMove), RangeError);
assert.ok(engine.legalMoves(gap).some(move => move.from === 28 && move.to === 15));
console.log("Illegal move rejection: invalid indices/types, empty sources, occupied destinations, blocked right/top, partial bridge rows, skipped gaps, and out-of-staircase cells passed.");

// Difficulty counts distinct listed pattern types, not occurrences or their
// order in the list. Avoiding 1432 remains Difficulty 1 even with later patterns.
assert.deepEqual(engine.patternDifficulty([1, 3, 2, 5, 4]), {
  tier: 1, band: 1, label: "Difficulty 1", avoids1432: true,
  patternCount: 2, patterns: ["132", "13254"]
});
const nonPrefixPatterns = engine.patternDifficulty([1, 5, 4, 3, 2]);
assert.deepEqual(nonPrefixPatterns.patterns, ["132", "1432", "15432"]);
assert.equal(nonPrefixPatterns.tier, 3, "a later type counts even when earlier listed types are absent");
assert.equal(engine.patternDifficulty([1, 4, 3, 5, 2]).tier, 3,
  "different sets with the same number of types have the same difficulty");
assert.equal(engine.patternDifficulty([1, 2, 5, 4, 3]).patternCount, 2,
  "multiple occurrences of the same type are counted only once");
assert.throws(() => engine.containsPattern([1, 2, 3], [1, 1]), RangeError);
assert.throws(() => engine.patternDifficulty([1, 1, 3]), RangeError);
assert.equal(engine.containsPattern([1, 3, 2], [1]), true);
assert.equal(engine.containsPattern([1, 3, 2], [1, 4, 3, 2]), false);
assert.deepEqual(engine.patternDifficulty([5, 4, 3, 2, 1]).patterns, []);

// Stage four is a fixed teaching puzzle, even if an older save has seen it.
const stageFourPermutation = [1, 4, 5, 2, 3];
for (const size of [undefined, 5]) {
  for (const sample of [0, 0.17, 0.5, 0.999999]) {
    for (const seen of [[], ["14523"], ["1,4,5,2,3"], [" 1, 4, 5, 2, 3 "],
      [stageFourPermutation.slice()], new Set(["1,4,5,2,3"])]) {
      const stage = engine.progressiveStage(4, size, () => sample, seen);
      assert.deepEqual(stage.permutation, stageFourPermutation, "stage four ignores random choice and seen history");
      assert.equal(stage.n, 5);
      assert.equal(stage.difficulty.tier, 1);
      assert.equal(stage.bottomCount, 4);
      assert.equal(stage.target, 6);
      assert.deepEqual(stage.board, engine.bottomDream(stageFourPermutation));
      assert.equal(engine.countCells(applyPath(stage.board, engine.maximalPath(stage.permutation), 5)), 6);
    }
  }
}
const fixedOriginal = engine.progressiveStage(4, undefined, () => 0);
const fixedCopy = engine.progressiveStage(4, undefined, () => 0);
fixedCopy.permutation[0] = 99;
fixedCopy.board.fill(0);
fixedCopy.rajcode.fill(0);
fixedCopy.difficulty.patterns.push("changed");
assert.deepEqual(engine.progressiveStage(4, undefined, () => 0), fixedOriginal,
  "modifying a returned fixed puzzle cannot corrupt later stages");
const easyS5Keys = [...permutations([1, 2, 3, 4, 5])]
  .filter(permutation => !avoids132(permutation) && avoids1432(permutation))
  .map(permutation => permutation.join(","));
for (let number = 1; number <= 3; number += 1) {
  const seen = [];
  for (let draw = 0; draw < easyS5Keys.length + 1; draw += 1) {
    const key = engine.progressiveStage(number, undefined, rng, seen).permutation.join(",");
    assert.notEqual(key, "1,4,5,2,3", "earlier stages reserve the fixed puzzle, including exhausted pools");
    seen.push(key);
  }
  const onlyReservedUnseen = easyS5Keys.filter(key => key !== "1,4,5,2,3");
  assert.notEqual(engine.progressiveStage(number, 5, () => 0, onlyReservedUnseen).permutation.join(","), "1,4,5,2,3",
    "seen fallback cannot use the reserved stage-four puzzle");
}
for (const size of [3, 6, 7]) {
  assert.equal(engine.progressiveStage(4, size, rng).n, size, "explicit non-five size overrides still apply to stage four");
}
console.log("Fixed stage four: 14523 at Difficulty 1 with 4/6 cells, legal completion, saved-key formats, independent returned data, reservation from earlier stages, and explicit size overrides passed.");

let progressionCount = 0;
for (let run = 0; run < 10; run += 1) {
  const seen = [];
  let previousTier = 0;
  for (let number = 1; number <= 60; number += 1) {
    const stage = engine.progressiveStage(number, undefined, rng, seen);
    const key = stage.permutation.join(",");
    assert.equal(engine.isDominant(stage.permutation), false);
    assert.deepEqual(stage.board, engine.bottomDream(stage.permutation));
    assert.equal(stage.target, engine.maximumCrossings(stage.permutation));
    assert.ok(!seen.includes(key));
    seen.push(key);
    const d = stage.difficulty;
    const independentlyPresent = referencePatterns(stage.permutation);
    assert.deepEqual(d.patterns, independentlyPresent);
    assert.equal(d.patternCount, independentlyPresent.length);
    assert.equal(d.tier, referenceTier(independentlyPresent));
    assert.equal(d.tier, engine.stageTier(number), "scheduled stages must hit the requested classification exactly");
    assert.ok(d.tier >= previousTier, "pattern difficulty never decreases as stages advance");
    previousTier = d.tier;
    assert.equal(d.avoids1432, number <= 4);
    assert.equal(d.label, number <= 4 ? "Difficulty 1" : "Difficulty " + d.patternCount);
    assert.equal(d.score, 5 * d.additions + 3 * d.setupMoves);
    assert.equal(d.additions, stage.target - stage.bottomCount);
    assert.equal(d.solutionMoves, engine.maximalPath(stage.permutation).length);
    if (number === 1) {
      assert.equal(d.additions, 1);
      assert.equal(d.solutionMoves, 2);
    }
    progressionCount += 1;
  }
}
// All avoiding permutations retain Difficulty 1, including those that contain several
// later listed types. A played pool repeats within its correct difficulty.
const easySeen = [];
for (let i = 0; i < easyPermutations.length; i += 1) {
  const stage = engine.progressiveStage(1, 7, rng, easySeen);
  const key = stage.permutation.join("");
  assert.ok(!easySeen.includes(key));
  assert.equal(stage.difficulty.label, "Difficulty 1");
  assert.equal(stage.difficulty.tier, 1);
  easySeen.push(key);
}
assert.equal(engine.progressiveStage(1, 7, rng, easySeen).difficulty.label, "Difficulty 1");
// An undersized explicit override chooses the closest possible pattern count
// and reports that actual classification, never inventing unavailable types.
assert.equal(engine.progressiveStage(100, 3, rng).difficulty.tier, 1);
assert.equal(engine.progressiveStage(100, 5, rng).difficulty.tier, 3);
const extendedSeen = [];
for (let i = 0; i < 300; i += 1) {
  const stage = engine.progressiveStage(100, 13, rng, extendedSeen);
  const key = stage.permutation.join(",");
  assert.ok(!extendedSeen.includes(key));
  assert.equal(stage.difficulty.tier, 12);
  extendedSeen.push(key);
}
assert.throws(() => engine.progressiveStage(0), RangeError);
assert.throws(() => engine.progressiveStage(1, 2), RangeError);
console.log("Pattern difficulty: all 5,040 S7 classifications independently verified; all " + easyPermutations.length + " Difficulty 1 permutations retain their override; " + progressionCount + " stages follow exact distinct-pattern tiers; 300 Difficulty 12 draws avoided repeats.");

// The default progression grows at difficulty boundaries, while callers that
// explicitly supply a size (including restored games) retain that size.
const sizeBoundaries = [[1, 5], [4, 5], [5, 6], [8, 6], [9, 7], [12, 7], [13, 8], [17, 8],
  [18, 9], [22, 9], [23, 10], [27, 10], [28, 11], [32, 11], [33, 12], [37, 12], [38, 13], [42, 13],
  [43, 14], [47, 14], [48, 15], [52, 15], [53, 16], [57, 16], [58, 17], [62, 17], [100, 17]];
for (const [number, size] of sizeBoundaries) {
  assert.equal(engine.stageSize(number), size);
  assert.equal(engine.progressiveStage(number, undefined, rng).n, size);
}
const tierBoundaries = [[1, 1], [4, 1], [5, 2], [8, 2], [9, 3], [12, 3], [13, 4], [17, 4],
  [18, 5], [22, 5], [23, 6], [27, 6], [28, 7], [32, 7], [33, 8], [37, 8], [38, 9], [42, 9],
  [43, 10], [47, 10], [48, 11], [52, 11], [53, 12], [100, 12]];
for (const [number, tier] of tierBoundaries) assert.equal(engine.stageTier(number), tier);
for (const invalid of [0, -1, 1.5, "1", null, NaN, Infinity]) {
  assert.throws(() => engine.stageSize(invalid), RangeError);
  assert.throws(() => engine.stageTier(invalid), RangeError);
  assert.throws(() => engine.progressiveStage(invalid), RangeError);
}
assert.equal(engine.progressiveStage(1, 7, rng).n, 7);
assert.equal(engine.progressiveStage(20, 5, rng).n, 5);
assert.equal(engine.progressiveStage(1, 13, rng).n, 13);
assert.equal(engine.progressiveStage(1, 17, rng).n, 17);
assert.throws(() => engine.progressiveStage(1, 18, rng), RangeError);

let growingStages = 0;
for (let run = 0; run < 10; run += 1) {
  const seen = [];
  let previousBand = 0;
  for (let number = 1; number <= 60; number += 1) {
    const stage = engine.progressiveStage(number, undefined, rng, seen);
    const size = engine.stageSize(number);
    const key = stage.permutation.join(",");
    assert.equal(stage.n, size);
    assert.equal(stage.permutation.length, size);
    assert.equal(stage.board.length, size * size);
    assert.equal(engine.isDominant(stage.permutation), false);
    assert.ok(!seen.includes(key), "growing stages must not repeat permutations");
    seen.push(key);
    assert.deepEqual(stage.rajcode, snowRajcode(stage.permutation), `growing S${size} Rajchgot target`);
    assert.equal(stage.target, stage.rajcode.reduce((sum, value) => sum + value, 0));
    assert.ok(stage.target > stage.bottomCount);
    const d = stage.difficulty;
    assert.equal(d.avoids1432, avoids1432(stage.permutation), `growing S${size} pattern classification`);
    assert.equal(d.avoids1432, number <= 4);
    if (d.avoids1432) assert.equal(d.label, "Difficulty 1");
    assert.equal(d.band, engine.stageTier(number));
    assert.ok(d.band >= previousBand, "larger stages must increase pattern difficulty");
    previousBand = d.band;
    let board = stage.board;
    for (const move of engine.maximalPath(stage.permutation)) {
      board = engine.applyMove(board, move, size);
      assert.deepEqual(engine.demazurePermutation(board, size), stage.permutation);
    }
    assert.equal(engine.countCells(board), stage.target, `growing S${size} canonical solution`);
    if (run === 0) {
      const hintPath = engine.findWinningPath(stage.board, stage.target, size, {
        permutation: stage.permutation, maxStates: 0, timeLimitMs: 0
      });
      assert.ok(hintPath);
      assert.equal(engine.countCells(applyPath(stage.board, hintPath, size)), stage.target);
    }
    growingStages += 1;
  }
}
console.log(`Board growth: size boundaries, explicit size overrides, and ${growingStages} seeded S5–S17 stages passed; legal canonical paths attain independently checked Rajchgot targets.`);

// Sampled catalogs remain stable between fresh engine instances, while stage
// selection still honors randomness and every supported saved-key format.
const freshEngine = (() => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(require.resolve("./engine.js"), "utf8"), sandbox);
  return sandbox.module.exports;
})();
let catalogTime = 0;
const catalogTimes = [];
let largeStages = 0;
for (let size = 9; size <= 17; size += 1) {
  const stageNumber = 18 + (size - 9) * 5;
  const coldStarted = Date.now();
  const first = freshEngine.progressiveStage(stageNumber, size, () => 0.37);
  const coldTime = Date.now() - coldStarted;
  catalogTime += coldTime;
  catalogTimes.push(`S${size}: ${coldTime} ms`);
  assert.equal(first.permutation.join(","), engine.progressiveStage(stageNumber, size, () => 0.37).permutation.join(","));
  const key = first.permutation.join(",");
  for (const savedKey of [key, first.permutation.slice()]) {
    assert.notEqual(engine.progressiveStage(stageNumber, size, () => 0.37, [savedKey]).permutation.join(","), key);
  }
  if (size === 9) {
    assert.notEqual(engine.progressiveStage(stageNumber, size, () => 0.37, [first.permutation.join("")]).permutation.join(","), key);
  }
  const seen = [];
  for (let draw = 0; draw < 100; draw += 1) {
    const stage = engine.progressiveStage(stageNumber, size, rng, seen);
    const stageKey = stage.permutation.join(",");
    assert.ok(!seen.includes(stageKey), `S${size} sampled stages must not repeat`);
    seen.push(stageKey);
    assert.equal(stage.difficulty.avoids1432, false);
    assert.equal(stage.difficulty.tier, engine.stageTier(stageNumber));
    assert.deepEqual(stage.rajcode, snowRajcode(stage.permutation));
    const path = engine.maximalPath(stage.permutation);
    let board = stage.board;
    assert.deepEqual(engine.demazurePermutation(board, size), stage.permutation);
    for (const move of path) {
      board = engine.applyMove(board, move, size);
      assert.deepEqual(engine.demazurePermutation(board, size), stage.permutation);
    }
    assert.equal(engine.countCells(board), stage.target);
    largeStages += 1;
  }
  // A canonical hint must be instant at every construction state, including
  // the state obtained by clicking the pending addition after a normal move.
  const path = engine.maximalPath(first.permutation);
  let board = first.board;
  for (let step = 0; step <= path.length; step += 1) {
    const remaining = engine.findWinningPath(board, first.target, size, {
      permutation: first.permutation, maxStates: 0, timeLimitMs: 0
    });
    assert.deepEqual(remaining, path.slice(step));
    assert.equal(engine.countCells(applyPath(board, remaining, size)), first.target);
    if (step < path.length) {
      const move = path[step];
      if (move.type === "k-ladder") {
        const interim = engine.applyMove(board, { ...move, type: "ladder" }, size);
        interim[move.from] = 1;
        assert.deepEqual(interim, engine.applyMove(board, move, size));
      }
      board = engine.applyMove(board, move, size);
    }
  }
}
const boundedPuzzle = engine.progressiveStage(100, 17, rng);
for (const limits of [{ maxStates: 0 }, { timeLimitMs: 0 }]) {
  assert.throws(() => engine.findWinningPath(boundedPuzzle.board, boundedPuzzle.target, 17, limits),
    error => error.code === "SEARCH_LIMIT", "a search cutoff is unknown, never a false dead end");
}
for (const limits of [{ maxStates: -1 }, { maxStates: 1.5 }, { timeLimitMs: -1 }, { timeLimitMs: NaN }]) {
  assert.throws(() => engine.findWinningPath(boundedPuzzle.board, boundedPuzzle.target, 17, limits), RangeError);
}
assert.equal(engine.findWinningPath(Array(25).fill(0), 1, 5, { maxStates: 1 }), null,
  "a fully explored dead end still returns null");
assert.deepEqual(engine.findWinningPath(Array(25).fill(0), 0, 5, { maxStates: 0, timeLimitMs: 0 }), []);
console.log(`Large boards: ${largeStages} distinct sampled S9–S17 stages and every intermediate canonical hint passed; nine fresh catalogs took ${catalogTime} ms combined (${catalogTimes.join(", ")}). Search cutoffs stay distinct from proven dead ends.`);
console.log(`500 seeded S7 stages and arbitrary-state solver paths passed. Total: ${Date.now() - started} ms.`);

// Optional complete S7 audit, including boards the game does not happen to
// visit. No sampling: every one of the 2^21 staircase subsets is inspected.
if (process.argv.includes("--exhaustive-s7")) {
  const maxima = new Map();
  let transitions = 0;
  for (let mask = 0; mask < 1 << 21; mask += 1) {
    const board = boardFromMask(mask, 7);
    const permutation = engine.demazurePermutation(board, 7);
    const key = permutation.join("");
    maxima.set(key, Math.max(maxima.get(key) || 0, engine.countCells(board)));
    const moves = engine.legalMoves(board, 7);
    assert.deepEqual(moves.map(move => `${move.from}:${move.to}:${move.type}`).sort(), referenceMoves(board, 7));
    for (const move of moves) {
      assert.deepEqual(engine.demazurePermutation(engine.applyMove(board, move, 7), 7), permutation);
      transitions += 1;
    }
  }
  assert.equal(maxima.size, 5040);
  for (const [key, maximum] of maxima) {
    assert.equal(engine.maximumCrossings(key.split("").map(Number)), maximum, `S7 exhaustive degree ${key}`);
  }
  console.log(`S7 exhaustive: all 2,097,152 boards, ${transitions} legal transitions, and all 5,040 degree maxima passed. Total: ${Date.now() - started} ms.`);
}
