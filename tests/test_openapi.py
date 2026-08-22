import json
from pathlib import Path

from api.root import api


def test_openapi_contract_is_complete_and_current() -> None:
    schema = api.get_openapi_schema()
    committed_schema = json.loads(Path("openapi.json").read_text())

    assert committed_schema == json.loads(json.dumps(schema))
    assert schema["info"]["description"]
    declared_tags = {tag["name"] for tag in schema["tags"]}
    assert all(tag["description"] for tag in schema["tags"])

    for path in schema["paths"].values():
        for method, operation in path.items():
            assert operation["summary"]
            assert operation["description"]
            assert set(operation["tags"]) <= declared_tags
            assert operation["responses"]
            assert all(response["description"] for response in operation["responses"].values())
            assert all(
                parameter.get("description") and parameter.get("schema") for parameter in operation["parameters"]
            )

            if {"SessionAuth": []} in operation.get("security", []):
                assert 401 in operation["responses"]
                if method in {"post", "put", "patch", "delete"}:
                    assert 403 in operation["responses"]
                    documented_inputs = {(parameter["in"], parameter["name"]) for parameter in operation["parameters"]}
                    assert {("cookie", "csrftoken"), ("header", "X-CSRFToken")} <= documented_inputs

            for response in operation["responses"].values():
                media = response.get("content", {}).get("application/json")
                if not media:
                    continue
                referenced_schema = media.get("schema", {}).get("$ref", "").rsplit("/", 1)[-1]
                assert media.get("example") or schema["components"]["schemas"][referenced_schema].get("examples")

    for component in schema["components"]["schemas"].values():
        assert all(property_schema.get("description") for property_schema in component["properties"].values())

    me = schema["paths"]["/api/v1/me"]["get"]
    assert set(me["responses"]) == {200, 401}
    assert "Set-Cookie" in me["responses"][200]["headers"]

    avatar = schema["components"]["schemas"]["MeOut"]["properties"]["avatar_url"]
    assert {variant.get("format") for variant in avatar["anyOf"]} == {"uri", None}

    logout = schema["paths"]["/api/v1/logout"]["post"]
    assert set(logout["responses"]) == {204, 401, 403}
    assert {(parameter["in"], parameter["name"]) for parameter in logout["parameters"]} == {
        ("cookie", "csrftoken"),
        ("header", "X-CSRFToken"),
    }
    assert "Set-Cookie" in logout["responses"][204]["headers"]

    health = schema["paths"]["/health"]["get"]
    assert health["tags"] == ["health"]
    assert health["responses"][503]["content"]["application/json"]["example"] == {"status": "error"}
