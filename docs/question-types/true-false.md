# True/false

## Example

True/False questions are represented by an unordered list with an ASCII-art
rendition of a True or False marker. True statements are usually marked
with `[T]` and false statements with `[F]`.

```md
Judge the alternatives.

* [F] Earth is flat.
* [T] Humans descend from apes.
* [T] The Earth is billions of years old.
* [F] Light travels instantly through space.
```

## Frontmatter

True/False questions accept the following extra arguments in the
frontmatter:

| Field   | Type                 | Description                         |
| ------- | -------------------- | ----------------------------------- |
| type    | "true-false"         | The type discriminator              |
| shuffle | boolean or "inherit" | True if choices can be shuffled[^1] |
| grading | grading              | The grading strategy to use.[^1]    |

[^1]: Grading is `"partial" | "no-mistakes" | "all-or-nothing" | "symmetric" | "inherit"`.
Default is `"inherit"`, which takes the strategy from the exam, and is
`"symmetric"` outside an exam. `shuffle` is `boolean | "inherit"` with the
same rule: `"inherit"` is the default and resolves to `false` outside an
exam. See [exam inheritance](../exam.md#inheritance).
With `shuffle: true`, an implementation MAY present the choices in any
order. With `shuffle: false`, it MUST NOT change their order. This rule is
for implementations that present the question: it has no diagnostic.


## Body

Body consists of a [choice list](../references/choices.md) of at least two
items. Each item follows the `item` rule of
[Choice lists](../references/choices.md#item), with the values:

```lark
value          : ws? (TRUE_LETTER | FALSE_LETTER | WARNING_LETTER) ws?
TRUE_LETTER    : /[tvbdđĐвВ对對真是참صसসबఒசถસ]/
FALSE_LETTER   : /[fmeyнН错錯偽非거خغगমचతதผખ]/
WARNING_LETTER : /(?![tvbdđĐвВfmeyнН对對真是참صसসबఒசถસ错錯偽非거خغगমचతதผખx])/ LETTER
```

The terminals apply to the [normalized value](../references/choices.md#choice-marker)
of the marker: NFKC, then ASCII lowercase. `[T]`, `[t]` and `[Ｔ]` (U+FF34) all
read as `t`. `LETTER` is defined in [Tokens](../references/grammar.md#tokens).

The most common letters are `T` and `F`. All other letters except `X`, which
represents multiple-selection items, have one truth value assigned to them.

A **letter** is exactly one code point of `LETTER`, after normalization.
`LETTER` is a General_Category (`Lu`, `Ll`, `Lt` or `Lo`), not a
regex class: see [Tokens](../references/grammar.md#tokens). This covers the
Latin letters used above (`T` is `Lu`, `t` is `Ll`) and the CJK ideographs,
which are `Lo`: 对 is U+5BF9, 真 is U+771F, 错 is U+9519, 偽 is U+507D, all four
`Lo` (Letter, other) in the Han script.

Three consequences follow:

* Marks that look like answers but are not letters are NOT valid markers:
  `✓` (U+2713) and `✗` (U+2717) are `So`, `×` (U+00D7) is `Sm`, `○` (U+25CB)
  is `So`, and `〇` (U+3007) is `Nl`. Digits are `Nd`. A modifier letter is
  `Lm`, so `ˇ` (U+02C7) and `ー` (U+30FC) are not valid either. Each of them
  is a `foreign-choice-marker`.
* "One code point", not one grapheme cluster. A base letter followed by a
  combining mark is two code points and is not a valid marker, unless its NFKC
  form is one code point of `LETTER`.
* Validity and meaning are both measured on the normalized value. A marker
  whose normalized value has more than one code point is a
  `foreign-choice-marker`: `ﬁ` (U+FB01) normalizes to `fi`, `ǅ` (U+01C5) to
  two code points and U+0958 to two code points. `Ｆ` (U+FF26) normalizes to
  `f`: it is a valid marker and means false. U+212B (ANGSTROM SIGN)
  normalizes to `Å` (U+00C5), a valid marker in the WARNING category.
  Implementations MAY report, at the info level, a marker that is not its own
  NFKC form (`non-nfkc-true-false-marker`).
* The `marker` field keeps the letter as written, before normalization and
  without the `ws` around it.
* A value that normalizes to the empty string, such as `[` U+00A0 `]`, is a
  blank value, and a blank value is a `foreign-choice-marker` in a true/false
  list.

The letters are divided into 3 categories: TRUE, FALSE and WARNING. The
first ALWAYS represents true, the second ALWAYS represents false and the third
represents true, but SHOULD trigger a warning from compliant implementations,
unless the `locale` accepts it (see [Locale](#locale)), since the letter is not
in either list and the author may have meant false.

That warning is only possible for implementations that retain the letter itself:
see the `marker` field under [Choices](#choices).

The assignments reflect the spelling of True and False in the most commonly
used languages in the world. The meaning of a letter never depends on
`locale`. See [annex/true-false-spellings.md](../annex/true-false-spellings.md)
for the source data and the classification of each candidate letter.

* **TRUE** (`TRUE_LETTER`): `T`, `V`, `B`, `D`, `Đ`, `对`, `對`, `真`, `是`, `В`,
  `참`, `ص`, `स`, `স`, `ब`, `ఒ`, `ச`, `ถ` and `સ`.
* **FALSE** (`FALSE_LETTER`): `F`, `M`, `E`, `Y`, `错`, `錯`, `偽`, `非`, `Н`, `거`, `خ`, `غ`,
  `ग`, `ম`, `च`, `త`, `த`, `ผ` and `ખ`.
* **WARNING** (`WARNING_LETTER`): Every other letter, except `X`. `S` is a
  WARNING letter. Like every WARNING letter, it still means true.

The terminals list the lower case versions of the ASCII letters, because they
apply to the normalized value, which lowercases ASCII only. A cased non-ASCII
letter appears in both cases: `Đ` and `đ`, `В` and `в`, `Н` and `н`. The other
non-Latin letters have no case and are used as-is.

### Why a letter is TRUE, FALSE or WARNING

The lists above and the [annex](../annex/true-false-spellings.md) decide the
category of a letter. The criterion below is a guide. It explains most rows,
but not all of them, and it does not predict the category of a new letter: each
new letter is a separate decision.

A letter joins TRUE or FALSE when it has no conflict in actual practice: no
language writes it as the initial of the opposite word in tests, textbooks or
learning platforms. A romanization is not practice. Nobody writes `[S]` for
Hindi "सही": the author writes `स`. So a conflict that exists only in a
romanization usually does not keep a letter out (`T`, `B`, `M`). A conflict in
real practice does.

The initial of a word for yes or no is not a conflict: a statement list is
not a list of yes/no questions. `E` and `Y` are FALSE because of the Cebraspe
C/E and the Turkish D/Y practice, although "evet" and "yes" start with them.

`S` is the main case of a conflict in practice. It is true only by
romanization (Hindi "sahi", Arabic "sahih", Urdu "sach", Tamil "sari",
Japanese "shin"), but false in real practice: Indonesian and Malay "salah"
(B/S in Indonesian school material), Vietnamese "sai" (Đ/S in mathematics
textbooks). A document that used `S` for false in those languages was silently
graded as true. Now `S` raises `unlisted-true-false-marker`, and
`false-friend-true-false-marker` under the locales where it means false (see
[Locale](#locale)).

These letters have a conflict and stay in WARNING:

| Letter | Reason                                                                                      |
| ------ | ------------------------------------------------------------------------------------------- |
| `W`    | True in German "wahr", but false in English "wrong".                                        |
| `K`    | True in Swahili "kweli", but false in Arabic "khata" and Gujarati "khotu" (romanizations).  |
| `G`    | True in Hausa "gaskiya", but false in Hindi, Urdu, Persian and Korean (romanizations).      |
| `C`    | True in Portuguese "certo" (Cebraspe), but false in Mandarin "cuò", Cantonese and Marathi (romanizations). The `pt` row accepts it. |
| `N`    | No practice as a marker.                                                                    |
| `H`    | No practice as a marker.                                                                    |
| `J`    | No practice as a marker.                                                                    |
| `P`    | True in Polish "prawda", but no letter practice in Polish tests. False in Thai "phit" (romanization). |
| `O`    | The O/X pair of Japanese and Korean needs `X`, which is reserved.                           |
| `S`    | See above.                                                                                  |

Three more notes:

* NFKC does not map Cyrillic `В` and `Н` to Latin `B` and `H`. Confusables are
  out of scope: each code point has its own category. Latin `H` stays WARNING
  while Cyrillic `Н` is FALSE.
* A letter with no practice at all stays in WARNING too, for example `A`
  (Hindi "asatya", a form no test uses) and `L` (Russian "lozh").
* Words for yes and no explain why `N`, `H` and `J` are unlikely markers
  ("no" in English, "haan" in Hindi, "ja" in German), but they are not the
  reason for the category.


## Choices

Choices follow [Choice lists](../references/choices.md): the item layout, the
`text`, `id`, `feedback` and `comment` fields, and the rules for duplicate
texts, duplicate ids and derived ids. Each choice of a true/false question is
called a **statement**.

A True/False choice records the bracket letter in two fields, which answer two
different questions:

| Field   | Type    | Description                                             |
| ------- | ------- | ------------------------------------------------------- |
| correct | boolean | What the letter *means*: true if the statement is true. |
| marker  | string  | The letter of the bracket value, without its `ws`.      |

`correct` is REQUIRED: every statement states its verdict, even when the
marker already spells it. It is what grading uses. `marker` is retained
because the meaning alone cannot reconstruct the letter: `T` and `V` both yield `correct: true`, and so
does every WARNING letter. Given the body

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

`marker` is the letter of the bracket value without the `ws` around it: `[ T ]`
stores `T`. Only the letter and its case are kept, and the letter keeps its
form before NFKC. Letters are case-insensitive for *meaning* -- `t` and `T`
both mean true -- but a document that wrote `t` reads back as `t`, and one that
wrote `Ｆ` reads back as `Ｆ`.

When `marker` is present, these rules apply:

* Its category MUST agree with `correct`. A FALSE letter requires
  `correct: false`. A TRUE or WARNING letter requires `correct: true`.
  `marker: F` with `correct: true` is an error, and so is `marker: K` with
  `correct: false` (`true-false-marker-disagrees-with-correct`). The category
  uses the [normalized value](../references/choices.md#choice-marker) of the
  letter.
* It MUST NOT be `X` or `x`, nor a letter that normalizes to `x`
  (`reserved-true-false-marker`).
* It MUST be one letter, as defined in [Body](#body)
  (`malformed-true-false-marker`).

These rules check the `marker` field of model input (YAML, JSON, dict). In a
markdown document a bracket value that is not allowed in a true/false list
(`[x]`, `[TF]`, `[✓]`, `[1]`) gets only `foreign-choice-marker`. It does not get
`malformed-true-false-marker` or `reserved-true-false-marker`.

`marker` is OPTIONAL. A document carrying only `correct` is well-formed and
grades identically; it has simply lost the ability to be written back out
unchanged, and neither the WARNING-category warning above nor the locale warning
below can be issued for it. A writer (a serializer to Markdown) that needs a
letter for a statement without `marker` SHOULD write `T` or `F`, by `correct`.


## Locale

`locale` is metadata. An author can add `locale` to a question that already
uses `T` and `F` without rewriting its markers. For this reason `T` and `F` are
canonical: they are accepted under every locale and never get a locale warning.

The meaning of a letter never depends on `locale`. The `locale` only tells an
implementation which warning to give. Implementations SHOULD issue the locale
warnings below. The check reads `marker`, not `correct`: a `T` and a `V` are
indistinguishable once reduced to a boolean.

The table has one row for each language. It follows the spellings in
[True/False spellings](../annex/true-false-spellings.md). The lower case forms
of the letters are implied, as in the sets of [Body](#body).

* **TRUE accepted** and **FALSE accepted** are the letters an author writing in
  that language can use with no warning. A letter enters these columns by
  practice only: a romanization alone is not enough. They can hold WARNING
  letters (`C`, `W`, `R`, `O`, `K`). Under that locale such a letter is
  accepted without `unlisted-true-false-marker`, and it still means true.
* **False friends** are letters that mean false in that language but true
  globally. A letter enters this column by practice or by romanization. They
  are WARNING letters, or TRUE letters. A TRUE letter can be a false friend
  only through a romanization: `B` under `bn` (Bengali "bhul") and under `ja`
  (Japanese "batsu").

The columns follow different rules because a mistake costs different things. A
missing false friend leaves a wrong score with no message: the author meant
false, and the letter grades as true. A missing accepted letter only gives
a warning, and the score is the same.

| Language subtag | TRUE accepted | FALSE accepted | False friends | Words                                  |
| --------------- | ------------- | -------------- | ------------- | -------------------------------------- |
| `en`            | `T`           | `F`            | `W`           | true / false (right / wrong)           |
| `zh`            | `T` 对 對 是   | `F` 错 錯 非    | `C`           | 对/错, 是/非                            |
| `yue`           | `T` 對         | `F` 錯          | `C`           | 對/錯                                   |
| `hi`            | `T` स          | `F` ग           | `G`           | सही / गलत                               |
| `es`            | `T V`         | `F`            |               | verdadero / falso                      |
| `ar`            | `T` ص          | `F` خ           | `K`           | صح / خطأ                                |
| `fr`            | `T V`         | `F`            |               | vrai / faux                            |
| `bn`            | `T` স          | `F M` ম         | `B`           | সত্য / মিথ্যা                             |
| `pt`            | `T V C`       | `F E`          |               | verdadeiro / falso, certo / errado     |
| `id`            | `T B`         | `F`            | `S`           | benar / salah                          |
| `ms`            | `T B`         | `F`            | `S`           | betul / salah                          |
| `ur`            | `T` ص          | `F` غ           | `G J`         | صحیح / غلط                              |
| `ru`            | `T V` В        | `F` Н           | `N`           | верно / неверно                        |
| `de`            | `T W R`       | `F`            |               | wahr, richtig / falsch                 |
| `ja`            | `T` 真 `O`     | `F` 偽          | `B`           | 真/偽, ○/×                               |
| `mr`            | `T B` ब        | `F` च           | `C`           | बरोबर / चूक                             |
| `vi`            | `T D` Đ        | `F`            | `S`           | đúng / sai                             |
| `te`            | `T` ఒ          | `F` త           |               | ఒప్పు / తప్పు                             |
| `sw`            | `T K`         | `F`            | `S H`         | kweli / sio kweli, hapana              |
| `tr`            | `T D`         | `F Y`          |               | doğru / yanlış                         |
| `tl`            | `T`           | `F M`          |               | tama / mali                            |
| `ta`            | `T` ச          | `F` த           |               | சரி / தவறு                              |
| `fa`            | `T` ص          | `F` غ           | `G N`         | صحیح, درست / غلط                        |
| `ko`            | `T` 참 `O`     | `F` 거          | `G`           | 참/거짓, O/X                             |
| `th`            | `T` ถ          | `F` ผ           | `P`           | ถูก / ผิด                               |
| `gu`            | `T` સ          | `F` ખ           | `K`           | સાચું / ખોટું                            |
| `it`            | `T V`         | `F`            |               | vero / falso                           |

The language subtag is the first subtag of `locale`: `pt-BR` has `pt`. It is
compared with the table case-insensitively: `PT-BR` and `Pt` also have `pt`. The
rules apply to the normalized value of the marker (see
[Choice lists](../references/choices.md)), in this order. The first rule that
matches decides:

| # | Condition                                                               | Result                                |
| - | ----------------------------------------------------------------------- | ------------------------------------- |
| 1 | The value is a false friend of the row of the locale                    | Only `false-friend-true-false-marker` |
| 2 | The value is in the TRUE accepted or the FALSE accepted list of the row | No warning                            |
| 3 | The value is a WARNING letter                                           | Only `unlisted-true-false-marker`     |
| 4 | The language subtag of `locale` has no row, or there is no `locale`     | No locale warning                     |
| 5 | The value is a TRUE or FALSE letter that the row does not accept        | `locale-mismatched-true-false-marker` |

Rule 3 applies when the locale has no row and when there is no locale. The
message of `false-friend-true-false-marker` SHOULD say that the letter reads as
true.

| `locale` | Marker | Rule | Result                                                |
| -------- | ------ | ---- | ----------------------------------------------------- |
| `pt-BR`  | `V`    | 2    | No warning                                            |
| `pt-BR`  | `F`    | 2    | No warning                                            |
| `pt-BR`  | `T`    | 2    | No warning (`T` is canonical)                         |
| `pt-BR`  | `C`    | 2    | No warning                                            |
| `pt-BR`  | `E`    | 2    | No warning (`E` means false)                          |
| `pt-BR`  | `S`    | 3    | Only `unlisted-true-false-marker`                     |
| `pt-BR`  | `B`    | 5    | `locale-mismatched-true-false-marker`                 |
| `pt-BR`  | `K`    | 3    | Only `unlisted-true-false-marker`                     |
| `de`     | `W`    | 2    | No warning                                            |
| `en`     | `W`    | 1    | Only `false-friend-true-false-marker`                 |
| (none)   | `W`    | 3    | Only `unlisted-true-false-marker`                     |
| `id`     | `S`    | 1    | Only `false-friend-true-false-marker`                 |
| `vi`     | `S`    | 1    | Only `false-friend-true-false-marker`                 |
| `bn`     | `B`    | 1    | Only `false-friend-true-false-marker` (`B` is TRUE)   |
| `en`     | `B`    | 5    | `locale-mismatched-true-false-marker`                 |
| `hi`     | `S`    | 2    | No warning                                            |
| `ru`     | `Н`    | 2    | No warning (Cyrillic)                                 |
| `en`     | `Н`    | 5    | `locale-mismatched-true-false-marker` (Cyrillic)      |
| `fr`     | `V`    | 2    | No warning                                            |
| `it-IT`  | `V`    | 2    | No warning                                            |
| `ko`     | `O`    | 2    | No warning                                            |
| `en`     | `Ｔ`    | 2    | No locale warning (only `non-nfkc-true-false-marker`) |

Implementations MUST NOT reinterpret the values according to the locale. `marker`
records which letter was written; it never changes what that letter means.

False friends exist because a letter that reads as true globally can be the
initial of "false" in a language. In Indonesian, "salah" (false) starts with
`S`. In Vietnamese, "sai" does. In Bengali, "bhul" starts with `B`, a TRUE
letter: rule 1 comes before rule 5, so `[B]` under `bn` gets the false friend
warning and not the mismatch warning. A document that uses such a letter to
mean false is silently graded as true, not just mismatched. For this reason a
false friend gets its own warning, and no other. Write `F` for false in those
languages.

Japanese and Korean authors cannot use the ○/× convention. `○` and `×` are not
letters (`foreign-choice-marker`), and `[X]` makes the list a multiple-selection
list. Write `O` for true, and `F` (or `偽` or `거`) for false.

## Feedback

A true/false question shows feedback for every statement judged wrongly
**and** for every abstention. A statement judged correctly shows nothing.

Including abstentions is deliberate: a student who abstains on a statement
because they did not know it is exactly the student the explanation is
written for.

Feedback is listed in the order the statements appear in the document, never in
the order the student judged them. A skipped question -- as opposed to one
with abstentions on some statements -- shows no feedback at all, because its
grading formula never runs.

The empty mapping `{}` and a mapping whose values are all `null` are not a skip.
The question is graded, every statement is an abstention, and so every feedback
shows.


## Grading

The `grading` field of the frontmatter selects one of the four strategies
below. It can be set in the question, or left as `"inherit"`, the default,
which takes the strategy the exam's `grading` gives for true/false: its
`true-false` entry when it is a map, or the translation of a scalar by the
table of [exam grading](../exam.md#grading). The strategy is `"symmetric"`
outside an exam, and in an exam that does not set one for true/false (no
`grading`, or a map without a `true-false` key).

The [response](../responses.md#truefalse) holds a value for each statement the
student judged. Each statement is in exactly one of three states:

* **judged correctly**: the response holds the `correct` value of the statement.
* **judged wrongly**: the response holds the other value.
* **abstention**: the response holds no value for the statement. The key is
  absent or its value is `null`.

An abstention is neither judged correctly nor judged wrongly. In the strategies,
`n` is the number of statements.

* **partial**: Each statement judged correctly gives a point. A statement judged
  wrongly and an abstention give nothing. The total is normalized to the range
  `[0, 1]` by dividing by `n`.
* **no-mistakes**: Any statement judged wrongly gives zero points. Otherwise the
  score is the number of statements judged correctly, divided by `n`. An
  abstention is not judged wrongly.
* **all-or-nothing**: Every statement must be judged correctly, otherwise the
  score is zero. An abstention is not judged correctly.
* **symmetric**: Each statement judged correctly gives a point, and each
  statement judged wrongly subtracts a point. An abstention neither adds nor
  subtracts points. The total is normalized to the range `[-1, 1]` by dividing
  by `n`.

**Examples**:

Consider the answer key `[T, F, T, F]`. In the table, each row is a response:
`T` and `F` are the values the student gave to each statement, and `_` is an
abstention. The table shows the score of each grading strategy.

| Response       | "partial" | "no-mistakes" | "all-or-nothing" | "symmetric" |
| -------------- | :-------: | :-----------: | :--------------: | :---------: |
| `[T, F, T, F]` |    1.0    |      1.0      |       1.0        |     1.0     |
| `[F, T, F, T]` |    0.0    |      0.0      |       0.0        |    -1.0     |
| `[T, T, F, F]` |    0.5    |      0.0      |       0.0        |     0.0     |
| `[T, F, _, _]` |    0.5    |      0.5      |       0.0        |     0.5     |
| `[F, T, _, _]` |    0.0    |      0.0      |       0.0        |    -0.5     |
| `[_, _, _, _]` |    0.0    |      0.0      |       0.0        |     0.0     |

### Uniform answers

Implementations MAY report, at the info level, a question whose statements
all have the same `correct` value (`uniform-true-false-answers`). Such a
question can be answered without reading the statements, and it often
means that the author forgot to change a marker.

True/false does not reuse `no-correct-choice` and `all-choices-correct` of
multiple selection. In a true/false question every statement has an answer:
`[F]` is a verdict, not a missing mark. "No correct choice" has no meaning
here. Only the uniform pattern is suspicious, so one code covers both the
all true and the all false cases.


## Additional Rules

| Field              | Level    | Code                                     | Rule                                                       |
| ------------------ | -------- | ---------------------------------------- | ---------------------------------------------------------- |
| choices            | error    | schema-error                             | must have at least two statements (schema)                 |
| choices[].id       | error    | schema-error                             | must be a valid slug (schema)                              |
| choices[].correct  | error    | schema-error                             | must be declared in every statement (schema)               |
| grading            | error    | schema-error                             | must be `partial`, `no-mistakes`, `all-or-nothing`, `symmetric` or `inherit` (schema) |
| shuffle            | error    | schema-error                             | must be a boolean or `inherit` (schema)                    |
| choices[]          | error    | foreign-choice-marker                    | must use a value allowed in a true/false list[^7]          |
| choices[].marker   | error    | malformed-true-false-marker              | must be a single letter[^2][^6][^7]                        |
| choices[].marker   | error    | reserved-true-false-marker               | must not be `X` or `x`[^2][^7]                             |
| choices[].marker   | error    | true-false-marker-disagrees-with-correct | must agree with `correct` according to its category[^3][^7] |
| choices[].text     | error    | blank-text                               | must have at least one visible character                   |
| choices[].feedback | error    | blank-text                               | must have at least one visible character                   |
| choices[].comment  | error    | blank-text                               | must have at least one visible character                   |
| choices[].text     | error    | duplicate-choice-text                    | must be unique among the statements of the question        |
| choices[].id       | error    | duplicate-choice-id                      | must be unique among the statements of the question        |
| choices[]          | error    | parse-error                              | carries at most one feedback block and one comment block   |
| choices[]          | error    | parse-error                              | must not use the empty marker `[]`                         |
| choices[].marker   | warning  | unlisted-true-false-marker               | should not be a WARNING letter, unless the `locale` accepts it[^3][^4] |
| choices[].marker   | warning  | locale-mismatched-true-false-marker      | should be `T`, `F` or a letter its `locale` accepts[^4]    |
| choices[].marker   | warning  | false-friend-true-false-marker           | should not be a false friend of its `locale`[^4]           |
| choices[].text     | info     | visually-identical-choices               | is visually equivalent to another statement[^5]            |
| choices            | info     | uniform-true-false-answers               | the statements all have the same `correct` value[^8]       |
| choices[].marker   | info     | non-nfkc-true-false-marker               | is not its own NFKC form; read as that form[^2]            |
| choices[].id       | info     | missing-choice-id                        | has no id in the document                                  |

[^2]: A letter is one code point in `LETTER` after normalization, see [body](#body).
    `X` and `x` are also reserved in their compatibility forms, such as `Ｘ`.
[^3]: The TRUE, FALSE and WARNING categories are listed in [body](#body).
[^4]: The `locale` table and the order of the rules are in [locale](#locale).
    A false friend, such as `S` under `locale: id`, gets only
    `false-friend-true-false-marker`.
[^5]: Visual equivalence is not defined by this spec, see
[choice text](../references/choices.md#choice-text).
[^6]: The schema checks only that the marker is not empty (`minLength` of 1).
    The written marker can have more than one code point, for example `E`
    followed by U+0301, when its normalized value is one letter. So the length
    is part of the letter check, which is a lint rule only.
[^7]: A `marker` rule applies to the `marker` field of model input. In a markdown
    document, a bracket value that is not allowed in a true/false list gets only
    `foreign-choice-marker`.
[^8]: See [uniform answers](#uniform-answers).
