from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Source(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    icon_url = models.CharField(blank=True, max_length=1000, null=True)

    def __str__(self) -> str:
        return self.name


class Company(models.Model):
    name = models.CharField(max_length=200, unique=True)
    is_deftech = models.BooleanField(default=False, db_index=True)

    def __str__(self) -> str:
        return self.name


class Vacancy(models.Model):
    source = models.ForeignKey(Source, on_delete=models.PROTECT, related_name="vacancies")
    company = models.ForeignKey(
        Company,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="vacancies",
    )
    external_id = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    url = models.URLField(blank=True, max_length=1000, null=True)
    location = models.CharField(blank=True, max_length=500, null=True)
    posted_date = models.DateField(blank=True, null=True)
    is_deftech = models.BooleanField(default=False, db_index=True)
    scraped_at = models.DateTimeField(default=timezone.now)
    source_updated_at = models.DateTimeField(blank=True, null=True)
    description = models.TextField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["source", "external_id"], name="vacancies_vacancy_source_external_id_uniq"),
        ]

    def __str__(self) -> str:
        return f"{self.source.code}:{self.external_id}"


class VacancyState(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    vacancy = models.ForeignKey(Vacancy, on_delete=models.CASCADE)
    saved = models.BooleanField(default=False)
    hidden = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "vacancy"], name="vacancies_state_user_vacancy_uniq"),
        ]

    def __str__(self) -> str:
        return f"VacancyState({self.pk})"


class VacancyMatch(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vacancy_matches")
    vacancy = models.ForeignKey(Vacancy, on_delete=models.CASCADE, related_name="matches")
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    reason = models.TextField(blank=True)
    evidence = models.JSONField(default=dict, blank=True)
    precise = models.BooleanField(default=False)
    scored_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "vacancy"], name="vacancies_match_user_vacancy_uniq"),
            models.CheckConstraint(condition=models.Q(score__lte=100), name="vacancies_match_score_lte_100"),
        ]

    def __str__(self) -> str:
        return f"VacancyMatch({self.pk})"
