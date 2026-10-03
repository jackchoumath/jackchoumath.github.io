/*
 * Pipe-dream game mathematics, independent of the interface.
 * Rules and the canonical construction follow Chou–Yu (2024), pp. 2–6:
 * https://www.combinatorics.org/ojs/index.php/eljc/article/view/v31i3p15
 * Coordinates here are zero-based. Crossings lie in r + c < n - 1;
 * the displayed board is nevertheless a full n × n array.
 */
(function (root, factory) {
  "use strict";
  var engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.PipeDreamEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function validatePermutation(permutation) {
    if (!Array.isArray(permutation) || permutation.length < 1) {
      throw new TypeError("A permutation must be a nonempty array.");
    }
    var n = permutation.length;
    var seen = new Set();
    permutation.forEach(function (value) {
      if (!Number.isInteger(value) || value < 1 || value > n || seen.has(value)) {
        throw new RangeError("Use each number from 1 to n exactly once.");
      }
      seen.add(value);
    });
    return n;
  }

  function isPlayableCell(row, col, n) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row + col < n - 1;
  }

  function validateBoard(board, n) {
    if (!Number.isInteger(n) || n < 1 || !Array.isArray(board) || board.length !== n * n) {
      throw new RangeError("The board must have n × n cells.");
    }
    for (var i = 0; i < board.length; i += 1) {
      if (board[i] !== 0 && board[i] !== 1 && board[i] !== false && board[i] !== true) {
        throw new TypeError("Each board cell must be empty or occupied.");
      }
      if (board[i] && !isPlayableCell(Math.floor(i / n), i % n, n)) {
        throw new RangeError("A crossing must lie inside the pipe-dream staircase.");
      }
    }
  }

  function inversionCode(permutation) {
    var n = validatePermutation(permutation);
    return permutation.map(function (value, i) {
      var count = 0;
      for (var j = i + 1; j < n; j += 1) if (permutation[j] < value) count += 1;
      return count;
    });
  }

  function bottomDream(permutation) {
    var code = inversionCode(permutation);
    var n = permutation.length;
    var board = Array(n * n).fill(0);
    code.forEach(function (count, row) {
      for (var col = 0; col < count; col += 1) board[row * n + col] = 1;
    });
    return board;
  }

  // r_i counts deletions from w[i..n] needed for an increasing subsequence
  // that MUST retain w[i]. An unrestricted suffix LIS gives the wrong degree.
  function rajchgotCode(permutation) {
    var n = validatePermutation(permutation);
    var lengths = Array(n).fill(1);
    for (var i = n - 1; i >= 0; i -= 1) {
      for (var j = i + 1; j < n; j += 1) {
        if (permutation[j] > permutation[i]) lengths[i] = Math.max(lengths[i], lengths[j] + 1);
      }
    }
    return lengths.map(function (length, i) { return n - i - length; });
  }

  function maximumCrossings(permutation) {
    return rajchgotCode(permutation).reduce(function (sum, value) { return sum + value; }, 0);
  }

  // Dominant permutations are exactly the permutations with weakly decreasing
  // Lehmer code (equivalently, those avoiding the pattern 132).
  function isDominant(permutation) {
    var code = inversionCode(permutation);
    return code.every(function (value, i) { return i === 0 || code[i - 1] >= value; });
  }

  function is1432Avoiding(permutation) {
    var n = validatePermutation(permutation);
    var smallestBefore = permutation[0];
    for (var j = 1; j < n - 2; j += 1) {
      for (var k = j + 1; k < n - 1; k += 1) {
        if (permutation[k] >= permutation[j]) continue;
        for (var l = k + 1; l < n; l += 1) {
          if (smallestBefore < permutation[l] && permutation[l] < permutation[k]) return false;
        }
      }
      smallestBefore = Math.min(smallestBefore, permutation[j]);
    }
    return true;
  }

  var difficultyPatterns = ["132", "1432", "13254", "14253", "14352", "15243", "15324", "15342", "15432", "24153", "25143", "35142"];
  var patternConstraints = new Map();

  function containsPatternUnchecked(permutation, pattern) {
    var key = pattern.join(",");
    var constraints = patternConstraints.get(key);
    if (!constraints) {
      constraints = pattern.map(function (value, depth) {
        var lower = -1;
        var upper = -1;
        for (var before = 0; before < depth; before += 1) {
          if (pattern[before] < value && (lower === -1 || pattern[before] > pattern[lower])) lower = before;
          if (pattern[before] > value && (upper === -1 || pattern[before] < pattern[upper])) upper = before;
        }
        return [lower, upper];
      });
      patternConstraints.set(key, constraints);
    }
    var chosen = [];
    function search(start, depth) {
      if (depth === pattern.length) return true;
      var lower = constraints[depth][0] === -1 ? -Infinity : chosen[constraints[depth][0]];
      var upper = constraints[depth][1] === -1 ? Infinity : chosen[constraints[depth][1]];
      for (var i = start; i <= permutation.length - (pattern.length - depth); i += 1) {
        var value = permutation[i];
        if (value <= lower || value >= upper) continue;
        chosen[depth] = value;
        if (search(i + 1, depth + 1)) return true;
      }
      return false;
    }
    return search(0, 0);
  }

  function containsPattern(permutation, pattern) {
    validatePermutation(permutation);
    validatePermutation(pattern);
    return containsPatternUnchecked(permutation, pattern);
  }

  function patternDifficulty(permutation) {
    validatePermutation(permutation);
    var patterns = difficultyPatterns.filter(function (pattern) {
      return containsPatternUnchecked(permutation, pattern.split("").map(Number));
    });
    var avoids1432 = patterns.indexOf("1432") === -1;
    var tier = patterns.indexOf("132") === -1 ? 0 : avoids1432 ? 1 : patterns.length;
    return {
      tier: tier,
      band: tier,
      label: tier === 0 ? "Excluded" : "Difficulty " + tier,
      avoids1432: avoids1432,
      patternCount: patterns.length,
      patterns: patterns
    };
  }

  function countCells(board) {
    return board.reduce(function (count, occupied) { return count + (occupied ? 1 : 0); }, 0);
  }

  function makeMove(row, col, destinationRow, type, n) {
    return {
      from: row * n + col,
      to: destinationRow * n + col + 1,
      type: type,
      fromRow: row,
      fromCol: col,
      toRow: destinationRow,
      toCol: col + 1,
      span: row - destinationRow
    };
  }

  // The first non-full row above the source must have BOTH cells empty.
  // A half-filled row blocks the move; it must never be skipped.
  function destinationRow(board, row, col, n, firstRow) {
    if (!board[row * n + col] || board[row * n + col + 1]) return -1;
    for (var above = row - 1; above >= firstRow; above -= 1) {
      var left = board[above * n + col];
      var right = board[above * n + col + 1];
      if (!left && !right) return above;
      if (!left || !right) return -1;
    }
    return -1;
  }

  function collectMoves(board, n) {
    var moves = [];
    for (var row = 1; row < n - 1; row += 1) {
      for (var col = 0; col < n - row - 1; col += 1) {
        var above = destinationRow(board, row, col, n, 0);
        if (above !== -1) {
          moves.push(makeMove(row, col, above, "ladder", n));
          moves.push(makeMove(row, col, above, "k-ladder", n));
        }
      }
    }
    return moves;
  }

  function legalMoves(board, n) {
    n = n === undefined ? 7 : n;
    validateBoard(board, n);
    return collectMoves(board, n);
  }

  function applyUnchecked(board, move) {
    var next = board.slice();
    next[move.to] = 1;
    if (move.type === "ladder") next[move.from] = 0;
    return next;
  }

  function applyMove(board, move, n) {
    n = n === undefined ? 7 : n;
    validateBoard(board, n);
    if (!move || !Number.isInteger(move.from) || !Number.isInteger(move.to) ||
        (move.type !== "ladder" && move.type !== "k-ladder") ||
        !collectMoves(board, n).some(function (candidate) {
      return candidate.from === move.from && candidate.to === move.to && candidate.type === move.type;
    })) throw new RangeError("This ladder move is not legal on the current board.");
    return applyUnchecked(board, move);
  }

  // Read each row right-to-left, top-to-bottom, taking the 0-Hecke product:
  // a crossing (r,c) is s_(r+c+1), and a descent is idempotent.
  function demazurePermutation(board, n) {
    n = n === undefined ? 7 : n;
    validateBoard(board, n);
    var permutation = Array.from({ length: n }, function (_, i) { return i + 1; });
    for (var row = 0; row < n - 1; row += 1) {
      for (var col = n - row - 2; col >= 0; col -= 1) {
        if (!board[row * n + col]) continue;
        var adjacent = row + col;
        if (permutation[adjacent] < permutation[adjacent + 1]) {
          var value = permutation[adjacent];
          permutation[adjacent] = permutation[adjacent + 1];
          permutation[adjacent + 1] = value;
        }
      }
    }
    return permutation;
  }

  // The paper's canonical construction. The final move in every scanned
  // column is a K-ladder; previous moves in that column are ordinary ladders.
  function maximalPath(permutation) {
    var n = validatePermutation(permutation);
    var board = bottomDream(permutation);
    var path = [];
    for (var firstRow = n - 3; firstRow >= 0; firstRow -= 1) {
      for (var col = n - 2; col >= 0; col -= 1) {
        var lastPathIndex = -1;
        for (var row = firstRow + 1; row < n - 1; row += 1) {
          var above = destinationRow(board, row, col, n, firstRow);
          if (above === -1) continue;
          var move = makeMove(row, col, above, "ladder", n);
          board = applyUnchecked(board, move);
          path.push(move);
          lastPathIndex = path.length - 1;
        }
        if (lastPathIndex !== -1) {
          path[lastPathIndex].type = "k-ladder";
          board[path[lastPathIndex].from] = 1;
        }
      }
    }
    return path;
  }

  // Every move strictly increases the sum of occupied (column + 1), so this
  // search is acyclic. Memoization explores each failed board only once.
  // Return null only after proving a position cannot reach the target. A
  // bounded search throws SEARCH_LIMIT when that conclusion is still unknown.
  // Supplying the permutation also allows an immediate canonical continuation.
  function findWinningPath(board, target, n, options) {
    n = n === undefined ? 7 : n;
    options = options || {};
    validateBoard(board, n);
    if (!Number.isInteger(target) || target < 0) throw new RangeError("The target must be a nonnegative integer.");
    var maxStates = options.maxStates === undefined ? Infinity : options.maxStates;
    var timeLimitMs = options.timeLimitMs === undefined ? Infinity : options.timeLimitMs;
    if ((maxStates !== Infinity && (!Number.isInteger(maxStates) || maxStates < 0)) ||
        (timeLimitMs !== Infinity && (!Number.isFinite(timeLimitMs) || timeLimitMs < 0))) {
      throw new RangeError("Search limits must be nonnegative; maxStates must be an integer.");
    }
    var now = typeof performance !== "undefined" && performance.now ? function () { return performance.now(); } : Date.now;
    var deadline = now() + timeLimitMs;
    var visited = 0;
    var canonical = new Map();
    var canonicalPath = [];
    function boardKey(current) {
      return current.map(function (cell) { return cell ? "1" : "0"; }).join("");
    }
    if (options.permutation !== undefined) {
      if (validatePermutation(options.permutation) !== n) throw new RangeError("The hint permutation must match the board size.");
      if (maximumCrossings(options.permutation) === target) {
        canonicalPath = maximalPath(options.permutation);
        var canonicalBoard = bottomDream(options.permutation);
        canonical.set(boardKey(canonicalBoard), 0);
        canonicalPath.forEach(function (move, i) {
          canonicalBoard = applyUnchecked(canonicalBoard, move);
          canonical.set(boardKey(canonicalBoard), i + 1);
        });
      }
    }
    var failed = new Set();
    function search(current, count) {
      if (count === target) return [];
      if (count > target) return null;
      var key = boardKey(current);
      if (canonical.has(key)) return canonicalPath.slice(canonical.get(key));
      if (failed.has(key)) return null;
      if (visited >= maxStates || now() >= deadline) {
        var error = new Error("The hint search reached its limit before determining a solution.");
        error.code = "SEARCH_LIMIT";
        throw error;
      }
      visited += 1;
      var moves = collectMoves(current, n);
      // K-ladders first: they are the only moves that increase the count.
      for (var kind = 0; kind < 2; kind += 1) {
        for (var i = kind === 0 ? 1 : 0; i < moves.length; i += 2) {
          var move = moves[i];
          var rest = search(applyUnchecked(current, move), count + (move.type === "k-ladder" ? 1 : 0));
          if (rest !== null) return [move].concat(rest);
        }
      }
      failed.add(key);
      return null;
    }
    return search(board, countCells(board));
  }

  function randomPermutation(n, rng) {
    n = n === undefined ? 7 : n;
    rng = rng || Math.random;
    if (!Number.isInteger(n) || n < 1) throw new RangeError("n must be a positive integer.");
    var permutation = Array.from({ length: n }, function (_, i) { return i + 1; });
    for (var i = n - 1; i > 0; i -= 1) {
      var sample = rng();
      if (!(sample >= 0 && sample < 1)) throw new RangeError("Random values must be between 0 (included) and 1 (excluded).");
      var j = Math.floor(sample * (i + 1));
      var value = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = value;
    }
    return permutation;
  }

  function randomStage(n, rng) {
    n = n === undefined ? 7 : n;
    if (!Number.isInteger(n) || n < 3) throw new RangeError("Non-dominant stages require n ≥ 3.");
    var permutation;
    // Uniform rejection sampling among all non-dominant permutations.
    for (var attempt = 0; attempt < 10000; attempt += 1) {
      permutation = randomPermutation(n, rng);
      if (!isDominant(permutation)) {
        var board = bottomDream(permutation);
        return {
          n: n,
          permutation: permutation,
          board: board,
          target: maximumCrossings(permutation),
          bottomCount: countCells(board),
          rajcode: rajchgotCode(permutation)
        };
      }
    }
    throw new Error("The random source did not generate a non-dominant permutation.");
  }

  var stageCatalogs = new Map();

  function stageCatalog(n) {
    if (stageCatalogs.has(n)) return stageCatalogs.get(n);
    var catalog = [];
    var keys = new Set();
    function addPermutation(prefix) {
      var key = prefix.join(",");
      if (keys.has(key)) return;
      if (isDominant(prefix)) return;
      keys.add(key);
      var board = bottomDream(prefix);
      var bottomCount = countCells(board);
      var target = maximumCrossings(prefix);
      var additions = target - bottomCount;
      var solutionMoves = maximalPath(prefix).length;
      var setupMoves = solutionMoves - additions;
      var classification = patternDifficulty(prefix);
      catalog.push({
        permutation: prefix,
        key: key,
        bottomCount: bottomCount,
        target: target,
        rajcode: rajchgotCode(prefix),
        additions: additions,
        solutionMoves: solutionMoves,
        setupMoves: setupMoves,
        classification: classification,
        // A secondary estimate within one pattern-count difficulty.
        score: 5 * additions + 3 * setupMoves
      });
    }
    if (n <= 8) {
      function visit(prefix, remaining) {
        if (!remaining.length) { addPermutation(prefix); return; }
        remaining.forEach(function (value, i) {
          visit(prefix.concat(value), remaining.slice(0, i).concat(remaining.slice(i + 1)));
        });
      }
      visit([], Array.from({ length: n }, function (_, i) { return i + 1; }));
    } else {
      // Enumerating n! permutations stops being practical above eight. A
      // fixed seeded sample gives reproducible difficulty pools and bounded work;
      // the player's RNG still chooses randomly among unseen candidates.
      var seed = (0x50495045 ^ n) >>> 0;
      function sampleRandom() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      }
      for (var attempt = 0; attempt < 16384 && catalog.length < 4096; attempt += 1) {
        addPermutation(randomPermutation(n, sampleRandom));
      }
    }
    catalog.sort(function (a, b) { return a.score - b.score || a.key.localeCompare(b.key); });
    stageCatalogs.set(n, catalog);
    return catalog;
  }

  // Grow the board at difficulty boundaries, then every five stages up to 17.
  function stageSize(stage) {
    if (!Number.isInteger(stage) || stage < 1) throw new RangeError("The stage number must be a positive integer.");
    return stage <= 3 ? 5 : stage <= 6 ? 6 : stage <= 10 ? 7 : Math.min(17, 8 + Math.floor((stage - 11) / 5));
  }

  function stageTier(stage) {
    stageSize(stage); // Reuse the stage-number validation.
    return stage <= 3 ? 1 : stage <= 6 ? 2 : stage <= 10 ? 3 : Math.min(12, 4 + Math.floor((stage - 11) / 5));
  }

  function progressiveStage(stage, n, rng, seen) {
    var scheduledSize = stageSize(stage);
    n = n === undefined ? scheduledSize : n;
    rng = rng || Math.random;
    seen = seen || [];
    if (!Number.isInteger(n) || n < 3 || n > 17) throw new RangeError("Progressive stages support sizes 3 through 17.");
    var catalog = stageCatalog(n);
    var seenKeys = new Set(Array.from(seen, function (item) {
      if (Array.isArray(item)) return item.join(",");
      var key = String(item).trim();
      // Old saves used one digit per value, before board sizes reached ten.
      if (/^[1-9]{1,9}$/.test(key)) return key.split("").join(",");
      return key.split(",").map(function (value) { return value.trim(); }).join(",");
    }));
    var requestedTier = stageTier(stage);
    var closestTier = catalog.reduce(function (best, entry) {
      var tier = entry.classification.tier;
      var distance = Math.abs(tier - requestedTier);
      var bestDistance = Math.abs(best - requestedTier);
      return distance < bestDistance || (distance === bestDistance && tier < best) ? tier : best;
    }, catalog[0].classification.tier);
    // Distinct pattern count is primary. Keep the requested difficulty even
    // after its pool has been played; do not switch to a different difficulty
    // merely to avoid a repeat. Smaller explicit size overrides may lack it.
    var pool = catalog.filter(function (entry) { return entry.classification.tier === closestTier; });
    var unseen = pool.filter(function (entry) { return !seenKeys.has(entry.key); });
    var available = unseen.length ? unseen : pool;
    // Within that one classification, increase the move estimate gradually.
    // This estimate never outweighs the number of distinct listed patterns.
    var start = requestedTier === 1 ? 1 : requestedTier === 2 ? 4 : requestedTier === 3 ? 7 : 11 + (requestedTier - 4) * 5;
    var duration = requestedTier <= 2 ? 3 : requestedTier === 3 ? 4 : 5;
    var phase = Math.min(duration - 1, stage - start);
    var minimum = pool[0].score;
    var maximum = pool[pool.length - 1].score;
    var width = (maximum - minimum + 1) / duration;
    var lower = minimum + phase * width;
    var upper = phase === duration - 1 ? maximum + 1 : lower + width;
    var introductory = stage === 1 ? available.filter(function (entry) { return entry.additions === 1 && entry.setupMoves === 1; }) : [];
    var candidates = introductory.length ? introductory : available.filter(function (entry) {
      return entry.score >= lower && entry.score < upper;
    });
    if (!candidates.length) {
      var bestDistance = Infinity;
      available.forEach(function (entry) {
        var distance = entry.score < lower ? lower - entry.score : entry.score >= upper ? entry.score - upper + 1 : 0;
        if (distance < bestDistance) { bestDistance = distance; candidates = [entry]; }
        else if (distance === bestDistance) candidates.push(entry);
      });
    }
    var sample = rng();
    if (!(sample >= 0 && sample < 1)) throw new RangeError("Random values must be between 0 (included) and 1 (excluded).");
    var selected = candidates[Math.floor(sample * candidates.length)];
    return {
      n: n,
      permutation: selected.permutation.slice(),
      board: bottomDream(selected.permutation),
      target: selected.target,
      bottomCount: selected.bottomCount,
      rajcode: selected.rajcode.slice(),
      difficulty: {
        label: selected.classification.label,
        tier: selected.classification.tier,
        band: selected.classification.tier,
        avoids1432: selected.classification.avoids1432,
        patternCount: selected.classification.patternCount,
        patterns: selected.classification.patterns.slice(),
        score: selected.score,
        additions: selected.additions,
        solutionMoves: selected.solutionMoves,
        setupMoves: selected.setupMoves
      }
    };
  }

  return Object.freeze({
    inversionCode: inversionCode,
    bottomDream: bottomDream,
    rajchgotCode: rajchgotCode,
    maximumCrossings: maximumCrossings,
    isDominant: isDominant,
    is1432Avoiding: is1432Avoiding,
    containsPattern: containsPattern,
    patternDifficulty: patternDifficulty,
    isPlayableCell: isPlayableCell,
    countCells: countCells,
    legalMoves: legalMoves,
    applyMove: applyMove,
    demazurePermutation: demazurePermutation,
    maximalPath: maximalPath,
    findWinningPath: findWinningPath,
    randomPermutation: randomPermutation,
    randomStage: randomStage,
    stageSize: stageSize,
    stageTier: stageTier,
    progressiveStage: progressiveStage
  });
});
