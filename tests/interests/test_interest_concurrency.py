from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from functools import partial
from queue import Queue
from time import monotonic

import pytest
from django.contrib.auth import get_user_model
from django.db import connection, connections, transaction
from django.test import override_settings

from interests.models import Interest
from interests.services import InterestLimitReached, InterestService, TokenOverlap

User = get_user_model()
pytestmark = pytest.mark.django_db(transaction=True)


def run_interest_mutation(mutate: Callable[[], Interest], backend_pids: Queue[int]) -> Interest:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET statement_timeout = '10s'")
            cursor.execute("SELECT pg_backend_pid()")
            backend_pids.put(cursor.fetchone()[0])
        return mutate()
    finally:
        connections.close_all()


def wait_for_interest_contention(pending: Future[Interest], backend_pids: Queue[int]) -> None:
    """Keep the first transaction open until the competing mutation overlaps it."""
    backend_pid = backend_pids.get(timeout=10)
    deadline = monotonic() + 10
    with connection.cursor() as cursor:
        while not pending.done():
            cursor.execute("SELECT cardinality(pg_blocking_pids(%s)) > 0", [backend_pid])
            if cursor.fetchone()[0]:
                return
            if monotonic() >= deadline:
                pytest.fail("The competing interest mutation neither completed nor waited on the first transaction")


@override_settings(INTERESTS_MAX_PER_USER=1)
def test_concurrent_creation_cannot_exceed_the_user_limit() -> None:
    user = User.objects.create_user(email="ada@example.com")
    service = InterestService(user)
    backend_pids: Queue[int] = Queue()

    with ThreadPoolExecutor(max_workers=1) as worker:
        with transaction.atomic():
            first = service.create(name="First", keywords=["python"], stop_words=[], source_codes=[])
            pending = worker.submit(
                run_interest_mutation,
                partial(service.create, name="Second", keywords=["go"], stop_words=[], source_codes=[]),
                backend_pids,
            )
            wait_for_interest_contention(pending, backend_pids)

        with pytest.raises(InterestLimitReached):
            pending.result(timeout=10)

    assert list(Interest.objects.for_user(user).values_list("id", flat=True)) == [first.id]


def test_concurrent_partial_updates_preserve_both_changes() -> None:
    service = InterestService(User.objects.create_user(email="ada@example.com"))
    interest = service.create(name="Original", keywords=["python"], stop_words=[], source_codes=[])
    backend_pids: Queue[int] = Queue()

    with ThreadPoolExecutor(max_workers=1) as worker:
        with transaction.atomic():
            service.update(interest.id, name="Renamed")
            pending = worker.submit(
                run_interest_mutation, partial(service.update, interest.id, is_active=False), backend_pids
            )
            wait_for_interest_contention(pending, backend_pids)

        pending.result(timeout=10)

    interest.refresh_from_db()
    assert (interest.name, interest.is_active) == ("Renamed", False)


def test_concurrent_update_validates_stop_words_against_committed_keywords() -> None:
    service = InterestService(User.objects.create_user(email="ada@example.com"))
    interest = service.create(name="Backend", keywords=["python"], stop_words=[], source_codes=[])
    backend_pids: Queue[int] = Queue()

    with ThreadPoolExecutor(max_workers=1) as worker:
        with transaction.atomic():
            service.update(interest.id, keywords=["go"])
            pending = worker.submit(
                run_interest_mutation, partial(service.update, interest.id, stop_words=["go"]), backend_pids
            )
            wait_for_interest_contention(pending, backend_pids)

        with pytest.raises(TokenOverlap):
            pending.result(timeout=10)

    interest.refresh_from_db()
    assert (interest.keywords, interest.stop_words) == (["go"], [])
