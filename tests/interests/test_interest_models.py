import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from interests.models import Interest

User = get_user_model()


@pytest.mark.django_db
def test_database_rejects_empty_keywords_and_empty_name() -> None:
    user = User.objects.create_user(email="ada@example.com")

    with transaction.atomic(), pytest.raises(IntegrityError):
        Interest.objects.create(user=user, name="x", keywords=[])
    with transaction.atomic(), pytest.raises(IntegrityError):
        Interest.objects.create(user=user, name="", keywords=["python"])
    with transaction.atomic(), pytest.raises(IntegrityError):
        Interest.objects.create(user=user, name="x", keywords=[f"k{index}" for index in range(31)])


@pytest.mark.django_db
def test_database_rejects_more_than_thirty_stop_words() -> None:
    user = User.objects.create_user(email="ada@example.com")

    with transaction.atomic(), pytest.raises(IntegrityError, match="interests_interest_stop_words_max"):
        Interest.objects.create(
            user=user, name="x", keywords=["python"], stop_words=[f"s{index}" for index in range(31)]
        )
    Interest.objects.create(user=user, name="x", keywords=["python"], stop_words=[f"s{index}" for index in range(30)])


@pytest.mark.django_db
def test_lists_round_trip_and_interests_are_removed_with_their_user() -> None:
    user = User.objects.create_user(email="ada@example.com")
    interest = Interest.objects.create(user=user, name="x", keywords=["C++", "розробник"], stop_words=["senior"])

    interest.refresh_from_db()
    assert interest.keywords == ["C++", "розробник"]
    assert interest.stop_words == ["senior"]
    assert str(interest) == f"Interest({interest.pk})"

    user.delete()
    assert not Interest.objects.filter(pk=interest.pk).exists()


@pytest.mark.django_db
def test_by_priority_puts_active_first_then_newest() -> None:
    user = User.objects.create_user(email="ada@example.com")
    paused = Interest.objects.create(user=user, name="paused", keywords=["a"], is_active=False)
    older = Interest.objects.create(user=user, name="older", keywords=["b"])
    newer = Interest.objects.create(user=user, name="newer", keywords=["c"])

    assert list(Interest.objects.for_user(user).by_priority()) == [newer, older, paused]


@pytest.mark.django_db
def test_by_priority_keeps_a_later_paused_interest_after_older_active_ones() -> None:
    user = User.objects.create_user(email="ada@example.com")
    older = Interest.objects.create(user=user, name="older", keywords=["a"])
    newer = Interest.objects.create(user=user, name="newer", keywords=["b"])
    paused = Interest.objects.create(user=user, name="paused", keywords=["c"], is_active=False)

    assert list(Interest.objects.for_user(user).by_priority()) == [newer, older, paused]


@pytest.mark.django_db
def test_first_and_last_use_the_declared_ordering() -> None:
    user = User.objects.create_user(email="ada@example.com")
    older = Interest.objects.create(user=user, name="older", keywords=["b"])
    newer = Interest.objects.create(user=user, name="newer", keywords=["c"])

    ordered = Interest.objects.for_user(user).by_priority()
    assert ordered.first() == newer
    assert ordered.last() == older
