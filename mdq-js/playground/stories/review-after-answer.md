# Review after an answer

As a student, after I answer a multiple choice question and the exam is
graded, I want to see which choice I picked, whether it was right, and which
choice was the key, so that I learn from the mistake.

## Acceptance

- The picked choice shows the "incorrect" mark when it is wrong.
- The correct choice shows the "correct" mark.
- The feedback of the picked choice is visible.

## Tests

- `e2e/workbench.spec.ts`: "a wrong answer shows its mark and the key in
  review".
