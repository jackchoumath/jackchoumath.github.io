# Pipe dreams

A static browser puzzle based on Chen-An Chou and Tianyi Yu,
[Constructing Maximal Pipedreams of Double Grothendieck Polynomials](https://www.combinatorics.org/ojs/index.php/eljc/article/view/v31i3p15),
Electronic Journal of Combinatorics 31 (2024), no. 3, Paper 3.15.

## Play

Serve the repository with any static web server and open `/pipe-dreams/`.
The game uses plain HTML, CSS, and JavaScript with no build step or third-party
browser dependencies. It can also be opened directly using `index.html`.

Select an occupied cell marked with a small dot, then select its highlighted
destination to move it; or drag the cell onto its destination (a drop counts
as soon as the dragged square touches the destination square anywhere). A dashed arrow
shows where the selected cell will land, and hovering a movable cell with a
mouse previews its destination. The original position then shows a green +:
click it to add a cell there. Selecting other cells or clicking invalid
positions keeps that option available. Completing another valid ladder leaves
the previous origin empty and replaces the highlight. If a selected move lands
on the previous origin, the landing takes precedence; clear the selection to
use the K-ladder option instead. Both clicks of a K-ladder count as one move.

A status line beneath the board says what to do next and, when a cell cannot
move, exactly why (the square to its right is filled or outside the staircase,
a half-filled row blocks it, or there is no empty pair above). When an added
cell leaves no forward moves below the maximum, a notice suggests Undo or
Restart.

New players get a guided first stage: the next cell to tap glows, following
the paper's construction, until the first stage is cleared. The rules also open
automatically on a first visit and can be reopened at any time.

Undo, Redo, Restart, and Hint help recover from positions that cannot reach the
maximum. Restarting is undoable: the stage's moves go onto the redo stack in
order, so Redo replays them. Reaching the maximum turns the board green in a
wave and shows a summary (moves, active time, hints) with a Next stage button;
the next stage also starts by itself after 2.6 seconds. Opening any dialog
pauses that countdown; undoing or restarting cancels it.

The rules end with the citation of the paper the game is based on.
Settings offers System/Light/Dark appearance (shared with the homepage through
`jack-chou-theme`), a Tiles or Pipes board style, sounds and vibration, and
"Start over from stage 1" behind a Yes/No confirmation. The Pipes style draws
the actual pipe dream, each pipe in its own color: empty cells are pairs of
elbows and filled cells are crossings, except that two pipes cross at most
once. Where two pipes that already crossed meet again at a filled cell, that
cell acts as a bump (the Demazure product convention), so pipe i always leaves
through column w(i).

The top-right X button asks “Leave game?”; Yes saves progress and closes the
game tab, while No or Escape keeps playing. If the browser blocks closing a
directly opened tab, the dialog explains how to close it manually.

Keyboard: arrows navigate the board; Enter or Space selects a cell, except
that Space adds the cell at the green + whenever one is offered and presses
Next stage on a finished board; U or
Ctrl/Cmd+Z undoes; Shift+U, Ctrl+Y, or Ctrl/Cmd+Shift+Z redoes; R restarts; H
shows a hint; N continues after a finished stage; Escape clears a selection or
closes a dialog. Progress, completion records, and settings are saved in this
browser when local storage is available (`pipe-dreams-game-v1`,
`pipe-dreams-meta-v1`, `pipe-dreams-settings-v1`). The game save keeps the original format, with an
added `redo` list that is replayed and validated on load like the history.

On phones held upright the controls move to a labelled bar at the bottom of the
screen; phones turned sideways and tablets keep a compact top bar. The board
stays the largest square that fits, and the layout respects safe areas. Touch
taps act as the finger lifts, so a quick tap on the + right after a move is
never lost, and hover effects apply only to devices that can hover.
Dark mode, reduced motion, and keyboard focus are supported throughout.

## Mathematical conventions

- For a permutation in S_n, the board displays a full (n−1) × (n−1) square grid. Cells outside the staircase
  `r + c < n - 1` in zero-based coordinates stay empty.
- Stages sample non-dominant permutations from S_n within increasing difficulty
  bands, with no repeated permutations before Difficulty 12. Trailing fixed points
  do not distinguish stages: 12543 and 125436 count as the same permutation.
  Difficulty 12 may repeat puzzles while preferring those not recently played.
  Difficulty is the number of distinct contained
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
CommonJS environments. `pipeLayout(board, n)` traces every pipe through the
displayed square for the Pipes style, resolving squares from the bottom row up
so that a filled square whose two pipes already crossed is drawn as a bump. Puzzle catalogs are built in resumable
steps: the interface calls `prepareStageCatalog(n, budgetMs)` during idle time
for the next stage's board size, so reaching a larger board never pauses the
page (the S8 catalog alone takes most of a second to build). `app.js` handles interaction, saved progress, and stage
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

It also checks chunked catalog preparation against synchronous catalogs and
checks all 33,792 S5–S6 pipe layouts: pipes leave in the order of the
Demazure product, each pair crosses at most once, and every filled square is a
crossing or a bounce of exactly two pipes.

Run `node pipe-dreams/interaction.test.js` to check ladder-first play, source
conversion, illegal clicks, hints, undo, saved progress, and move expiry.
It also checks board rebuilding and stage transitions across all supported sizes,
redo and undoable restarts, the completion summary and Next button, the Space
shortcut for adding cells and continuing, completion records, the first-stage
tutorial, blocked-cell and stranded-board feedback, the pipes view, settings,
and the citation at the end of the rules.

Each difficulty group lasts five stages: Difficulty 1 at stages 1–5,
Difficulty 2 at stages 6–10, Difficulty 3 at stages 11–15, and so on.
Difficulty 12 starts at stage 56 and remains the cap for later stages.
Every 1432-avoiding permutation is classified Difficulty 1. Stage 5 is a random
Difficulty 1 permutation in S_5, with no exception to the pattern-based classification.
The first stage has a known two-move solution requiring one additional cell.
Stage 4 is fixed to 14523, starting with four cells and a target of six.
Stage 7 is fixed to 125436 at Difficulty 2, starting with three cells and a
target of seven. Stage 4 uses a 4 × 4 grid; stage 7 uses a 5 × 5 grid. Each fixed
puzzle is reserved out of earlier stages, including its embeddings in larger
symmetric groups. If an older saved run already played an equivalent fixed
puzzle, its fixed stage draws a different unplayed puzzle instead. Other
stages keep their random selection. Saved puzzles retain their progress, and
difficulty is recalculated from the actual permutation.

The first three board sizes last five stages each: 4 × 4 for stages 1–5,
5 × 5 for stages 6–10, and 6 × 6 for stages 11–15. Starting at n=8, each size
lasts ten stages: 7 × 7 for stages 16–25, 8 × 8 for stages 26–35, and so on.
Difficulty still increases every five stages, reaching Difficulty 12 at stage 56
on an 11 × 11 grid (n=12). The displayed side reaches its 16 × 16 cap at stage 106,
with permutations in S_17. Permutation sizes through eight
use complete catalogs; larger sizes use bounded, reproducible samples to keep
puzzle generation fast. Existing saved puzzles retain their permutation and
progress until completion, then adopt the current stage's scheduled size.
All moves, targets, hints, keyboard
navigation, and saved histories still use the actual permutation size; the
engine's n-wide board indices are preserved while rendering only n−1 rows and columns.

The board is the largest square fitting between a compact toolbar and the
status line, centered with side margins when needed. Cell counts, a row of
small squares for the cells still to add, the stage, and its difficulty appear
above it. Squares outside the staircase are shaded so the
playable region is visible at a glance. Controls are icons with hover labels
and accessible names (labelled beneath the icons on phones), and the rules
dialog ends with a list of controls and shortcuts. The rules dialog uses “Moving cells” and “Adding cells,”
with diagrams of adjacent moves and jumps over filled rows. Illegal examples
show a jump blocked by a half-filled row and a destination whose left neighbor
is occupied; outlined sources and striped destinations mark attempted moves.
