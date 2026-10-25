"""Narration for the video, one entry per audio segment.

Formulas are written the way they should be spoken.  Words listed in
PRONUNCIATION are replaced by explicit phonemes before synthesis.
"""

PRONUNCIATION = {
    "Bruhat": "bɹuːˈɑː",
    "Sottile": "soʊtˈiːli",
    "Schur": "ʃˈʊɹ",
}

SEGMENTS = {
    # ------------------------------------------------------------ cold open
    "c1": "Take a look at this sum. There are six terms, and each one is a product "
          "of two differences, like {fac} y one minus y two.",
    "c2": "Some of these differences deserve to be called positive, and some negative. "
          "I'll color them {green} green and {red} red, and in a few minutes you'll see the rule. "
          "For now, just notice that the terms are a mix of both.",
    "c3": "But add everything up, {collapse} and the whole expression collapses into a single product. "
          "And both of its factors are {green} green.",
    "c4": "That's no coincidence. A theorem from geometry promises that this always happens. "
          "But geometry only tells us that the total is positive. "
          "It doesn't show us why, term by term.",
    "c5": "Finding a formula where every single term is visibly positive is a classic quest "
          "in algebraic combinatorics. In this video, I want to show you one such problem, "
          "about the double Edelman-Greene coefficients, and how a recent paper solves it.",

    # ------------------------------------------------- Schubert polynomials
    "s1": "Let's start with permutations. A permutation is just a rearrangement of the numbers "
          "one through n, which we write as a list. For example, {ex} two one four three swaps the "
          "first two numbers, {swap2} and the last two.",
    "s2": "To every permutation w, there's a polynomial called the Schubert polynomial. "
          "These come from geometry, where they describe the cohomology of flag varieties. "
          "But today, we only need their combinatorics.",
    "s3": "In fact, we'll use double Schubert polynomials, which have two sets of variables, "
          "the x's and the y's. Every term is a product of differences, {xy} x i minus y j. "
          "Here is the one for two one four three.",
    "s4": "Where do these terms come from? There's a beautiful picture for that, called pipe dreams.",

    # ---------------------------------------------------------- pipe dreams
    "p1": "Take a staircase shaped grid. In each square, place one of two tiles: "
          "{cross} a cross, or {bump} a pair of bumping elbows.",
    "p2": "Pipes enter from the left, one in each row, and travel until they leave through the top. "
          "{target} We want the pipe entering row i to exit at column w of i. "
          "And there's one rule: {rule} two pipes may never cross twice.",
    "p3": "For the permutation one three two, there are exactly two such pipe dreams.",
    "p4": "Each cross in row i and column j contributes a factor, x i minus y j. "
          "So the first pipe dream gives {w1} x one minus y two, and the second gives {w2} x two minus y one. "
          "{sum} Their sum is the double Schubert polynomial.",
    "p5": "For two one four three, there are three pipe dreams, "
          "matching the three terms we saw before.",

    # -------------------------------------------------- bumpless pipe dreams
    "b1": "There's a second, very different picture, found by Lam, Lee, and Shimozono: "
          "bumpless pipe dreams.",
    "b2": "Now the grid is a square. {flow} Pipes enter from the bottom and leave through the right side, "
          "using {tiles} these six tiles. There's no bumping tile anymore, but there is {empty} an empty one.",
    "b3": "Again, no two pipes may cross twice. And this time, the weight comes from the empty "
          "squares. An empty square in row i and column j gives x i minus y j.",
    "b4": "For one three two, there are again two diagrams. "
          "They give {w1} x two minus y two, and {w2} x one minus y one.",
    "b5": "Different terms, but the same total! Both pictures compute the same polynomial. "
          "Keep this little miracle in mind. It will come back later as one of our tools.",

    # ----------------------------------------------------------- back-stable
    "k1": "Next, Lam, Lee, and Shimozono asked: what happens if we keep adding fixed points "
          "to the front of a permutation?",
    "k2": "Put a new number in front of one three two, and shift the labels so that the new "
          "number is called zero. {grow} The grid grows by one row and one column, and there's {new} a new "
          "diagram, with an empty square at position zero, zero.",
    "k3": "So the polynomial picks up a new term, x zero minus y zero. "
          "{again} Do it again, and we pick up x minus one, minus y minus one.",
    "k4": "Repeat this forever. {limit} In the limit, we get the back-stable double Schubert polynomial. "
          "For one three two, it's x two minus y two, plus x one minus y one, "
          "plus the sum of x i minus y i, over every i up to zero.",
    "k5": "So now our variables are indexed by all the integers, "
          "and the grid stretches infinitely far up and to the left.",

    # ---------------------------------------------------------- double Schur
    "d1": "Some back-stable polynomials are special. The double Schur functions, introduced by "
          "Molev, have their own bumpless pipe dream formula, where everything happens above the "
          "line between row zero and row one.",
    "d2": "They're indexed by partitions. To see why, {look} look at where the pipes cross that line. "
          "Reading from left to right, {up} each pipe tells us to step up, and {right} each gap tells us to step "
          "right. Far to the left, every column has a pipe, and far to the right, none do. "
          "So the path traces out {young} a Young diagram: the partition, lambda.",
    "d3": "Just like ordinary Schur functions, double Schur functions form a basis. "
          "{expand} So we can expand any back-stable double Schubert polynomial in terms of them, "
          "and the coefficients are polynomials in x and y.",
    "d4": "Now, set every x i equal to y i. {left} What's left are polynomials in the y variables alone. "
          "{name} These are the double Edelman-Greene coefficients.",
    "d5": "When all the y's are zero, they become the classical Edelman-Greene coefficients, "
          "which count certain tableaux. So those are nonnegative integers. "
          "What can we say about the double version?",

    # ---------------------------------------------------------- positivity
    "t1": "Lam, Lee, and Shimozono proved a positivity theorem. Every double Edelman-Greene "
          "coefficient is a polynomial with nonnegative integer coefficients, in the differences "
          "y i minus y j, where i comes before j, in a peculiar order.",
    "t2": "Here is the order. Take the integers, and {pull} pull all the positive ones to the front. "
          "{first} First comes one, then two, then three, and so on forever. "
          "{rest} Only after all of them come the rest: minus two, minus one, and zero at the very end.",
    "t3": "So y one minus y three is positive, since one comes before three. "
          "y three minus y zero is positive too. "
          "But y two minus y one is negative, since two comes after one.",
    "t4": "This explains the colors from the beginning. That six term sum was the coefficient "
          "for w equals one four three two, with lambda a single box. "
          "Its value is y one minus y three, times y three minus y zero.",
    "t5": "But their proof is geometric. So they asked for a combinatorial proof: "
          "a formula where every single term is visibly positive. That's the problem.",

    # ------------------------------------------------------------- weapons
    "w1": "The solution uses three weapons, each forged in earlier work. "
          "A sword, from Lam, Lee, and Shimozono. A pair of glasses, from Lenart and Sottile. "
          "And a gauntlet, from Samuel. Let's pick them up, one at a time.",

    # --------------------------------------------------------------- sword
    "x1": "First, the sword. Its power is to cut bumpless pipe dreams into pieces.",
    "x2": "Here's a bumpless pipe dream for the back-stable version of two one four three. "
          "Let's cut it along the line between row zero and row one.",
    "x3": "The top piece is exactly a diagram for a double Schur function, "
          "and the pipes crossing the cut spell out lambda. Here, lambda is a single box.",
    "x4": "The bottom piece is a rectangle. Summing over all the rectangles with the same top "
          "boundary gives the coefficient of the double Schur function. "
          "And once we set x equal to y, each empty square in row i and column j "
          "contributes y i minus y j.",
    "x5": "For two one four three, and lambda a single box, there are four rectangles. "
          "One has an empty square on the diagonal, which gives y three minus y three, which is zero. "
          "The others give {r2} y one minus y two, {r3} y two minus y one, and {r4} y one minus y zero.",
    "x6": "So the coefficient is y one minus y zero. Positive, as promised. "
          "But look at the terms. There's a red one, and it cancels against a green one. "
          "This formula is not positive term by term.",
    "x7": "Where do red squares come from? Let's color the rectangle by the sign of each square. "
          "Above the diagonal, j is bigger than i, so every square is green. "
          "To the left of column one, j is at most zero, so those are green too. "
          "The trouble lives only in the lower left corner, where j is positive, but smaller than i.",
    "x8": "So let's swing the sword a second time, along the diagonal. "
          "The rectangle splits into a trapezoid on the left, and a triangle on the right. "
          "The coefficient becomes a sum over the ways pipes cross the diagonal, "
          "of a trapezoid part times a triangle part.",
    "x9": "The triangle part is always positive, so all the difficulty is in the trapezoids. "
          "In our example, the red term and one green term share the same trapezoid boundary. "
          "Together, they add up to y two minus y zero. Positive! But only after adding.",
    "x10": "So here's the real question. Why is every trapezoid sum positive? "
           "And can we see it, term by term?",

    # ------------------------------------------------------------- glasses
    "g1": "Time for the glasses. With them, Lenart and Sottile could see pipes as chains, "
          "in the Bruhat order.",
    "g2": "The Bruhat order compares permutations. We go up one step by swapping two entries, "
          "where the smaller one comes first, as long as no entry between them has a value in between. "
          "Here's the Bruhat order on permutations of three.",
    "g3": "Now draw a bar after position k. An increasing k chain is a sequence of such swaps, "
          "each one swapping a number left of the bar with a number right of the bar, "
          "where the smaller numbers being swapped keep increasing.",
    "g4": "For example, start from four one three, bar, two seven six five. "
          "{sw1} We swap one and two, {sw2} then four and six, {sw3} then six and seven. "
          "{small} The smaller numbers are one, four, and six. They increase, so this is an increasing three chain.",
    "g5": "Each chain gets a weight. Look to the right of the bar, at the entries that end where they "
          "started. Each fixed entry, with value v, contributes a factor z minus y v, "
          "where z is a variable we attach to the chain.",
    "g6": "The theorem of Lenart and Sottile says that pipe dreams correspond exactly to sequences of "
          "chains: a one chain, then a two chain, and so on, all the way up to the longest permutation, "
          "labeled by x one, x two, and so on. And the weights match.",
    "g7": "For one three two, the two pipe dreams become these two chain sequences, "
          "with weights {w1} x one minus y two, and {w2} x two minus y one.",
    "g8": "Yu found the same kind of picture for bumpless pipe dreams, except the labels run "
          "in the opposite order. Here, they give {w1} x two minus y two, and {w2} x one minus y one.",
    "g9": "And the glasses work for trapezoids too. Here's a trapezoid boundary with exactly "
          "three fillings. Their weights are {t1} y three minus y two, {t2} y two minus y zero, and {t3} y one minus "
          "y minus one. The first one is red.",
    "g10": "Through the glasses, reading from the bottom row to the top, each filling becomes a "
           "sequence of chains, labeled y three, then y two, then y one. The empty square becomes "
           "the yellow entry. The green entries come from the triangle, and get divided away.",

    # ------------------------------------------------------------ gauntlet
    "h1": "The final weapon is the gauntlet of Samuel. Its power is to swap the labels in a "
          "sequence of chains.",
    "h2": "Samuel showed that if you sum over all chains, an a chain followed by a b chain gives the "
          "same total as a b chain followed by an a chain. So the labels can be reordered freely, "
          "without changing the sum.",
    "h3": "We've already seen this in action! Pipe dreams read the labels in increasing order, "
          "and bumpless pipe dreams read them in decreasing order. "
          "The gauntlet explains why both pictures always give the same polynomial.",
    "h4": "Now let's put on the gauntlet, and reverse the labels of our trapezoid chains: "
          "y one first, then y two, then y three.",
    "h5": "There are still three chain sequences, and the total hasn't changed. "
          "But now, the weights are {t1} y three minus y minus one, then {t2} y two minus y two, which is zero, "
          "and {t3} y one minus y zero. Every term is green, or zero!",

    # ------------------------------------------------------------- theorem
    "m1": "And that's no accident. The key proposition: after reversing the labels, each chain "
          "sequence coming from a trapezoid has weight either zero, or a product of factors "
          "y i minus y j, where i is positive and j is at most zero. Every such factor is positive.",
    "m2": "So let's put the three weapons together. The sword cuts each coefficient into trapezoids "
          "and triangles. The glasses turn trapezoids into chains. And the gauntlet reverses their "
          "labels. The result is a formula for the double Edelman-Greene coefficients where every "
          "single term is positive.",
    "m3": "This is exactly the combinatorial proof that Lam, Lee, and Shimozono asked for. "
          "And the same formula even works for permutations of all the integers, "
          "giving a combinatorial proof of a positivity theorem of Anderson.",

    # --------------------------------------------------------------- outro
    "o1": "There's more to explore. Is there a K-theory version? What about triple "
          "Edelman-Greene coefficients? And could the glasses and the gauntlet shed light on "
          "Schubert structure constants, one of the central open problems in the field?",
    "o2": "If you'd like the details, the paper is on the archive. Thanks for watching!",
}
