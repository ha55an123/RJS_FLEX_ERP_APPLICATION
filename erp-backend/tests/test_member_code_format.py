"""Member ID (RJS-XXXXXX) generation tests."""

import re
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.auth_dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.branch import Branch

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_member_code.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

RJS_CODE = re.compile(r"^RJS-\d{6}$")


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return User(
        id=1,
        username="testadmin",
        email="testadmin@example.com",
        hashed_password="x",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_member_codes_are_unique_and_formatted():
    db = TestingSessionLocal()
    branch = Branch(name="HQ", code="HQ1", is_active=True)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    branch_id = branch.id
    db.close()

    codes = []
    for i in range(3):
        res = client.post(
            "/api/v1/members/",
            json={"branch_id": branch_id, "first_name": f"M{i}", "last_name": "Test"},
        )
        assert res.status_code == 201, res.text
        code = res.json()["member_code"]
        assert RJS_CODE.match(code), code
        codes.append(code)

    assert len(set(codes)) == 3
