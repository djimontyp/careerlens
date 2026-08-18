from ninja import Schema


class MeOut(Schema):
    id: int
    email: str
    first_name: str
    last_name: str
