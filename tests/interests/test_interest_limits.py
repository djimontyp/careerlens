import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings

from interests.models import Interest
from interests.services import InterestLimitReached, InterestService

User = get_user_model()


@pytest.mark.django_db
@override_settings(INTERESTS_MAX_PER_USER=2)
def test_another_users_full_quota_does_not_block_creation() -> None:
    ada = User.objects.create_user(email="ada@example.com")
    grace = User.objects.create_user(email="grace@example.com")
    grace_service = InterestService(grace)
    grace_service.create(name="a", keywords=["a"], stop_words=[], source_codes=[])
    grace_service.create(name="b", keywords=["b"], stop_words=[], source_codes=[])
    with pytest.raises(InterestLimitReached):
        grace_service.create(name="c", keywords=["c"], stop_words=[], source_codes=[])

    created = InterestService(ada).create(name="x", keywords=["python"], stop_words=[], source_codes=[])

    assert created.user_id == ada.id
    assert Interest.objects.for_user(ada).count() == 1
    assert Interest.objects.for_user(grace).count() == 2
