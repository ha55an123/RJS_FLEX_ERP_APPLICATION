"""
Unit tests for Gym Members API
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.gym_member import GymMember
from app.models.branch import Branch


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_gym.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_create_member():
    """Test creating a new gym member"""
    # First create a branch
    branch_response = client.post(
        "/api/v1/branches",
        json={
            "name": "Test Branch",
            "code": "TB001",
            "address": "123 Test Street",
            "city": "Lahore",
            "phone": "+92-300-1234567",
            "manager_name": "Test Manager",
            "capacity": 100,
            "operating_hours": "06:00-22:00",
            "status": "active"
        }
    )
    assert branch_response.status_code == 201
    branch_id = branch_response.json()["id"]

    # Create member
    response = client.post(
        "/api/v1/members",
        json={
            "branch_id": branch_id,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+92-300-1234567",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "address": "123 Main Street",
            "emergency_contact": "Jane Doe",
            "emergency_phone": "+92-300-7654321",
            "status": "active"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["email"] == "john.doe@example.com"
    assert data["status"] == "active"
    assert "member_code" in data


def test_get_members():
    """Test retrieving all members"""
    # Create a branch first
    branch_response = client.post(
        "/api/v1/branches",
        json={
            "name": "Test Branch",
            "code": "TB001",
            "address": "123 Test Street",
            "city": "Lahore",
            "phone": "+92-300-1234567",
            "manager_name": "Test Manager",
            "capacity": 100,
            "operating_hours": "06:00-22:00",
            "status": "active"
        }
    )
    branch_id = branch_response.json()["id"]

    # Create a member
    client.post(
        "/api/v1/members",
        json={
            "branch_id": branch_id,
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "+92-300-1234567",
            "gender": "female",
            "status": "active"
        }
    )

    # Get all members
    response = client.get("/api/v1/members")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(m["first_name"] == "Jane" for m in data)


def test_get_member_by_id():
    """Test retrieving a specific member by ID"""
    # Create branch and member
    branch_response = client.post(
        "/api/v1/branches",
        json={
            "name": "Test Branch",
            "code": "TB001",
            "address": "123 Test Street",
            "city": "Lahore",
            "phone": "+92-300-1234567",
            "manager_name": "Test Manager",
            "capacity": 100,
            "operating_hours": "06:00-22:00",
            "status": "active"
        }
    )
    branch_id = branch_response.json()["id"]

    member_response = client.post(
        "/api/v1/members",
        json={
            "branch_id": branch_id,
            "first_name": "Bob",
            "last_name": "Wilson",
            "email": "bob.wilson@example.com",
            "phone": "+92-300-1234567",
            "gender": "male",
            "status": "active"
        }
    )
    member_id = member_response.json()["id"]

    # Get member by ID
    response = client.get(f"/api/v1/members/{member_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Bob"
    assert data["last_name"] == "Wilson"


def test_update_member():
    """Test updating a member"""
    # Create branch and member
    branch_response = client.post(
        "/api/v1/branches",
        json={
            "name": "Test Branch",
            "code": "TB001",
            "address": "123 Test Street",
            "city": "Lahore",
            "phone": "+92-300-1234567",
            "manager_name": "Test Manager",
            "capacity": 100,
            "operating_hours": "06:00-22:00",
            "status": "active"
        }
    )
    branch_id = branch_response.json()["id"]

    member_response = client.post(
        "/api/v1/members",
        json={
            "branch_id": branch_id,
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice.johnson@example.com",
            "phone": "+92-300-1234567",
            "gender": "female",
            "status": "active"
        }
    )
    member_id = member_response.json()["id"]

    # Update member
    response = client.put(
        f"/api/v1/members/{member_id}",
        json={
            "phone": "+92-300-9999999",
            "address": "456 New Street"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "+92-300-9999999"
    assert data["address"] == "456 New Street"


def test_delete_member():
    """Test deleting a member"""
    # Create branch and member
    branch_response = client.post(
        "/api/v1/branches",
        json={
            "name": "Test Branch",
            "code": "TB001",
            "address": "123 Test Street",
            "city": "Lahore",
            "phone": "+92-300-1234567",
            "manager_name": "Test Manager",
            "capacity": 100,
            "operating_hours": "06:00-22:00",
            "status": "active"
        }
    )
    branch_id = branch_response.json()["id"]

    member_response = client.post(
        "/api/v1/members",
        json={
            "branch_id": branch_id,
            "first_name": "Charlie",
            "last_name": "Brown",
            "email": "charlie.brown@example.com",
            "phone": "+92-300-1234567",
            "gender": "male",
            "status": "active"
        }
    )
    member_id = member_response.json()["id"]

    # Delete member
    response = client.delete(f"/api/v1/members/{member_id}")
    assert response.status_code == 200

    # Verify deletion
    get_response = client.get(f"/api/v1/members/{member_id}")
    assert get_response.status_code == 404


def test_get_member_stats():
    """Test retrieving member statistics"""
    response = client.get("/api/v1/members/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_members" in data
    assert "active_members" in data
    assert "inactive_members" in data
