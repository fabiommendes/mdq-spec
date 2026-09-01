# Short answer

## Example

Short answer questions expect a short textual response.

```md
What is the capital of Brazil?

[short-answer]: Brasília
```

## Frontmatter

Multiple choice questions accept the following extra arguments in the
frontmatter

| Field     | Type      | Description                                             |
| --------- | --------- | ------------------------------------------------------- |
| type      | "numeric" | The type discriminator                                  |
| exact     | boolean   | If true, require exact match [^1][^2]                   |
| regex     | string    | A regular expression that matches all correct responses |
| oneOf     | string[]  | A list of valid responses                               |
| openEnded | boolean   | True for openEnded questions                            |

[^1]: By default, the matching ignore case, normalize unicode letters and 
  normalize whitespace by replacing `/\s+/` by a single space and removing any 
  whitespace from the start and end.


## Body

Body consists of the `[short-answer]:` prefix followed by a string of text (in
the same line as the prefix) or an unordered list of values, one line of text
each. 


## Regex

If the body consists of a simple string (as opposed to an `ul` markdown block
element), AND the string is enclosed by `/`'s after stripping whitespace, it is
interpreted as a regular expression.

If the frontmatter also declares a `regex` field, it takes precedence.

A response is considered correct if, after normalization, it matches the 
regular expression. The default matching strategy is **full match**,
this makes `^` and `$` delimiters redundant. If instructors want to **search a substring**
it is necessary to craft the regular expression accordingly, e.g., `/.*(answer).*/`.

## Open ended

If the match string is empty, or if it is specified in the frontmatter, the 
question is open ended, and may require manual grading.

## Multiple strategies


