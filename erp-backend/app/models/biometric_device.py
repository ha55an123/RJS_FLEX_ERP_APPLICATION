from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class DeviceBrand(str, enum.Enum):
    ZKTECO    = "ZKTeco"
    ESSL      = "eSSL"
    SUPREMA   = "Suprema"
    HIKVISION = "Hikvision"
    ANVIZ     = "Anviz"
    FINGERTEC = "FingerTec"
    OTHER     = "Other"


class DeviceProtocol(str, enum.Enum):
    TCP_IP   = "tcp_ip"
    SDK      = "sdk"
    REST_API = "rest_api"
    WEBHOOK  = "webhook"
    CSV      = "csv"
    EXCEL    = "excel"


class SyncInterval(str, enum.Enum):
    EVERY_MINUTE  = "1min"
    EVERY_5MIN    = "5min"
    EVERY_10MIN   = "10min"
    EVERY_HOUR    = "1hour"
    DAILY         = "daily"
    MANUAL        = "manual"


class DeviceStatus(str, enum.Enum):
    ONLINE   = "online"
    OFFLINE  = "offline"
    ERROR    = "error"
    SYNCING  = "syncing"


class BiometricDevice(Base):
    __tablename__ = "biometric_devices"

    id              = Column(Integer, primary_key=True, index=True)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    device_name     = Column(String, nullable=False)
    device_uid      = Column(String, unique=True, index=True, nullable=False)
    brand           = Column(
        SAEnum(DeviceBrand, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=DeviceBrand.OTHER.value
    )
    model           = Column(String, nullable=True)
    serial_number   = Column(String, nullable=True, index=True)
    ip_address      = Column(String, nullable=True)
    port            = Column(Integer, default=4370)
    sdk_version     = Column(String, nullable=True)
    firmware_version = Column(String, nullable=True)

    protocol        = Column(
        SAEnum(DeviceProtocol, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=DeviceProtocol.TCP_IP.value
    )
    sync_interval   = Column(
        SAEnum(SyncInterval, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=SyncInterval.EVERY_5MIN.value
    )

    connection_status = Column(
        SAEnum(DeviceStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=DeviceStatus.OFFLINE.value
    )
    last_sync_at    = Column(DateTime, nullable=True)
    last_heartbeat  = Column(DateTime, nullable=True)
    is_active       = Column(Boolean, default=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch          = relationship("Branch", back_populates="devices")
    sync_logs       = relationship("DeviceSyncLog", back_populates="device")


class DeviceSyncLog(Base):
    __tablename__ = "device_sync_logs"

    id              = Column(Integer, primary_key=True, index=True)
    device_id       = Column(Integer, ForeignKey("biometric_devices.id"), nullable=False, index=True)
    sync_started_at = Column(DateTime, nullable=False)
    sync_ended_at   = Column(DateTime, nullable=True)
    records_fetched = Column(Integer, default=0)
    records_saved   = Column(Integer, default=0)
    status          = Column(String, default="success")   # success | failed | partial
    error_message   = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    device          = relationship("BiometricDevice", back_populates="sync_logs")
