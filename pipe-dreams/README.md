# Pipe dreams

A static browser puzzle based on Chen-An Chou and Tianyi Yu,
[Constructing Maximal Pipedreams of Double Grothendieck Polynomials](https://www.combinatorics.org/ojs/index.php/eljc/article/view/v31i3p15),
Electronic Journal of Combinatorics 31 (2024), no. 3, Paper 3.15.

## Play

Serve the repository with any static web server and open `/pipe-dreams/`.
The game uses plain HTML, CSS, and JavaScript with no build step or third-party
browser dependencies. It can also be opened directly using `index.html`.
GitHub Pages can serve this directory as part of the existing personal website.

Select an occupied cell marked with a small dot, then select its highlighted
destination to move it. Its original position now shows a green +:
click it to add a cell there.
Selecting other cells or clicking invalid positions keeps that option available.
Completing another valid ladder leaves the previous origin empty and replaces
the highlight. If a selected move lands on the previous origin, the landing
takes precedence; clear the selection to use the K-ladder option instead.
Both clicks of a K-ladder count as one move; Undo reverses the whole move.
The rules open automatically on a new player's first visit. The Rules button
can reopen them at any time; returning players' saved games open directly.
Undo, Restart, and Hint help recover from positions that cannot reach the maximum
using forward moves. Reaching the maximum cell count automatically starts the
next stage after a brief pause showing the completed board. Opening the rules,
reset confirmation, or leave confirmation pauses that transition; undoing or restarting cancels it.
The reset icon beside the stage number returns to a fresh stage 1 after a
Yes/No confirmation. Choosing No or pressing Escape keeps the current game.
The back-to-website button asks “Leave game?”; Yes returns to the website while
preserving saved progress, and No or Escape keeps playing.

Keyboard: arrows navigate the board; Enter or Space selects a cell; U or
Ctrl/Cmd+Z undoes; H shows a hint; Escape clears a selection
or closes the rules. Progress is saved in this browser when local storage is available.

## Mathematical conventions

- The board displays a full n × n square grid. Cells outside the staircase
  `r + c < n - 1` in zero-based coordinates stay empty.
- Stages sample non-dominant permutations from S_n within increasing difficulty
  bands, avoiding recent repeats. Difficulty is the number of distinct contained
  patterns from `132, 1432, 13254, 14253, 14352, 15243, 15324, 15342, 15432,
  24153, 25143, 35142`, with every 1432-avoiding permutation classified Difficulty 1.
  Occurrence counts and the coefficients in the supplied formula are not used.
  Dominant means 132-avoiding, equivalently weakly decreasing Lehmer code;
  these permutations are excluded entirely.
- The initial bottom pipe dream is left-justified with row lengths equal to the
  permutation's inversion (Lehmer) code.
- A ladder starts at occupied `(r,c)` with `(r,c+1)` empty. Its landing row
  `r' < r` has both `(r',c)` and `(r',c+1)` empty. Both cells in these columns
  must be occupied in every strictly intervening row. The destination is
  `(r',c+1)`. A regular ladder removes the source; a K-ladder retains it.
- The target is the PSW Rajchgot statistic, the sum of the Rajchgot code. Entry `i` is the suffix length
  minus the longest increasing subsequence of that suffix **starting with**
  the entry at `i`.
- Any valid pipe dream attaining the target wins; row/column weights and the
  paper's distinguished maximal arrangement are not imposed as win conditions.
- All move applications are checked by the engine. Saved progress is replayed
  from the bottom pipe dream and discarded if its move history is invalid.
- Restoring a highlighted origin replaces the last ladder with its K-ladder
  counterpart, checked against the board before that ladder. It never adds an
  arbitrary cell, and only the latest ladder is eligible for conversion.

`engine.js` contains independent mathematics and exports to both browser and
CommonJS environments. `app.js` handles interaction, saved progress, and stage
completion. Hints first use a known continuation of the paper's construction,
then search the finite forward move graph with a bounded budget. Exhausting
that budget reports that no hint was found, rather than claiming the position
is unsolvable. An exhaustive failed search reports when undoing or restarting
is needed.

## Verification

Run `node pipe-dreams/engine.test.js` from the repository root. The standard
suite checks all S7 permutations, every S6 board and legal move, illegal moves,
hint paths, and difficulty progression. Add `--exhaustive-s7` to inspect all
2,097,152 S7 staircase boards and 6,330,368 legal transitions, including exact
maximum counts for every permutation.

Run `node pipe-dreams/interaction.test.js` to check ladder-first play, source
conversion, illegal clicks, hints, undo, saved progress, and move expiry.
It also checks board rebuilding and stage transitions across all supported sizes.

Every 1432-avoiding permutation is classified Difficulty 1, regardless of the other
listed patterns it contains. Stages 1–3 draw from these permutations.
Stages 4–6 contain two distinct listed patterns, stages 7–10 contain three,
and stages 11–15 contain four. The target pattern count then increases every
five stages up to twelve at stage 51. The first stage has a known two-move
solution requiring one additional cell. Saved games retain their boards, and
their displayed difficulty is recalculated from the actual permutation.

Board sizes increase alongside the difficulty bands: 5 × 5 for stages 1–3,
6 × 6 for stages 4–6, 7 × 7 for stages 7–10, and 8 × 8 for stages 11–15.
The size then increases every five stages, reaching 17 × 17 at stage 56
and staying there. Sizes through eight use complete permutation catalogs;
larger sizes use bounded, reproducible samples to keep puzzle generation fast.
Existing saved puzzles retain their original size until the player advances
or resets to stage 1. All moves, targets, hints, keyboard
navigation, and saved histories use the actual permutation size.

The board is the largest square fitting beneath a compact toolbar, centered
with side margins when needed. Cell counts and stage appear above it; all
empty squares share the same background. Controls are icons with hover labels
and accessible names. The rules dialog uses “Moving cells” and “Adding cells,”
with diagrams of adjacent moves and jumps over filled rows. Illegal examples
show a jump blocked by a half-filled row and a destination whose left neighbor
is occupied; outlined sources and striped destinations mark attempted moves.
