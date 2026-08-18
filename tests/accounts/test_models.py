from django.contrib.auth import get_user_model


def test_accounts_user_uses_unique_email_identity() -> None:
    user_model = get_user_model()

    assert user_model._meta.label == "accounts.User"
    assert user_model.USERNAME_FIELD == "email"
    assert user_model._meta.get_field("email").unique is True
