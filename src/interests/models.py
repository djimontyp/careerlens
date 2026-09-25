from __future__ import annotations

from typing import TYPE_CHECKING

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Prefetch, Q
from django.utils import timezone

from interests.matching import word_boundary_pattern
from vacancies.models import Source

if TYPE_CHECKING:
    from accounts.models import User

MAX_TOKENS = 30
MAX_TOKEN_LENGTH = 50
MAX_NAME_LENGTH = 100


class InterestQuerySet(models.QuerySet["Interest"]):
    def for_user(self, user: User) -> InterestQuerySet:
        return self.filter(user=user)

    def active(self) -> InterestQuerySet:
        return self.filter(is_active=True)

    def with_sources(self) -> InterestQuerySet:
        return self.prefetch_related(Prefetch("sources", queryset=Source.objects.catalog()))

    def by_priority(self) -> InterestQuerySet:
        return self.order_by("-is_active", "-created_at", "-id")

    def vacancy_filter(self) -> Q:
        interests = list(self.prefetch_related(None).with_sources())
        if not interests:
            return Q(pk__in=[])
        scope = Q()
        for interest in interests:
            scope |= interest.vacancy_filter()
        return scope


class Interest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interests")
    name = models.CharField(max_length=MAX_NAME_LENGTH)
    keywords = ArrayField(models.CharField(max_length=MAX_TOKEN_LENGTH), size=MAX_TOKENS)
    stop_words = ArrayField(models.CharField(max_length=MAX_TOKEN_LENGTH), size=MAX_TOKENS, blank=True, default=list)
    sources = models.ManyToManyField(Source, blank=True, related_name="interests")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    objects = InterestQuerySet.as_manager()

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(keywords__len__gt=0), name="interests_interest_keywords_not_empty"),
            models.CheckConstraint(condition=Q(keywords__len__lte=MAX_TOKENS), name="interests_interest_keywords_max"),
            models.CheckConstraint(
                condition=Q(stop_words__len__lte=MAX_TOKENS), name="interests_interest_stop_words_max"
            ),
            models.CheckConstraint(condition=~Q(name=""), name="interests_interest_name_not_empty"),
        ]

    def __str__(self) -> str:
        return f"Interest({self.pk})"

    def vacancy_filter(self) -> Q:
        if not self.keywords:
            return Q(pk__in=[])
        keyword_pattern = word_boundary_pattern(self.keywords)
        scope = Q(title__iregex=keyword_pattern) | Q(description__iregex=keyword_pattern)
        if self.stop_words:
            scope &= ~Q(title__iregex=word_boundary_pattern(self.stop_words))
        source_ids = [source.id for source in self.sources.all()]
        if source_ids:
            scope &= Q(source_id__in=source_ids)
        return scope
