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
and TypedDicts respectively. TypeScript maps the shapes of both into
`src/schema/`, where Zod schemas serve as both the type definitions and the
runtime validators. The behavior of a Python model (validators, `lint()`,
`score_response()`, `normalize()`, ...) goes to `src/models/<family>.ts`, as
functions over the plain objects. See [modules.md](modules.md) for the full
map.

# Validation

`validateDocument` runs two steps, like the construction of a Pydantic model:

1. The Zod schema, the mirror of `schema/*.yaml`. A generic Zod issue is
   `schema-error`.
2. The model rules of the document's family (`src/models/<family>.ts`):
   rules that the JSON Schema cannot express, such as unique ids or a regex
   that compiles. Each returns diagnostics with their own code
   (`docs/lint-codes.md`, "Load errors").

The model rules run only when the schema accepts the document. The invalid
corpus has one violation per example, so this does not change a result.

`render()` and `frontmatter()` are not ported.
