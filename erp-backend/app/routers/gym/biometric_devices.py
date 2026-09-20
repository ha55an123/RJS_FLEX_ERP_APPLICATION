from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.biometric_device import (
    BiometricDevice, DeviceSyncLog,
    DeviceBrand, DeviceProtocol, SyncInterval, DeviceStatus
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/biometric-devices", tags=["Biometric Devices"])

MANAGER_ROLES = ["super_admin", "gym_owner", "manager"]


class DeviceCreate(BaseModel):
    branch_id: int
    device_name: str
    device_uid: str
    brand: DeviceBrand = DeviceBrand.OTHER
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    port: int = 4370
    sdk_version: Optional[str] = None
    firmware_version: Optional[str] = None
    protocol: DeviceProtocol = DeviceProtocol.TCP_IP
    sync_interval: SyncInterval = SyncInterval.EVERY_5MIN
    notes: Optional[str] = None
    is_active: bool = True


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[DeviceProtocol] = None
    sync_interval: Optional[SyncInterval] = None
    firmware_version: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


def _serialize(d: BiometricDevice) -> dict:
    return {
        "id": d.id, "branch_id": d.branch_id,
        "device_name": d.device_name, "device_uid": d.device_uid,
        "brand": d.brand, "model": d.model, "serial_number": d.serial_number,
        "ip_address": d.ip_address, "port": d.port,
        "sdk_version": d.sdk_version, "firmware_version": d.firmware_version,
        "protocol": d.protocol, "sync_interval": d.sync_interval,
        "connection_status": d.connection_status,
        "last_sync_at": d.last_sync_at, "last_heartbeat": d.last_heartbeat,
        "is_active": d.is_active, "notes": d.notes,
        "created_at": d.created_at, "updated_at": d.updated_at,
    }


@router.get("/")
def list_devices(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    logger.info(f"Listing devices with branch_id filter: {branch_id}")
    q = db.query(BiometricDevice)
    if branch_id:
        q = q.filter(BiometricDevice.branch_id == branch_id)
    devices = q.order_by(BiometricDevice.device_name).all()
    logger.info(f"Found {len(devices)} devices")
    return [_serialize(d) for d in devices]


@router.get("/{device_id}")
def get_device(device_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    d = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    if not d:
        raise HTTPException(404, "Device not found")
    return _serialize(d)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_device(data: DeviceCreate, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    try:
        logger.info(f"Creating device with data: {data.model_dump()}")
    except Exception as e:
        logger.error(f"Error logging device data: {e}")
    
    # Check for duplicate device_uid
    existing = db.query(BiometricDevice).filter(BiometricDevice.device_uid == data.device_uid).first()
    if existing:
        logger.warning(f"Device UID {data.device_uid} already registered (device_id: {existing.id})")
        raise HTTPException(400, "Device UID already registered")
    
    # Check if branch exists
    from app.models.branch import Branch
    branch = db.query(Branch).filter(Branch.id == data.branch_id).first()
    if not branch:
        logger.error(f"Branch {data.branch_id} not found")
        raise HTTPException(400, f"Branch {data.branch_id} not found")
    
    try:
        d = BiometricDevice(**data.model_dump())
        db.add(d)
        db.commit()
        db.refresh(d)
        logger.info(f"Device created successfully with id: {d.id}")
        return _serialize(d)
    except Exception as e:
        logger.error(f"Failed to create device: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(500, f"Failed to create device: {str(e)}")


@router.put("/{device_id}")
def update_device(
    device_id: int, data: DeviceUpdate,
    db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))
):
    d = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    if not d:
        raise HTTPException(404, "Device not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(d, k, v)
    d.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(d)
    return _serialize(d)


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    d = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    if not d:
        raise HTTPException(404, "Device not found")
    d.is_active = False
    d.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Device deactivated"}


@router.post("/{device_id}/sync")
def trigger_sync(device_id: int, db: Session = Depends(get_db), _=Depends(require_role(MANAGER_ROLES))):
    """Manually trigger a sync log entry — actual SDK sync handled by background worker."""
    d = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    if not d:
        raise HTTPException(404, "Device not found")
    log = DeviceSyncLog(
        device_id=device_id,
        sync_started_at=datetime.utcnow(),
        status="success",
        records_fetched=0,
        records_saved=0,
    )
    db.add(log)
    d.last_sync_at = datetime.utcnow()
    d.connection_status = DeviceStatus.ONLINE.value
    db.commit()
    return {"message": "Sync triggered", "device_id": device_id}


@router.get("/{device_id}/sync-logs")
def sync_logs(
    device_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    _=Depends(require_role(MANAGER_ROLES)),
):
    logs = (
        db.query(DeviceSyncLog)
        .filter(DeviceSyncLog.device_id == device_id)
        .order_by(DeviceSyncLog.sync_started_at.desc())
        .limit(limit)
        .all()
    )
    return logs


@router.patch("/{device_id}/heartbeat")
def heartbeat(device_id: int, db: Session = Depends(get_db)):
    """Called by device/agent to update online status."""
    d = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    if not d:
        raise HTTPException(404, "Device not found")
    d.last_heartbeat = datetime.utcnow()
    d.connection_status = DeviceStatus.ONLINE.value
    db.commit()
    return {"status": "ok"}
