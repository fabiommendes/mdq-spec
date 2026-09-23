# Essay

## Example

Essay questions expect a textual (usually open ended) response.

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay] 
```

## Frontmatter

Essay questions accept the following extra arguments in the
frontmatter

| Field     | Type    | Description                               |
| --------- | ------- | ----------------------------------------- |
| type      | "essay" | The type discriminator                    |
| input     | string  | Either "code", "text" or "plain"          |
| highlight | string  | Programming language of "code" inputs[^1] |

[^1]: This property is ignored if the input is not of type "code".


## Body

Body consists of a single `[essay]` tag.

The body has a very simple grammar:

```lark
essay : "[essay]"
```

## Input

The input section describes the expected type of response for the essay
question. It is determined by the `input` field in the frontmatter, which can be
"code", "text", or "plain".

"code" indicates that the response should be a code snippet and `highlight` 
specifies the programming language for syntax highlighting.

"text" indicates that the response should be a rich text input, potentially
supporting markdown or other formatting. "plain" indicates that the response
should be in plain text without any special formatting. This controls if
rich text widgets should be shown to students or not.


## Answer key

Essay questions are usually open ended, and may require manual grading. The answer
key section is optional and serves as a guide for the instructor to grade the 
responses and may be presented as feedback to the students. 

The answer key section is placed below the `[essay]` tag and any existing
epilogue block. It starts with an `H2` heading with the text `## [answer-key]`
like in the example:

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay]

## [answer-key]
The greenhouse effect is a natural process that warms the Earth's surface. When
the Sun's energy reaches the Earth, some of it is reflected back to space and
the rest is absorbed, warming the planet. The Earth then emits heat in the form
of infrared radiation. Greenhouse gases in the atmosphere, such as carbon
dioxide, methane, and water vapor, trap some of this heat, preventing it from
escaping into space. This trapped heat warms the Earth's surface and lower
atmosphere, which is essential for maintaining a habitable climate. However,
human activities have increased the concentration of greenhouse gases, leading
to an enhanced greenhouse effect and global warming.
```

## Grading

Essay questions are graded manually.


## Additional Rules

| Field      | Level   | Rule                                               |
| ---------- | ------- | -------------------------------------------------- |
| highlight  | warning | must be omitted unless `input` is "code"           |
| highlight  | info    | should be a recognized language identifier         |
| highlight  | info    | should be defined when `input` is "code"           |
| answerKey  | info    | should be defined in the document                  |
