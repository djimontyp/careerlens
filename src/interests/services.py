from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.db import transaction

from accounts.models import User
from interests.models import MAX_NAME_LENGTH, Interest
from vacancies.models import Source


class InterestLimitReached(Exception):
    pass


class UnknownSourceCodes(ValueError):
    def __init__(self, codes: list[str]) -> None:
        self.codes = codes
        super().__init__(f"Unknown source codes: {', '.join(codes)}")


class TokenOverlap(ValueError):
    def __init__(self, tokens: list[str]) -> None:
        self.tokens = tokens
        super().__init__(f"Keywords and stop words overlap: {', '.join(tokens)}")


def derive_interest_name(name: str, keywords: list[str]) -> str:
    return name.strip() or ", ".join(keywords[:2])[:MAX_NAME_LENGTH]


def overlapping_tokens(keywords: list[str], stop_words: list[str]) -> list[str]:
    known = {keyword.casefold() for keyword in keywords}
    return [token for token in stop_words if token.casefold() in known]


@dataclass(frozen=True)
class InterestService:
    user: User

    def create(self, *, name: str, keywords: list[str], stop_words: list[str], source_codes: list[str]) -> Interest:
        with transaction.atomic():
            if Interest.objects.for_user(self.user).count() >= settings.INTERESTS_MAX_PER_USER:
                raise InterestLimitReached
            sources = self.resolve_sources(source_codes)
            interest = Interest.objects.create(
                user=self.user,
                name=derive_interest_name(name, keywords),
                keywords=keywords,
                stop_words=stop_words,
            )
            interest.sources.set(sources)
        return self.get(interest.pk)

    def update(
        self,
        interest_id: int,
        *,
        name: str | None = None,
        keywords: list[str] | None = None,
        stop_words: list[str] | None = None,
        source_codes: list[str] | None = None,
        is_active: bool | None = None,
    ) -> Interest:
        with transaction.atomic():
            interest = Interest.objects.for_user(self.user).get(pk=interest_id)
            if keywords is not None:
                interest.keywords = keywords
            if stop_words is not None:
                interest.stop_words = stop_words
            overlap = overlapping_tokens(interest.keywords, interest.stop_words)
            if overlap:
                raise TokenOverlap(overlap)
            if name is not None:
                interest.name = derive_interest_name(name, interest.keywords)
            if is_active is not None:
                interest.is_active = is_active
            if source_codes is not None:
                interest.sources.set(self.resolve_sources(source_codes))
            interest.save()
        return self.get(interest.pk)

    def delete(self, interest_id: int) -> None:
        Interest.objects.for_user(self.user).get(pk=interest_id).delete()

    def get(self, interest_id: int) -> Interest:
        return Interest.objects.for_user(self.user).with_sources().get(pk=interest_id)

    def resolve_sources(self, codes: list[str]) -> list[Source]:
        sources = {source.code: source for source in Source.objects.filter(code__in=codes)}
        unknown = [code for code in codes if code not in sources]
        if unknown:
            raise UnknownSourceCodes(unknown)
        return [sources[code] for code in codes]

    def list(self) -> list[Interest]:
        return list(Interest.objects.for_user(self.user).with_sources().by_priority())
