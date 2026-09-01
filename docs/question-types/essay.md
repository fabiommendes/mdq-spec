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

## Answer key

Essay questions are usually open ended, and may require manual grading. The answer
key section is optional and serve as a guide for the instructor to grade the 
responses and may be presented as feedback to the students. 

The answer key section is placed bellow the `[essay]:` tag and any existing
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