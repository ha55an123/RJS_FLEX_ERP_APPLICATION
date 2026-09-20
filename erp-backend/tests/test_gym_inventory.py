"""Gym inventory API tests (auth + create/list flow)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.auth_dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.branch import Branch

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_gym_inventory.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


def _seed_branch(db):
    branch = Branch(name="Main", code="MAIN", is_active=True)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch.id


def test_inventory_create_and_list():
    db = TestingSessionLocal()
    branch_id = _seed_branch(db)
    db.close()

    payload = {
        "branch_id": branch_id,
        "name": "Creatine 500g",
        "category": "supplements",
        "quantity": 10,
        "minimum_stock": 2,
        "purchase_price": 2500,
    }
    create = client.post("/api/v1/inventory/", json=payload)
    assert create.status_code == 201, create.text
    body = create.json()
    assert body["name"] == "Creatine 500g"
    assert body["quantity"] == 10
    assert body["sku"]

    listing = client.get("/api/v1/inventory/", params={"page_size": 50})
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert any(i["name"] == "Creatine 500g" for i in items)


def test_inventory_create_without_trailing_slash_redirects():
    payload = {"name": "Redirect Test", "category": "other", "quantity": 1}
    response = client.post("/api/v1/inventory", json=payload, follow_redirects=False)
    assert response.status_code in (307, 308)
