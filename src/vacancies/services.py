from dataclasses import dataclass
from datetime import date
from typing import Literal

from django.core import signing
from django.core.signing import BadSignature
from django.db.models import F, Q
from django.utils import timezone
from pydantic import BaseModel, ValidationError

from accounts.models import User
from vacancies.models import Vacancy, VacancyState

FeedMode = Literal["active", "saved", "hidden"]


class FeedCursor(BaseModel):
    version: Literal[1] = 1
    mode: FeedMode
    posted_date: date | None
    vacancy_id: int


class InvalidFeedCursor(ValueError):
    pass


@dataclass(frozen=True)
class FeedPage:
    items: list[Vacancy]
    next_cursor: str | None


@dataclass(frozen=True)
class VacancyFeedService:
    user: User

    cursor_salt = "careerlens.feed.cursor"

    def list(self, *, mode: FeedMode, cursor: str | None, limit: int) -> FeedPage:
        vacancies = Vacancy.feed.for_user(self.user).order_by(F("posted_date").desc(nulls_last=True), "-id")
        match mode:
            case "active":
                vacancies = vacancies.filter(Q(state_hidden=False) | Q(state_hidden__isnull=True))
            case "saved":
                vacancies = vacancies.filter(Q(state_saved=True))
            case "hidden":
                vacancies = vacancies.filter(Q(state_hidden=True))

        if cursor:
            decoded = self.decode_cursor(cursor, mode)
            if decoded.posted_date:
                vacancies = vacancies.filter(
                    Q(posted_date__lt=decoded.posted_date)
                    | Q(posted_date=decoded.posted_date, id__lt=decoded.vacancy_id)
                    | Q(posted_date__isnull=True)
                )
            else:
                vacancies = vacancies.filter(posted_date__isnull=True, id__lt=decoded.vacancy_id)

        items = list(vacancies[: limit + 1])
        has_more = len(items) > limit
        items = items[:limit]
        next_cursor = self.encode_cursor(items[-1], mode) if has_more else None
        return FeedPage(items=items, next_cursor=next_cursor)

    def get(self, vacancy_id: int) -> Vacancy:
        return Vacancy.feed.for_user(self.user).get(pk=vacancy_id)

    def decode_cursor(self, value: str, mode: FeedMode) -> FeedCursor:
        try:
            cursor = FeedCursor.model_validate(signing.loads(value, salt=self.cursor_salt))
        except BadSignature, ValidationError, TypeError:
            raise InvalidFeedCursor from None
        if cursor.mode != mode:
            raise InvalidFeedCursor
        return cursor

    def encode_cursor(self, vacancy: Vacancy, mode: FeedMode) -> str:
        return signing.dumps(
            FeedCursor(mode=mode, posted_date=vacancy.posted_date, vacancy_id=vacancy.id).model_dump(mode="json"),
            salt=self.cursor_salt,
            compress=True,
        )


@dataclass(frozen=True)
class VacancyStateService:
    user: User

    def patch(
        self,
        vacancy_id: int,
        *,
        saved: bool | None,
        hidden: bool | None,
        seen: bool | None,
    ) -> VacancyState:
        vacancy = Vacancy.objects.get(pk=vacancy_id)
        state, _ = VacancyState.objects.get_or_create(user=self.user, vacancy=vacancy)
        update_fields: list[str] = []
        if saved is not None:
            state.saved = saved
            update_fields.append("saved")
        if hidden is not None:
            state.hidden = hidden
            update_fields.append("hidden")
        if seen and state.seen_at is None:
            state.seen_at = timezone.now()
            update_fields.append("seen_at")
        if update_fields:
            state.save(update_fields=update_fields)
        return state
