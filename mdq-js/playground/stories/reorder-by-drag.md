# Reorder an ordering question by drag

As a student answering an ordering question, I want to drag a line to where it
belongs, with the mouse or a finger, so that I do not click a button once for
every position it moves.

## Acceptance

- Dragging a line and dropping it between two others puts it there.
- Dropping a line on the "Not used" list leaves it out of the answer, and
  dropping an unused line in the answer puts it back where it falls.
- While a line is dragged, a marker shows where it will land, and the "Not
  used" list shows even when it is empty.
- Escape cancels a drag. A click that barely moves is still a click.
- On a touch screen, a line moves only from its handle: a finger on the rest
  of the line scrolls the page.
- The page scrolls while a line is held near the top or bottom of the window.

## Tests

- `e2e/ordering-drag.spec.ts`: every test of the file.
