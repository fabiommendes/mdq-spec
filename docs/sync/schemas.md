# Core Schemas and Types

Both libs follow the general dataflow when parsing a question:

1. Markdown Source 
2. JSON-like AST 
3. Validate JSONSchema 
4. Final Model/class

In both implementations, the parsing from source to JSON ast is handled by
hand-written parser that uses Markdown-it under the hood.

Python represents the AST using TypedDicts while TypeScript represents it using
plain objects. 

In Python, the JSON Schema validation is done when coverting the types from
Dicts to Pydantic models. The validation is checks some other constraints that
cannot be expressed in JSON Schema alone. Validation produces the final Pydantic
model instance, which are the main objects in the public API.

In TypeScript, there are no equivalent model classes. Zod validates the plain
objects directly and no extra model layer is introduced. What in python are
instance methods, in TypeScript they are just functions that operate on the
plain objects and dispatch from the object type field.

The Python approach requires some duplication that the JS structural typing
avoids: we define both the Pydantic models and TypedDicts separately and must
keep them in sync manually. Zod schemas give us both from the same definitions
at the cost of not having nominal typing for the final question objects.

We could wrap the Zod-validated plain objects in classes to provide a similar
API to the Python Pydantic models, but the structural typing approach is very
common in the TypeScript ecosystem. Those objects can be freely manipulated and
passed around to other libs, converted to JSON, etc. The TypeScript version thus
embraces a more functional style of programming and exposes behavior as
standalone functions rather than objects.

Typescript has a more powerful type system compared to Python and that means
that we can have stronger static type guarantees in some cases.


# Module structure

Python defines independent `mdq.models` and `mdq.types` for the Pydantic models
and TypedDicts respectively. Typescript maps both concepts into `mdq/schema`
where Zod schemas serve as both the type definitions and the runtime validators.


# Methods and functions

The `mdq.models` classes implement a few important methods for each question type class:

- `Question.normalize()` - in typescript is implemented as `mdq:normalize()`,
  which is re-exported from its implementation module at `mdq/normalize`.
- `Question.score_response()` - in typescript is implemented as `mdq:score_response()`,
  which is re-exported from its implementation module at `mdq/score_response`.

`normalize()` and `score_response()` are the only public interfaces from their
respective modules.

The TypeScript implementation does not have neither `Question.frontmatter()` nor
`Question.render()` methods.

