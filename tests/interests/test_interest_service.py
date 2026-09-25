import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings

from interests.models import MAX_NAME_LENGTH, Interest
from interests.services import InterestLimitReached, InterestService, TokenOverlap, UnknownSourceCodes
from vacancies.models import Source

User = get_user_model()


@pytest.mark.django_db
def test_create_derives_name_resolves_sources_and_lists_active_first() -> None:
    user = User.objects.create_user(email="ada@example.com")
    dou = Source.objects.create(code="dou", name="DOU")
    service = InterestService(user)

    named = service.create(name="  Backend  ", keywords=["python", "django"], stop_words=[], source_codes=["dou"])
    derived = service.create(name="", keywords=["Go", "gRPC", "k8s"], stop_words=["junior"], source_codes=[])
    service.update(named.id, is_active=False)

    assert named.name == "Backend"
    assert list(named.sources.all()) == [dou]
    assert derived.name == "Go, gRPC"
    assert [interest.id for interest in service.list()] == [derived.id, named.id]


@pytest.mark.django_db
def test_derived_name_never_exceeds_the_column_length() -> None:
    service = InterestService(User.objects.create_user(email="ada@example.com"))

    interest = service.create(name="", keywords=["a" * 50, "b" * 50], stop_words=[], source_codes=[])
    renamed = service.update(interest.id, name="", keywords=["c" * 50, "d" * 50])

    assert len(interest.name) == MAX_NAME_LENGTH
    assert len(renamed.name) == MAX_NAME_LENGTH
    assert renamed.name.startswith("c" * 50)


@pytest.mark.django_db
@override_settings(INTERESTS_MAX_PER_USER=2)
def test_create_stops_at_the_configured_limit_counting_paused_interests() -> None:
    service = InterestService(User.objects.create_user(email="ada@example.com"))
    first = service.create(name="a", keywords=["a"], stop_words=[], source_codes=[])
    service.create(name="b", keywords=["b"], stop_words=[], source_codes=[])
    service.update(first.id, is_active=False)

    with pytest.raises(InterestLimitReached):
        service.create(name="c", keywords=["c"], stop_words=[], source_codes=[])
    assert Interest.objects.count() == 2


@pytest.mark.django_db
def test_unknown_source_codes_are_rejected_and_nothing_is_written() -> None:
    Source.objects.create(code="dou", name="DOU")
    service = InterestService(User.objects.create_user(email="ada@example.com"))

    with pytest.raises(UnknownSourceCodes) as error:
        service.create(name="", keywords=["python"], stop_words=[], source_codes=["dou", "nope", "also-nope"])

    assert error.value.codes == ["nope", "also-nope"]
    assert Interest.objects.count() == 0


@pytest.mark.django_db
def test_update_applies_partial_changes_and_rederives_name_from_new_keywords() -> None:
    user = User.objects.create_user(email="ada@example.com")
    dou = Source.objects.create(code="dou", name="DOU")
    service = InterestService(user)
    interest = service.create(name="Old", keywords=["python"], stop_words=["senior"], source_codes=["dou"])

    untouched = service.update(interest.id, is_active=False)
    assert (untouched.name, untouched.keywords, untouched.stop_words, list(untouched.sources.all())) == (
        "Old",
        ["python"],
        ["senior"],
        [dou],
    )

    changed = service.update(interest.id, name="", keywords=["Go", "Rust"], stop_words=[], source_codes=[])
    assert changed.name == "Go, Rust"
    assert changed.stop_words == []
    assert list(changed.sources.all()) == []
    assert changed.is_active is False


@pytest.mark.django_db
def test_update_rejects_overlap_with_stored_values() -> None:
    service = InterestService(User.objects.create_user(email="ada@example.com"))
    interest = service.create(name="x", keywords=["python", "go"], stop_words=[], source_codes=[])

    with pytest.raises(TokenOverlap) as error:
        service.update(interest.id, stop_words=["GO", "junior"])

    assert error.value.tokens == ["GO"]
    interest.refresh_from_db()
    assert interest.stop_words == []


@pytest.mark.django_db
def test_other_users_interests_are_invisible_to_update_and_delete() -> None:
    owner = User.objects.create_user(email="ada@example.com")
    stranger = User.objects.create_user(email="grace@example.com")
    interest = InterestService(owner).create(name="x", keywords=["python"], stop_words=[], source_codes=[])

    with pytest.raises(Interest.DoesNotExist):
        InterestService(stranger).update(interest.id, is_active=False)
    interest.refresh_from_db()
    assert interest.is_active is True
    with pytest.raises(Interest.DoesNotExist):
        InterestService(stranger).delete(interest.id)
    assert InterestService(stranger).list() == []

    InterestService(owner).delete(interest.id)
    assert not Interest.objects.filter(pk=interest.id).exists()
