# MDQ - Markdown Questions

## Basic usage

MDQ is a lightweight question format based on markdown. It allows you to write
questions in a simple and intuitive and AI-friendly way, using markdown syntax.

Example:

```md
# Question 1

What is the capital of France?

- [ ] Berlin
- [x] Paris
- [ ] Madrid
``` 

This library parses this markdown text and extracts the question structure as a
JSON object. You can interact with MDQ either by using the command line
interface (CLI) or by importing the library in your Typescript code.

The CLI can validate and parse MDQ files as JSON or YAML:

```bash
$ mdq parse questions.md
questions:
  - question: What is the capital of France?
    options:
      - text: Berlin
        correct: false
      - text: Paris
        correct: true
      - text: Madrid
        correct: false
```

And the same functionality (and more) is available in the library:

```ts
import { parseQuestion } from 'mdq'; 

const md = `... your question ...`;  
const { data, error } = parseQuestion(md);
console.log(data, error);
```
 
## Installation

Mdq is available as an npm package. Use npm (or the package manager of your
choice) to install it:

```bash
npm install mdq
```

## Question types and formats

### Multiple Choice Questions

