from collections.abc import Callable

import pytest
from pydantic import ValidationError

from interests.schemas import InterestIn, InterestPatchIn


def test_interest_in_normalises_tokens_and_sources() -> None:
    payload = InterestIn.model_validate(
        {
            "name": "  Backend ",
            "keywords": [" Python", "python", "Go  lang"],
            "stop_words": ["Senior", ""],
            "sources": [" dou", "dou", "djinni"],
        }
    )

    assert payload.name == "Backend"
    assert payload.keywords == ["Python", "Go lang"]
    assert payload.stop_words == ["Senior"]
    assert payload.sources == ["dou", "djinni"]


@pytest.mark.parametrize(
    ("data", "field", "fragment"),
    [
        ({"keywords": [" ", ""]}, "keywords", "At least one keyword"),
        ({"keywords": ["."]}, "keywords", "letter or digit"),
        ({"keywords": ["x" * 51]}, "keywords", "longer than 50"),
        ({"keywords": [f"k{index}" for index in range(31)]}, "keywords", "At most 30"),
        ({"keywords": ["python"], "stop_words": ["PYTHON"]}, "stop_words", "overlap: PYTHON"),
        ({"keywords": ["python"], "sources": ["x" * 21]}, "sources", "at most 20"),
        ({"keywords": ["python"], "sources": [f"s{index}" for index in range(31)]}, "sources", "at most 30"),
        ({"keywords": ["python"], "name": "n" * 101}, "name", "at most 100"),
        ({"keywords": ["python"], "extra": 1}, "extra", "Extra inputs"),
    ],
)
def test_interest_in_rejects_invalid_input_on_the_named_field(
    data: dict[str, object], field: str, fragment: str
) -> None:
    with pytest.raises(ValidationError) as error:
        InterestIn.model_validate(data)

    issue = error.value.errors()[0]
    assert issue["loc"][0] == field  # element errors such as a too-long source code carry the index as loc[1]
    assert fragment.casefold() in issue["msg"].casefold()


def test_interest_in_strips_name_before_checking_its_length() -> None:
    padded_name = "  " + "n" * 100 + "  "

    payload = InterestIn.model_validate({"keywords": ["python"], "name": padded_name})

    assert payload.name == "n" * 100

    with pytest.raises(ValidationError) as error:
        InterestIn.model_validate({"keywords": ["python"], "name": "n" * 101})

    issue = error.value.errors()[0]
    assert issue["loc"] == ("name",)


def test_interest_patch_strips_name_before_checking_its_length() -> None:
    padded_name = "  " + "n" * 100 + "  "

    payload = InterestPatchIn.model_validate({"name": padded_name})

    assert payload.name == "n" * 100

    with pytest.raises(ValidationError) as error:
        InterestPatchIn.model_validate({"name": "n" * 101})

    issue = error.value.errors()[0]
    assert issue["loc"] == ("name",)


def test_interest_patch_requires_a_change_and_checks_overlap_only_when_both_lists_present() -> None:
    with pytest.raises(ValidationError, match="At least one field"):
        InterestPatchIn.model_validate({})

    assert InterestPatchIn.model_validate({"stop_words": ["python"]}).stop_words == ["python"]
    assert InterestPatchIn.model_validate({"is_active": False}).is_active is False
    with pytest.raises(ValidationError, match="overlap"):
        InterestPatchIn.model_validate({"keywords": ["python"], "stop_words": ["Python"]})


FORBIDDEN_CHARACTERS = [
    pytest.param("\x00", id="nul"),
    pytest.param("​", id="zero-width-space"),
    pytest.param("­", id="soft-hyphen"),
    pytest.param("‮", id="right-to-left-override"),
    pytest.param("\ud800", id="lone-surrogate"),
    pytest.param("", id="private-use"),
    pytest.param("\x07", id="bell"),
]


