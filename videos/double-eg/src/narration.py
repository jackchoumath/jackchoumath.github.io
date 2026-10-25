"""What the narrator says for each caption.

Keys are the captions exactly as the scenes pass them to `cap()`; values are
what is spoken, with the math read aloud.  `[word](/phonemes/)` fixes a
pronunciation (misaki syntax).  tts.py turns each line into audio/<key>.wav.
"""

NARRATION = {
    # ---- Hook
    r"Here is a sum of four simple polynomials.":
        "Here's a sum of four simple polynomials.",
    r"Call $y_i - y_j$ \emph{positive} when $i$ comes before $j$ in this order: $1 \prec 2 \prec 3 \prec \cdots \prec -2 \prec -1 \prec 0$.":
        "Let's call y i minus y j positive when i comes before j in this order: first one, two, three, and so on, and then, at the very end, minus two, minus one, zero.",
    r"Three of the terms are positive. But $y_3 - y_2$ is negative, since $2 \prec 3$.":
        "Three of these terms are positive. But y three minus y two is negative, because two comes before three.",
    r"Yet the very same polynomial is $(y_1-y_0) + (y_3-y_{-1}) + (y_2-y_0)$: every term positive.":
        "And yet, the very same polynomial can be written as y one minus y zero, plus y three minus y sub minus one, plus y two minus y zero. Now every term is positive.",
    r"This is a \emph{double Edelman--Greene coefficient}. Finding such positive formulas in general was an open problem.":
        "This polynomial is a double Edelman-Greene coefficient. Finding positive formulas like this one, in general, was an open problem.",
    r"We will work through this one example from start to finish, following a recent paper.":
        "In this video, we'll work through this one example from start to finish, following a recent paper.",
    # ---- Setup
    r"Our permutation lives in $S_{\mathbb Z}$: bijections of the integers that move only finitely many of them.":
        "Our permutation lives in S sub Z: bijections of the integers that move only finitely many of them.",
    r"Our $w$ sends $-1 \mapsto 1 \mapsto 0 \mapsto -1$ and $2 \mapsto 3 \mapsto 4 \mapsto 2$; every other integer stays put.":
        "Our permutation w sends minus one to one, one to zero, and zero back to minus one. It also cycles two, three and four. Every other integer stays put.",
    r"In one-line notation, $w = [1, -1, 0, 3, 4, 2]$. It moves negative numbers too, so it is not in any $S_n$.":
        "In one-line notation, w is one, minus one, zero, three, four, two. Since it moves negative numbers too, it doesn't live in any S n.",
    r"We draw $w$ as a \emph{bumpless pipedream} on the plane. Here is one, near the origin.":
        "We draw w as a bumpless pipedream on the whole plane. Here's one of them, near the origin.",
    r"Pipe $i$ enters from the right of row $i$ and leaves through the bottom of column $w(i)$.":
        "Pipe i enters from the right of row i, and leaves through the bottom of column w of i.",
    r"Only these six tiles are allowed, and two pipes may cross at most once.":
        "Only these six tiles are allowed, and two pipes can cross at most once.",
    r"Each blank tile in row $i$ and column $j$ contributes the factor $x_i - y_j$.":
        "Each blank tile, in row i and column j, contributes a factor x i minus y j.",
    r"Far to the upper left every pipedream looks alike, but blank tiles can sit arbitrarily high: there are infinitely many.":
        "Far to the upper left, every pipedream looks the same. But blank tiles can sit arbitrarily high up, so there are infinitely many pipedreams.",
    r"Their total weight is the \emph{back stable double Schubert function} $\overleftarrow{\mathfrak S}_w(x;y)$ of Lam, Lee and Shimozono.":
        "Adding up all their weights gives the back stable double Schubert function of w, introduced by Lam, Lee and Shimozono.",
    # ---- Coefficients
    r"When a permutation's only descent is at $0$, its pipedreams never cross and stay above row $0$.":
        "When a permutation's only descent is at zero, its pipedreams never cross, and they stay above row zero.",
    r"Such permutations match partitions: where pipes cross the horizon, step up; where none does, step right.":
        "These permutations correspond to partitions. Read along the horizon: where a pipe crosses, step up, and where none does, step right.",
    r"Their functions are Molev's \emph{double Schur functions} $s_\lambda(x\|y)$, and they form a basis.":
        "Their functions are [Molev's](/mˈOlɛvz/) double Schur functions, s lambda, and they form a basis.",
    r"So every $\overleftarrow{\mathfrak S}_w$ expands in this basis. Setting $x = y$ in the coefficients gives the \emph{double Edelman--Greene coefficients} $j^w_\lambda(y)$.":
        "So every back stable Schubert function expands in this basis. Setting x equal to y in the coefficients gives the double Edelman-Greene coefficients, j w lambda.",
    r"For our $w$, here they all are. (Colours mark three kinds of positive factors; more on that next.)":
        "For our w, here they all are. The colors mark three kinds of positive factors. More on that in a moment.",
    r"We will explain the coefficient of $s_{21}$: $j^w_{(2,1)}(y) = (y_1-y_0)+(y_3-y_{-1})+(y_2-y_0)$.":
        "We'll explain the coefficient of s two one, which is the sum we started with.",
    # ---- Problem
    r"Lam, Lee and Shimozono proved that every $j^w_\lambda(y)$ is a nonnegative combination of products of positive forms.":
        "Lam, Lee and Shimozono proved that every one of these coefficients is a nonnegative combination of products of positive forms.",
    r"Anderson refined this. Positive forms $y_i - y_j$ come in three types:":
        "Anderson refined this. Positive forms y i minus y j come in three types.",
    r"In each term, a type 1 or type 2 factor appears at most once, and a type 3 factor at most twice.":
        "In each term, a type one or type two factor appears at most once, and a type three factor at most twice.",
    r"Both proofs are geometric. The problem: find a formula where this positivity is visible term by term.":
        "Both proofs are geometric. So the problem is to find a formula where this positivity is visible, term by term.",
    r"The paper solves it in five steps. We will follow them on our $w$ and $\lambda = (2,1)$.":
        "The paper solves this in five steps. We'll follow them on our w, with lambda equal to two one.",
    # ---- HorizonCut
    r"Step 1. Cut each pipedream of $w$ along the \emph{horizon}, the line between rows $0$ and $1$.":
        "Step one. Cut each pipedream of w along the horizon: the line between row zero and row one.",
    r"Pipes $0$ and $-1$ cross it in columns $0$ and $1$. Pipes $-2, -3, \ldots$ go straight down their own columns.":
        "Pipes zero and minus one cross it in columns zero and one. Pipes minus two, minus three, and so on, go straight down their own columns.",
    r"Cut there, every pipedream falls into a top piece and a bottom piece.":
        "Cut there, and every pipedream falls apart into a top piece and a bottom piece.",
    r"The cut defines a permutation $\sigma$: pipe $i \le 0$ goes to the column where it crosses, and $1, 2, 3, \ldots$ fill the empty columns in order.":
        "The cut defines a permutation, sigma. Each pipe i, at most zero, goes to the column where it crosses, and one, two, three, and so on fill the empty columns in order.",
    r"Its descents are all at $\le 0$. Write $S_-$ for the set of such permutations.":
        "All its descents are at most zero. We write S minus for the set of such permutations.",
    r"The top pieces are exactly the pipedreams of $\sigma$; their total is $\overleftarrow{\mathfrak S}_\sigma$.":
        "The top pieces are exactly the pipedreams of sigma, so together they give the back stable Schubert function of sigma.",
    r"The bottom pieces run from $\sigma$ at the top to $w$ at the bottom. Their total is the \emph{lower Schubert polynomial} $\mathfrak S^\downarrow_{\sigma,w}$.":
        "The bottom pieces run from sigma at the top to w at the bottom. Together they give the lower Schubert polynomial of sigma and w.",
    r"Every pipedream of $w$ splits in a unique way, so $\overleftarrow{\mathfrak S}_w$ is a sum over $\sigma$ of top times bottom.":
        "Every pipedream of w splits in exactly one way. So the back stable Schubert function of w is a sum over sigma, of top times bottom.",
    r"The bottom piece only involves $x_1, x_2, \ldots$, so it is part of the coefficient. The top piece still needs expanding in double Schur functions.":
        "The bottom piece only involves x one, x two, and so on, so it's part of the coefficient. The top piece still needs to be expanded in double Schur functions.",
    r"For our $w$, exactly five permutations $\sigma$ occur as horizon cuts.":
        "For our w, exactly five permutations sigma show up as horizon cuts.",
    r"For $\lambda = (2,1)$ only $\sigma_1$ and $\sigma_2$ matter: the top pieces of the other three contain no $s_{21}$, so $j^{\sigma}_{21} = 0$.":
        "For lambda equal to two one, only sigma one and sigma two matter. The top pieces of the other three contain no s two one, so their coefficient is zero.",
    # ---- Flip
    r"Step 2. A top piece of $\sigma_1$: its pipes can cross, so it mixes many double Schur functions.":
        "Step two. Here's a top piece of sigma one. Its pipes can cross, so it mixes many double Schur functions together.",
    r"We need the coefficient $j^{\sigma_1}_{21}$ of $s_{21}$ in it.":
        "We need the coefficient of s two one in it.",
    r"Lam, Lee and Shimozono found a symmetry: reflect the integers by $i \mapsto 1 - i$.":
        "Lam, Lee and Shimozono found a symmetry: reflect the integers, sending i to one minus i.",
    r"It turns $\sigma$ into $\neg\sigma(i) = 1 - \sigma(1-i)$. Here $\sigma_1$ swaps $-1$ and $1$, so $\neg\sigma_1$ swaps $2$ and $0$.":
        "This turns sigma into not sigma, where not sigma of i is one minus sigma of one minus i. Here, sigma one swaps minus one and one, so not sigma one swaps two and zero.",
    r"Its descents are now all at $\ge 0$.":
        "Now its descents are all at least zero.",
    r"Partitions get transposed, $\lambda \mapsto \lambda'$ (our $(2,1)$ is its own transpose), and the variables change by $\omega_1 : y_i \mapsto -y_{1-i}$.":
        "Partitions get transposed, so lambda goes to lambda prime, and our two one is its own transpose. The variables change by omega one, which sends y i to minus y sub one minus i.",
    r"So the coefficient we want equals a coefficient for $\neg\sigma$, after substituting.":
        "So the coefficient we want equals a coefficient for not sigma, after this substitution.",
    r"Why this helps: when all descents are $\ge 0$, the top pieces at the horizon can never cross.":
        "Why does this help? When all descents are at least zero, the top pieces at the horizon can never cross.",
    r"Each top piece is then a double Schur function $s_\mu$, and its coefficient is a single bottom piece (Lemma 3.8).":
        "So each top piece is just a double Schur function, s mu, and its coefficient is a single bottom piece.",
    r"Putting it together (Corollary 3.9): both factors are bottom pieces, i.e.\ lower Schubert polynomials.":
        "Putting it together: both factors are bottom pieces, that is, lower Schubert polynomials.",
    r"For $\sigma_1$: one pipedream from $w_{21}$ at the top to $\neg\sigma_1$ at the bottom, with no blank tiles. Its top factor is $1$.":
        "For sigma one, there's a single pipedream from w two one at the top to not sigma one at the bottom, with no blank tiles. So its top factor is one.",
    r"For $\sigma_2$: one pipedream with a single blank tile, at $(1,-1)$. So $y_1 - y_{-1}$, which $\omega_1$ turns into $y_2 - y_0$.":
        "For sigma two, there's again one pipedream, with a single blank tile, at one, minus one. That gives y one minus y sub minus one, which omega one turns into y two minus y zero.",
    r"In general $\omega_1$ turns type 1 forms into type 2 and keeps type 3. So top factors only ever use types 2 and 3.":
        "In general, omega one turns type one forms into type two, and keeps type three. So top factors only ever use types two and three.",
    r"Using the weights of the bottom pieces directly, we get exactly the four terms from the start.":
        "If we use the weights of the bottom pieces directly, we get exactly the four terms from the start.",
    r"The culprit is $y_3 - y_2$ in the bottom piece of $\sigma_1$. Steps 3 to 5 rewrite bottom pieces positively.":
        "The culprit is y three minus y two, in the bottom piece of sigma one. Steps three to five rewrite bottom pieces positively.",
    # ---- DiagonalCut
    r"Step 3. Back to the bottom piece of $\sigma_1$. It consists of exactly three pipedreams.":
        "Step three. Back to the bottom piece of sigma one. It consists of exactly three pipedreams.",
    r"Each has one blank tile. At $x = y$ they give $y_3 - y_2$, $y_2 - y_0$ and $y_1 - y_{-1}$; the first is negative.":
        "Each one has a single blank tile. At x equals y, they give y three minus y two, y two minus y zero, and y one minus y sub minus one. The first one is negative.",
    r"Colour each cell $(i,j)$ by the kind of form $y_i - y_j$ a blank tile there would give.":
        "Let's color each cell i j by the kind of form, y i minus y j, that a blank tile there would give.",
    r"Right of the staircase ($j > i$) we get type 1, in columns $j \le 0$ type 3. The bad blank sits in between.":
        "To the right of the staircase, we get type one. In column zero and to its left, type three. The bad blank sits in between.",
    r"So cut along the staircase, into a \emph{trapezoid} ($j \le i$) and a \emph{triangle} ($j > i$).":
        "So we cut along the staircase, into a trapezoid and a triangle.",
    r"Trapezoid and triangle meet along a boundary $\gamma$, and the bottom piece is a sum over $\gamma$ of trapezoids times triangles (Proposition 3.11).":
        "The trapezoid and the triangle meet along a boundary, gamma. So the bottom piece is a sum over gamma, of trapezoids times triangles.",
    r"Triangle cells only give type 1 forms, each at most once: already positive. Here all three pipedreams share one triangle, with no blank tiles.":
        "Triangle cells only give type one forms, each at most once, so that part is already positive. Here, all three pipedreams share the same triangle, with no blank tiles.",
    r"So everything rests on the trapezoid sum $(x_3 - y_2) + (x_2 - y_0) + (x_1 - y_{-1})$.":
        "So everything rests on the trapezoid sum: x three minus y two, plus x two minus y zero, plus x one minus y sub minus one.",
    # ---- Chains
    r"Step 4. Sottile's \emph{increasing chains} come from the Pieri rule for Schubert polynomials.":
        "Step four. [Sottile's](/sOtˈilz/) increasing chains come from the Pieri rule for Schubert polynomials.",
    r"A step swaps an entry left of a bar with a larger entry right of it, going up exactly one step in Bruhat order.":
        "A single step swaps an entry left of the bar with a larger entry to its right, going up exactly one step in Bruhat order.",
    r"An \emph{increasing $k$-chain} is a run of such swaps whose smaller swapped values increase.":
        "An increasing k chain is a run of such swaps, where the smaller swapped values keep increasing.",
    r"Values right of the bar that stay put are circled. With variable $x_i$, each circled $j$ gives a factor $x_i - y_j$.":
        "Values to the right of the bar that stay put get circled. With variable x i, each circled j gives a factor x i minus y j.",
    r"Now take a trapezoid. Above each of its rows, the pipes' positions form a permutation $u_r$ (Definition 4.8).":
        "Now take a trapezoid. Above each of its rows, the positions of the pipes form a permutation, u sub r.",
    r"Crossing one row of the trapezoid is an increasing chain, so we get a chain sequence from $U$ at the bottom to $W$ at the top.":
        "Crossing one row of the trapezoid is an increasing chain. So we get a sequence of chains, from U at the bottom to W at the top.",
    r"The step across row $i$ uses the variable $x_i$. The blue circles are the same for every trapezoid.":
        "The step across row i uses the variable x i. The blue circles are the same for every trapezoid.",
    r"The one green circle is the blank tile: the value $2$ stays put in the step $x_3$, giving $x_3 - y_2$.":
        "The one green circle is the blank tile. The value two stays put in the step for x three, giving x three minus y two.",
    r"So the weight of the trapezoid, times a fixed product from the blue circles, is the weight of its chain.":
        "So the weight of the trapezoid, times a fixed product from the blue circles, is exactly the weight of its chain.",
    r"All three trapezoids become chains from $U$ to $W$ with bars at $\mathrm{rev}(\alpha) = (2,1,0)$. This is a bijection (Proposition 4.10).":
        "All three trapezoids become chains from U to W, with the bars at positions two, one, zero. And this is a bijection.",
    r"The green circles still say $(x_3 - y_2) + (x_2 - y_0) + (x_1 - y_{-1})$. Nothing has improved yet.":
        "The green circles still give the same three terms. Nothing has improved yet.",
    # ---- Reverse
    r"Step 5. A Pieri identity of Samuel gives a hidden symmetry: permuting the bars together with the variables does not change the sum (Proposition 2.29).":
        "Step five. A Pieri identity of Samuel gives a hidden symmetry: permuting the bars together with the variables doesn't change the sum.",
    r"So count chains from $U$ to $W$ with the bars in increasing order, $\alpha = (0,1,2)$, and the variables $x_1, x_2, x_3$.":
        "So instead, we count chains from U to W with the bars in increasing order, zero, one, two, and the variables x one, x two, x three.",
    r"Again there are three. Their green circles give $x_1 - y_0$, $x_2 - y_2$ and $x_3 - y_{-1}$.":
        "Again, there are three of them. Their green circles give x one minus y zero, x two minus y two, and x three minus y sub minus one.",
    r"The two sums are the same polynomial, written in two ways.":
        "The two sums are the same polynomial, just written in two different ways.",
    r"But now set $x = y$: the middle term vanishes, and the other two are type 3.":
        "But now, set x equal to y. The middle term vanishes, and the other two are type three.",
    r"This always happens (Proposition 4.17): with increasing bars, each chain gives $0$ or a product of distinct type 3 forms.":
        "And this always happens: with increasing bars, each chain gives either zero, or a product of distinct type three forms.",
    # ---- Assemble
    r"Back to Corollary 3.9: the bottom piece of $\sigma_1$ is now $(y_1 - y_0) + (y_3 - y_{-1})$.":
        "Back to our formula. The bottom piece of sigma one is now y one minus y zero, plus y three minus y sub minus one.",
    r"Every term is positive. This is the formula from the very beginning.":
        "Every term is positive. This is the formula from the very beginning.",
    r"In general, every term of the formula is a product of three parts, each with distinct factors.":
        "In general, every term of the formula is a product of three parts, each with distinct factors.",
    r"So type 1 and type 2 forms appear at most once, and type 3 at most twice: Anderson's positivity, now visible term by term.":
        "So type one and type two forms appear at most once, and type three at most twice. That's Anderson's positivity, now visible term by term.",
    r"To recap, the five steps we followed for one example work for every $w \in S_{\mathbb Z}$ and every $\lambda$.":
        "To recap: the five steps we followed for this one example work for every w in S sub Z, and every lambda.",
    # ---- Outro
    r"The details, and the general proofs, are in the paper. Thanks for watching!":
        "The details, and the general proofs, are in the paper. Thanks for watching!",
}
