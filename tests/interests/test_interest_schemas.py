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
