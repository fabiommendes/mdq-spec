# MDQ - Markdown Questions

## Basic usage

MDQ is a lightweight question format based on markdown. It allows you to write
questions in a simple, intuitive, and AI-friendly way, using markdown syntax.

Example:

```md
## Question 1

What is the capital of France?

- [ ] Berlin
- [*] Paris
- [ ] Madrid
``` 

This library parses this markdown text and extracts the question structure as a
JSON object. You can interact with MDQ either by using the command line
interface (CLI) or by importing the library in your Typescript or Python code.

The CLI can validate and parse MDQ files as JSON or YAML:

```bash
$ mdq parse questions.md
questions:
  - title: Question 1
    type: multiple-choice
    stem: What is the capital of France?
    options:
      - text: Berlin
        id: berlin
        value: 0
      - text: Paris
        id: paris
        value: 1
      - text: Madrid
        id: madrid
        value: 0
```

And the same functionality (and more) is available in the library, either using
Python or Typescript.

```python
import { parse_question } from 'mdq'; 

const md = `... your question ...`;  
const [ data, error ] = parse_question(md);
print(data, error);
```

```ts
import { parseQuestion } from 'mdq'; 

const md = `... your question ...`;  
const { data, error } = parseQuestion(md);
console.log(data, error);
```


## Installation

Mdq is available both as a pip and npm packages. Use pip/npm (or the package manager of your
choice) to install it:

```bash
# Python
pip install mdq

# Typescript
npm install mdq
```

If you just want to use the CLI, I recommend using uvx to run mdq. The easier
way is to create a new bash alias:

```bash
alias mdq="uvx run mdq --"
```

## Question types and formats

The generic structure of an MDQ question consists of a title, some optional YAML
metadata a few introductory paragraphs and the main question body, which varies
based on the question type.

```md 
## [id] Question title

    # Yaml configuration section
    # This is an indented block of code interpreted as YAML and is used to
    # specify advanced options. The first block of comments in this section is
    # stored in the `comment` attribute for the question.
    type: multiple-choice  # (usually can be inferred from the body)
    format: md
    shuffle: true

One or more descriptive paragraphs. Any inline **markdown** *markup* is ~~valid~~.
Those optional paragraphs are stored in the `preamble` attribute of the question.

The `stem` is the last paragraph before the question body. It usually commands the 
student to do some action (e.g., "Select all correct answers", "Write a program 
that..."). This paragraph is the `stem` of the example. Use an ellipsis (`...`) 
if you want to use the default stem for the question type (e.g., "Select the 
correct answer(s)", "Write an essay answer", etc.).

Any text after the body, like this one, is stored in the `epilogue` attribute 
of the question.
```

### Multiple Choice Questions

The body of a multiple choice question consists of a list of options, each starting with
a checkbox. The correct answer(s) are marked with an asterisk (`[*]`):

```md
## Question 1
What is the capital of France?
- [ ] Berlin
- [*] Paris
- [ ] Madrid
```

### Multiple Selection Questions

The body of a multiple selection question is similar to a multiple choice
question, but it allows for multiple correct answers. Each option is marked with
a checkbox, and the correct answers are indicated with x's (`[x]`), like 
task lists in GitHub-flavored markdown:

```md
## Question 2
Which of the following are turing complete programming languages?
- [x] Python
- [x] JavaScript
- [ ] HTML
```

### True/False Questions

True or false questions are represented as a list of options that are marked with
either the true `[T]` or false `[F]` checkboxes:`

```md
## Question 3
Judge the statements.
* [T] Markdown is a lightweight markup.
* [F] I'd rather be writing XML.
* [T] MDQ accepts True/False questions.
* [F] The Earth is flat.
```     

### Essay Questions

Essay questions consist of a question stem followed by a blank space for the
student to write their answer. The correct answer can be specified as any number
of paragraphs after the `[answer]` tag:

```md
## Question 4
Describe the process of photosynthesis.

[answer]: Photosynthesis is the process by which green plants and some other 
organisms use sunlight to synthesize foods with the help of chlorophyll. It 
involves the conversion of carbon dioxide and water into glucose and oxygen, 
using light energy.
```

### Numeric Questions

Numeric questions require the student to provide a numerical answer. The correct
answer is specified after the `[value]` tag, and an optional tolerance can be
provided to allow for a range of acceptable answers:

```md
## Question 3
What is the value of Pi?

[value]: 3.141 +/- 0.001
```