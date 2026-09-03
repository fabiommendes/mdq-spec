# Style guide

Conventions for writing functions and modules in this codebase. For
typing rules (`T | None`, builtins over `typing` generics, Pydantic vs
`TypedDict`) see `CLAUDE.md`.

## Generics

Use PEP 695 bracket syntax, never `typing.TypeVar`:

```python
def lookup[V](response: dict[str, V], key: str | None, default: V) -> V: ...

class BaseQuestion[R](MdqModel): ...
```

## Module-level naming

Don't prefix a module-level function with `_` to mark it private. Give
it a normal name and declare the module's real public surface with an
explicit `__all__` listing the intentionally-public names (classes,
type aliases, functions other modules import).

Instance/class methods may still use a leading underscore for
internal-only methods (`_render_lines`) -- `__all__` doesn't reach
those, so the convention still pulls its weight there.

## Function order

Within a module or class, put the main/entry-point function first and
its auxiliary helpers below it, ordered top to bottom by importance --
not alphabetically, not by call order.

## Docstrings

Keep them extremely concise:

- One short phrase for the description. Prefer a single line.
- Add an `Args:` section only if a parameter's name and type don't
  already make its meaning clear.
- Add a second paragraph only if the function's behavior isn't obvious
  from the description plus its signature.
- Add a `Raises:` section listing exceptions the function can raise.
- Never cite ADRs or other docs from a docstring -- link them from
  comments or commit messages instead, not code that ships.

```python
def numeric_value(value: float | int | str | Fraction) -> float:
    """
    Convert a numeric value to a float.

    Args:
        value: a number, or a decimal/rational string (e.g. "3.14", "1/3").

    Raises:
        ValueError: `value` isn't a valid number.
    """
```

## Comments

Default to no comments. Only add one when the WHY is non-obvious -- a
hidden constraint, an invariant, a workaround for a specific bug.
Never explain WHAT the code does or reference the task/issue that
prompted it; both rot as the code moves on.
