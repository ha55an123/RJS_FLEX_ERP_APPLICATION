"""
Unit tests for Gym Attendance API
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from app.main import app
from app.core.database import Base, get_db
from app.models.gym_member import GymMember
from app.models.branch import Branch
from app.models.gym_attendance import GymAttendance


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_gym_attendance.db"
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


def test_check_in_member():
    """Test checking in a member"""
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
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+92-300-1234567",
            "gender": "male",
            "status": "active"
        }
    )
    member_id = member_response.json()["id"]

    # Check in member
    response = client.post(
        "/api/v1/attendance/check-in",
        json={
            "member_id": member_id,
            "branch_id": branch_id
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["member_id"] == member_id
    assert data["branch_id"] == branch_id
    assert data["status"] == "present"
    assert "check_in_time" in data


def test_check_out_member():
    """Test checking out a member"""
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
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "+92-300-1234567",
            "gender": "female",
            "status": "active"
        }
    )
    member_id = member_response.json()["id"]

    # Check in first
    checkin_response = client.post(
        "/api/v1/attendance/check-in",
        json={
            "member_id": member_id,
            "branch_id": branch_id
        }
    )
    attendance_id = checkin_response.json()["id"]

    # Check out member
    response = client.post(
        f"/api/v1/attendance/{attendance_id}/check-out"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "checked_out"
    assert "check_out_time" in data


def test_get_attendance_records():
    """Test retrieving attendance records"""
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

    # Create attendance record
    client.post(
        "/api/v1/attendance/check-in",
        json={
            "member_id": member_id,
            "branch_id": branch_id
        }
    )

    # Get all attendance records
    response = client.get("/api/v1/attendance")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_get_daily_report():
    """Test retrieving daily attendance report"""
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

    # Create attendance record
    client.post(
        "/api/v1/attendance/check-in",
        json={
            "member_id": member_id,
            "branch_id": branch_id
        }
    )

    # Get daily report
    today = datetime.now().strftime("%Y-%m-%d")
    response = client.get(f"/api/v1/attendance/daily/{today}")
    assert response.status_code == 200
    data = response.json()
    assert "date" in data
    assert "total_check_ins" in data
    assert "records" in data


def test_get_member_attendance_history():
    """Test retrieving attendance history for a specific member"""
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

    # Create attendance record
    client.post(
        "/api/v1/attendance/check-in",
        json={
            "member_id": member_id,
            "branch_id": branch_id
        }
    )

    # Get member attendance history
    response = client.get(f"/api/v1/attendance/member/{member_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["member_id"] == member_id
