import re
from collections.abc import Iterable, Sequence


def normalize_tokens(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    tokens: list[str] = []
    for value in values:
        token = " ".join(value.split())
        key = token.casefold()
        if not token or key in seen:
            continue
        seen.add(key)
        tokens.append(token)
    return tokens


def word_boundary_pattern(tokens: Sequence[str]) -> str:
    if not tokens:
        raise ValueError("At least one token is required to build a pattern")
    alternatives: list[str] = []
    for token in tokens:
        pattern = re.escape(token)
        if token[0].isalnum():
            pattern = f"(^|[^[:alnum:]]){pattern}"
        if token[-1].isalnum():
            pattern = f"{pattern}([^[:alnum:]]|$)"
        alternatives.append(pattern)
    return "|".join(alternatives)