@pytest.mark.parametrize("character", FORBIDDEN_CHARACTERS)
@pytest.mark.parametrize(
    ("build", "field"),
    [
        (lambda value: {"keywords": [f"py{value}thon"]}, "keywords"),
        (lambda value: {"keywords": ["python"], "stop_words": [f"se{value}nior"]}, "stop_words"),
        (lambda value: {"keywords": ["python"], "name": f"na{value}me"}, "name"),
        (lambda value: {"keywords": ["python"], "sources": [f"d{value}ou"]}, "sources"),
    ],
)
@pytest.mark.parametrize("schema", [InterestIn, InterestPatchIn])
def test_control_format_surrogate_and_private_use_characters_are_rejected(
    schema: type[InterestIn] | type[InterestPatchIn],
    build: Callable[[str], dict[str, object]],
    field: str,
    character: str,
) -> None:
    with pytest.raises(ValidationError) as error:
        schema.model_validate(build(character))

    issue = error.value.errors()[0]
    assert issue["loc"][0] == field
    assert "not allowed" in issue["msg"] or "valid string" in issue["msg"]


def test_nfd_and_nfc_spellings_are_one_token() -> None:
    payload = InterestIn.model_validate({"keywords": ["café", "café", "CAFÉ"]})

    assert payload.keywords == ["café"]


def test_nfd_keyword_overlaps_an_nfc_stop_word() -> None:
    with pytest.raises(ValidationError, match="overlap"):
        InterestIn.model_validate({"keywords": ["café"], "stop_words": ["café"]})


@pytest.mark.parametrize("sources", [["   "], ["\t"], [""]])
def test_blank_source_codes_are_rejected_rather_than_widening_to_every_source(sources: list[str]) -> None:
    for schema, data in (
        (InterestIn, {"keywords": ["python"], "sources": sources}),
        (InterestPatchIn, {"sources": sources}),
    ):
        with pytest.raises(ValidationError) as error:
            schema.model_validate(data)

        assert error.value.errors()[0]["loc"][:2] == ("sources", 0)


def test_padded_source_codes_are_stripped_before_the_length_check() -> None:
    payload = InterestIn.model_validate({"keywords": ["python"], "sources": ["  " + "s" * 20 + "  ", " dou "]})

    assert payload.sources == ["s" * 20, "dou"]


@pytest.mark.parametrize(
    "data",
    [{"name": None}, {"keywords": None}, {"stop_words": None}, {"sources": None}, {"is_active": None}],
)
def test_interest_patch_rejects_explicit_null_on_the_named_field(data: dict[str, None]) -> None:
    with pytest.raises(ValidationError) as error:
        InterestPatchIn.model_validate(data)

    issue = error.value.errors()[0]
    assert issue["loc"] == (next(iter(data)),)
    assert "null" in issue["msg"].casefold()


@pytest.mark.parametrize("value", ["true", "false", 1, 0, "yes"])
def test_interest_patch_requires_a_strict_boolean_for_is_active(value: object) -> None:
    with pytest.raises(ValidationError) as error:
        InterestPatchIn.model_validate({"is_active": value})

    assert error.value.errors()[0]["loc"] == ("is_active",)


def test_interest_patch_keeps_omitted_fields_unset() -> None:
    payload = InterestPatchIn.model_validate({"is_active": True})

    assert payload.model_fields_set == {"is_active"}


def test_error_messages_truncate_the_echoed_token() -> None:
    with pytest.raises(ValidationError) as error:
        InterestIn.model_validate({"keywords": ["x" * 5000]})

    message = error.value.errors()[0]["msg"]
    assert len(message) < 200
    assert message.endswith("…")


def test_over_long_elements_are_rejected_before_any_other_token_work() -> None:
    with pytest.raises(ValidationError) as error:
        InterestIn.model_validate({"keywords": ["ok", "x" * 5000 + "\x00"]})

    message = error.value.errors()[0]["msg"]
    assert "longer than 50" in message
    assert "not allowed" not in message
