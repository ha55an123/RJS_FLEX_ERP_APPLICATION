from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Time,
    ForeignKey, Text, Float, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class CheckInMethod(str, enum.Enum):
    MANUAL       = "manual"
    QR_CODE      = "qr_code"
    BARCODE      = "barcode"
    RFID         = "rfid"
    FINGERPRINT  = "fingerprint"
    FACE         = "face"


class AttendanceStatus(str, enum.Enum):
    CHECKED_IN   = "checked_in"
    CHECKED_OUT  = "checked_out"
    ABSENT       = "absent"
    LATE         = "late"
    EARLY_EXIT   = "early_exit"


class GymAttendance(Base):
    __tablename__ = "gym_attendance"

    id              = Column(Integer, primary_key=True, index=True)
    member_id       = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    device_id       = Column(Integer, ForeignKey("biometric_devices.id"), nullable=True)

    attendance_date = Column(Date, nullable=False, index=True)
    check_in_time   = Column(DateTime, nullable=True)
    check_out_time  = Column(DateTime, nullable=True)
    total_hours     = Column(Float, nullable=True)

    method          = Column(
        SAEnum(CheckInMethod, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=CheckInMethod.MANUAL.value
    )
    status          = Column(
        SAEnum(AttendanceStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=AttendanceStatus.CHECKED_IN.value
    )
    notes           = Column(Text, nullable=True)
    recorded_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    member          = relationship("GymMember", back_populates="attendance_records")


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id              = Column(Integer, primary_key=True, index=True)
    staff_id        = Column(Integer, ForeignKey("gym_staff.id"), nullable=False, index=True)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    device_id       = Column(Integer, ForeignKey("biometric_devices.id"), nullable=True)

    attendance_date = Column(Date, nullable=False, index=True)
    check_in_time   = Column(DateTime, nullable=True)
    check_out_time  = Column(DateTime, nullable=True)
    total_hours     = Column(Float, nullable=True)
    overtime_hours  = Column(Float, default=0.0)

    method          = Column(
        SAEnum(CheckInMethod, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=CheckInMethod.MANUAL.value
    )
    status          = Column(String, nullable=False, default="present")
    # present | absent | late | half_day | leave | holiday | overtime
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    staff           = relationship("GymStaff", back_populates="attendance_records")


class TrainerSchedule(Base):
    __tablename__ = "trainer_schedules"

    id              = Column(Integer, primary_key=True, index=True)
    trainer_id      = Column(Integer, ForeignKey("gym_staff.id"), nullable=False, index=True)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    day_of_week     = Column(Integer, nullable=False)   # 0=Mon … 6=Sun
    start_time      = Column(String, nullable=False)    # "09:00"
    end_time        = Column(String, nullable=False)    # "17:00"
    is_available    = Column(Boolean, default=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    trainer         = relationship("GymStaff", back_populates="schedules")
