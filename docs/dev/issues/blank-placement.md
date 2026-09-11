# Where fill-in blanks may appear

## The `[^` carve-out

generic.md rejects a paragraph that starts with `[` unless it is the first
paragraph, so that a bracket-led block is never mistaken for a body. A fill-in
stem may legitimately open with a blank (`[^capital] is the capital of
Brazil.`), so the rule now carves out `[` immediately followed by `^`.

Implementation consequence: the carve-out is written on the *reference* form
`[^slug]`, but the *definition* form `[^slug]:` shares the same prefix. A
definition is body content, not preamble, and the two are told apart only by
the trailing colon. The preamble scanner must therefore not treat "starts with
`[^`" as "is prose" -- it has to look past the slug for a `:`, and hand the
block to the body when it finds one. Getting this wrong swallows every blank
definition into the preamble and leaves the question with no body.

Related: if a footnote plugin is ever enabled on the markdown-it instance, it
will claim `[^slug]:` blocks before we see them.

## Open question: blanks outside paragraphs

The spec says a fill-in stem is `inline_md? (ref inline_md?)+`, but never says
which *block* may host that stem. Headings are settled -- the heading rule
stands, and blanks in headings and other exotic blocks are not wanted. What is
undecided is everything between a plain paragraph and a heading:

- table cells
- list items
- blockquotes
- emphasis/link text, and other inline containers (`**[^a]**`, `[[^a]](url)`)
- fenced code blocks (presumably never -- a blank inside code is literal text)

Arguments for restricting blanks to top-level paragraphs: it keeps the stem
grammar honest (one block, inline content only), it keeps rendering simple
(a blank becomes an input field, and an input field inside a table cell or a
blockquote raises layout and accessibility questions we have no answer for),
and it makes the "is this block the stem?" test cheap.

Arguments against: a cloze exercise over a table is a real use case ("fill in
the missing capital for each state"), and list items are a natural way to write
several short blanks in sequence.

Whatever we decide, the spec must say it explicitly and say what an
implementation does with a `[^slug]` reference found in a disallowed position:
reject the document, or leave the text alone as literal markdown. Silently
dropping it is the one outcome to avoid.
