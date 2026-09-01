# True false

## Example

True/False questions are represented by an undorered list with an ASCII-art
rendition of a True or False marker. The correct answers are usually marked with
`[T]` and incorrect ones are usually marked with an `[F]`. 

```md
Judge the alternatives.

* [F] Earth is flat.
* [T] Humans descend from apes.
* [T] The Earth is billions of years old.
* [F] Light travels instantly through space.
```

## Frontmatter

True/False questions accept the following extra arguments in the
frontmatter

| Field   | Type         | Description                     |
| ------- | ------------ | ------------------------------- |
| type    | "true-false" | The type discriminator          |
| shuffle | boolean      | True if choices can be shuffled |


## Body

Body consists of an unordered list of items. Each item follows the grammar:

```
item  : ws? '[' value ']' markdown+
value : ws? (true | false) ws?
```

`markdown` represent any markdown element nested inside the item. `true` and
`false` are single character (case-insensitive) that represent each case. The
most common choices are `T` and `F`, respectively. However all other letters
except `X`, which is used to represent multiple-selection items, have one
truthness value assigned to it. Letters can be any unicode symbol that represent
a single character (#TODO: clarify).

The letters are divided into 3 categories: TRUE, FALSE and PROVISIONAL. The
first ALWAYS represent true, the second ALWAYS represent FALSE and the third
represent true, but SHOULD trigger a warning from compliant implementations.
PROVISIONAL letters may also change their category in future versions of this
document.

That warning is only possible for implementations that retain the letter itself:
see the `marker` field under [Choices](#choices).

The assignments were chosen to reflect the spelling of True and False in the
most commonly used languages in the world. See
[references/true-false-spellings.md](../references/true-false-spellings.md)
for the source data and the rationale behind each addition.

* **TRUE**: `TVS`, plus 对 (Mandarin "dui") and 真 (Japanese "shin")
* **FALSE**: `F`, plus 错 (Mandarin "cuo") and 偽 (Japanese "gi")
* **PROVISIONAL**: All other single-letter symbols, except `X` and `x`.

`S` was chosen for TRUE over FALSE deliberately: it is the initial letter for
"true" in Hindi, Bengali, Arabic, Urdu and Japanese (सत्य, সত্য, صحيح, سچ, 真),
but also the initial for "false" in Indonesian ("salah"). The larger,
independently-converging group won; Indonesian documents should use `F` for
false rather than `S`, see [Locale](#locale) below. Other language-specific
initials (e.g. `D`, `B`, `W`, `C`, `A`, `K`, `M`, `N`, `J`, `G`) are
intentionally left PROVISIONAL rather than promoted to TRUE or FALSE, to avoid
repeating this kind of collision as more languages are considered.

We only shown the upper case versions of each symbol. Each set must be expanded
with lowercase versions as well; the CJK characters have no case and are used
as-is.


## Choices

Choices follow the same structure from [Multiple choice questions](multiple-choice.md#choices),
respecting the rules for the allowed `values` inside the initial square brackets.

A True/False choice records the bracket letter in two fields, which answer two
different questions:

| Field  | Type    | Description                                             |
| ------ | ------- | ------------------------------------------------------- |
| answer | boolean | What the letter *means*: true if the statement is true. |
| marker | string  | The letter itself, exactly as it was written.           |

`answer` is what grading uses. `marker` is retained because the meaning alone
cannot reconstruct the letter: `T` and `V` both yield `correct: true`, and so
does every PROVISIONAL letter. Given the body

```md
* [F] Earth is flat.
* [V] Markdown is cool.
```

both fields are populated:

```yaml
choices:
  - text: Earth is flat.
    correct: false
    marker: F
  - text: Markdown is cool.
    correct: true
    marker: V
```

`marker` is a single character, stored verbatim including its case. Letters are
case-insensitive for *meaning* -- `t` and `T` both mean true -- but a document
that wrote `t` reads back as `t`.

`marker` is OPTIONAL. A document carrying only `answer` is well-formed and
grades identically; it has simply lost the ability to be written back out
unchanged, and neither the PROVISIONAL warning above nor the locale warning
below can be issued for it.


## Locale

Implementations MAY issue warnings for True/False letters that are incompatible
with the locale for the question. For instance, if `locale: pt-BR`, it may
expect `V` and `F` -- for "verdadeiro" (true) and "falso" (false) -- and could
issue a warning if `T` is used instead. The check reads `marker`, not `answer`:
a `T` and a `V` are indistinguishable once reduced to a boolean.

Implementations MUST NOT reinterpret the values according to the locale. `marker`
records which letter was written; it never changes what that letter means.

This matters most for `locale: id` (Indonesian): "salah" (false) starts with
`S`, but `S` is globally assigned to TRUE (see [Body](#body)). A document with
`locale: id` using `[S]` to mean false is silently graded as true, not just
mismatched -- implementations SHOULD escalate the locale warning for `S` under
`id` beyond the usual mismatch notice, and Indonesian documents should use `F`
for false instead.

## Feedback

A true/false question shows feedback for every statement the student got wrong
**and** for every statement they left unjudged. A statement judged correctly
shows nothing.

Including abstentions is deliberate: a student who skips a statement because
they did not know it is exactly the student the explanation is written for.

Feedback is listed in the order the statements appear in the document, never in
the order the student marked them. A skipped question -- as opposed to one
where individual statements were abstained -- shows no feedback at all, because
its grading formula never runs.
