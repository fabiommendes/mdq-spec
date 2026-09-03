"""
Hypothesis strategies for stress-testing `mdq.slugify`.

Random text almost never collides once slugified, so a strategy that just
draws independent random strings would rarely exercise the collision-
resolution ladder `loose()` builds around. The strategies here are split in
two families instead:

- `sluggable_texts()` covers the individual corner cases a slugifier must
  survive on its own: empty/whitespace-only text, symbols with nothing
  sluggable in them, accented text, very long text, and text that already
  looks like a slug.
- `colliding_text_sets()` deliberately builds *sets* of distinct strings
  that are likely to collide once slugified -- cosmetic variants (case,
  punctuation, padding, accents) of the same handful of base phrases -- so
  that collision handling is actually on the hot path most of the time,
  not a rare edge a purely random strategy would need a huge example
  budget to hit.

`text_sets()` mixes both families together for the general-purpose "any set
of items `loose`/`simple` might see" strategy.
"""

from hypothesis import assume
from hypothesis import strategies as st


def text_sets(
    *, min_size: int = 0, max_size: int = 12, max_string_length: int | None = None
) -> st.SearchStrategy[frozenset[str]]:
    """
    Strategy for sets of distinct strings suitable as `items` for
    `mdq.slugify.slugify`/`loose`/`simple`: a mix of plain random text and
    deliberately collision-prone sets.
    """
    plain = st.sets(
        sluggable_texts(max_length=max_string_length),
        min_size=min_size,
        max_size=max_size,
    )
    colliding = colliding_text_sets(
        min_size=min_size, max_size=max_size, max_string_length=max_string_length
    ).map(set)

    return (plain | colliding).map(frozenset)


@st.composite
def colliding_text_sets(
    draw: st.DrawFn,
    *,
    min_size: int = 2,
    max_size: int = 10,
    max_string_length: int | None = None,
) -> frozenset[str]:
    """
    Strategy for sets of distinct strings that are likely to
    collide once slugified: cosmetic variants of a small number of shared
    base phrases, e.g. {"Ouro Preto", "OURO PRETO!", " ouro preto "}.
    """
    bases = draw(
        st.lists(st.sampled_from(_BASE_PHRASES), min_size=1, max_size=4, unique=True)
    )
    variants: set[str] = set()

    # `similar_text_variants` has a large but finite domain per base, so a
    # handful of draws is enough to reach `min_size` almost always; cap the
    # attempts so a pathological run can't spin forever.
    attempts = 0
    while len(variants) < min_size and attempts < 50:
        variants.add(draw(similar_text_variants(draw(st.sampled_from(bases)))))
        attempts += 1

    extra = draw(st.integers(min_value=0, max_value=max(0, max_size - len(variants))))
    for _ in range(extra):
        variants.add(draw(similar_text_variants(draw(st.sampled_from(bases)))))

    assume(min_size <= len(variants) <= max_size)
    return frozenset(variants)


def sluggable_texts(max_length: int | None = None) -> st.SearchStrategy[str]:
    """
    Strategy for arbitrary text to feed a slugifier.

    Weighted towards the corner cases that tend to break naive implementations:
    plain sentences, text with no sluggable content at all, very long
    text, and text that is already slug-shaped.
    """
    sentence = st.lists(words(), min_size=1, max_size=8).map(" ".join)
    symbol_only = st.sampled_from(_SYMBOL_ONLY_TEXTS)
    long_text = st.text(alphabet="abcdefghij ", min_size=200, max_size=500)
    already_a_slug = slug_like_strings()

    return sentence | symbol_only | long_text | already_a_slug


def forbid_sets(*, max_size: int = 6) -> st.SearchStrategy[frozenset[str]]:
    """
    Strategy for `forbid` sets: small sets of slug-shaped strings.
    """
    return st.sets(slug_like_strings(), max_size=max_size).map(frozenset)


#
# Building blocks
#
def similar_text_variants(base: str) -> st.SearchStrategy[str]:
    """
    Strategy for cosmetic variants of `base` that are likely to
    slugify to the same (or a very similar) value: case changes, added
    punctuation, and leading/trailing/internal whitespace padding.
    """
    casing = st.sampled_from(
        [base, base.upper(), base.lower(), base.title(), base.swapcase()]
    )
    punctuation = st.sampled_from(["", "!", "?", ".", "...", " (revised)"])
    padding = st.sampled_from(["", " ", "  ", "\t"])

    return st.builds(
        lambda text, suffix, pad: f"{pad}{text}{suffix}{pad}",
        casing,
        punctuation,
        padding,
    )


def slug_like_strings() -> st.SearchStrategy[str]:
    """
    Strategy for strings that already look like a valid slug:
    lowercase ASCII alphanumeric groups joined by `-`. Used to build
    `forbid` sets, since forbidding something that isn't even a valid slug
    shape wouldn't test anything a real caller would do.
    """
    ascii_alnum = st.sampled_from("abcdefghijklmnopqrstuvwxyz0123456789")
    group = st.text(alphabet=ascii_alnum, min_size=1, max_size=8)
    return st.lists(group, min_size=1, max_size=4).map("-".join)


def words(*, max_length: int = 10) -> st.SearchStrategy[str]:
    """
    Strategy for a single "word": a short run of letters, possibly with accents,
    or a run of digits.
    """
    letters = st.text(
        alphabet=st.characters(whitelist_categories=("Ll", "Lu")),
        min_size=1,
        max_size=max_length,
    )
    digits = st.text(alphabet="0123456789", min_size=1, max_size=6)
    return letters | digits


def truncated(words: list[str], max_length: int) -> list[str]:
    """
    Truncate each word of the list to a max_length.
    """
    return [word[:max_length] for word in words]


# A small pool of strings to build cosmetic collision variants from. Chosen to
# include accents, punctuation, and multi-word phrases so their slugified forms
# are non-trivial.
_BASE_PHRASES = [
    "Ouro Preto",
    "Amazônia",
    "Capoeira",
    "Feijoada",
    "Ipê Amarelo",
    "Bossa Nova",
    "Ayrton Senna",
    "Dom Pedro II",
    "Evolução de Darwin",
    "Mecânica Quântica",
    "Mudança Climática",
    "São Paulo",
]

_SYMBOL_ONLY_TEXTS = ["", " ", "   ", "!!!", "???", "***", "...", "🎉🎉🎉", "\t\n"]
