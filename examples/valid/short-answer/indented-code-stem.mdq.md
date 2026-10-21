Consider the pseudocode below, which simulates a patch of deforested
Amazon land (in km²) starting at 100 and being halved every year as
regrowth catches up.

    area = 100
    for year in range(3):
        area = area / 2

What is the final value of `area` after the loop finishes?

[short-answer]: 12.5
