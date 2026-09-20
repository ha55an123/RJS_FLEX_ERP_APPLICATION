"""
Unit tests for Biometric Device Service
"""

import pytest
from unittest.mock import Mock, patch
from app.services.biometric_service import (
    BiometricDeviceFactory,
    ZKTecoDevice,
    ESSLDevice,
    RESTAPIDevice,
    BiometricSyncService,
    AttendanceRecord,
    DeviceUser
)
from app.models.biometric_device import DeviceBrand, DeviceProtocol, DeviceStatus


def test_device_factory_creates_zkteco_device():
    """Test factory creates ZKTeco device for TCP/IP protocol"""
    device = BiometricDeviceFactory.create_device(
        brand=DeviceBrand.ZKTECO,
        protocol=DeviceProtocol.TCP_IP,
        ip_address="192.168.1.100",
        port=4370,
        device_id=1
    )
    assert isinstance(device, ZKTecoDevice)
    assert device.ip_address == "192.168.1.100"
    assert device.port == 4370
    assert device.device_id == 1


def test_device_factory_creates_essl_device():
    """Test factory creates eSSL device for TCP/IP protocol"""
    device = BiometricDeviceFactory.create_device(
        brand=DeviceBrand.ESSL,
        protocol=DeviceProtocol.TCP_IP,
        ip_address="192.168.1.101",
        port=4370,
        device_id=2
    )
    assert isinstance(device, ESSLDevice)
    assert device.ip_address == "192.168.1.101"


def test_device_factory_creates_rest_api_device():
    """Test factory creates REST API device for REST protocol"""
    device = BiometricDeviceFactory.create_device(
        brand=DeviceBrand.ZKTECO,
        protocol=DeviceProtocol.REST_API,
        ip_address="192.168.1.102",
        port=8080,
        device_id=3,
        api_key="test_key"
    )
    assert isinstance(device, RESTAPIDevice)
    assert device.api_key == "test_key"


def test_zkteco_device_test_connection_failure():
    """Test ZKTeco device connection failure"""
    device = ZKTecoDevice("192.168.1.999", 4370, 1)
    is_connected, message = device.test_connection()
    assert is_connected is False
    assert "Failed to connect" in message or "refused" in message.lower()


def test_essl_device_test_connection_failure():
    """Test eSSL device connection failure"""
    device = ESSLDevice("192.168.1.999", 4370, 1)
    is_connected, message = device.test_connection()
    assert is_connected is False


def test_rest_api_device_test_connection_failure():
    """Test REST API device connection failure"""
    device = RESTAPIDevice("192.168.1.999", 8080, 1)
    is_connected, message = device.test_connection()
    assert is_connected is False


def test_attendance_record_dataclass():
    """Test AttendanceRecord dataclass"""
    from datetime import datetime
    record = AttendanceRecord(
        user_id="123",
        timestamp=datetime.now(),
        device_id=1,
        verification_mode="fingerprint",
        status="check_in"
    )
    assert record.user_id == "123"
    assert record.device_id == 1
    assert record.verification_mode == "fingerprint"
    assert record.status == "check_in"


def test_device_user_dataclass():
    """Test DeviceUser dataclass"""
    user = DeviceUser(
        user_id="123",
        name="John Doe",
        card_number="123456",
        privilege=1
    )
    assert user.user_id == "123"
    assert user.name == "John Doe"
    assert user.card_number == "123456"
    assert user.privilege == 1


@patch('app.services.biometric_service.BiometricDeviceFactory')
def test_biometric_sync_service_test_connection(mock_factory):
    """Test BiometricSyncService connection testing"""
    # Mock database session
    mock_db = Mock()
    mock_device = Mock()
    mock_device.id = 1
    mock_device.brand = DeviceBrand.ZKTECO
    mock_device.protocol = DeviceProtocol.TCP_IP
    mock_device.ip_address = "192.168.1.100"
    mock_device.port = 4370
    mock_db.query.return_value.filter.return_value.first.return_value = mock_device
    
    # Mock device interface
    mock_device_interface = Mock()
    mock_device_interface.test_connection.return_value = (True, "Device is responsive")
    mock_factory.create_device.return_value = mock_device_interface
    
    service = BiometricSyncService(mock_db)
    is_connected, message = service.test_device_connection(1)
    
    assert is_connected is True
    assert message == "Device is responsive"
    mock_device.connection_status = DeviceStatus.ONLINE.value
    mock_db.commit.assert_called_once()


@patch('app.services.biometric_service.BiometricDeviceFactory')
def test_biometric_sync_service_sync_attendance(mock_factory):
    """Test BiometricSyncService attendance sync"""
    from datetime import datetime
    
    # Mock database session
    mock_db = Mock()
    mock_device = Mock()
    mock_device.id = 1
    mock_device.brand = DeviceBrand.ZKTECO
    mock_device.protocol = DeviceProtocol.TCP_IP
    mock_device.ip_address = "192.168.1.100"
    mock_device.port = 4370
    mock_db.query.return_value.filter.return_value.first.return_value = mock_device
    
    # Mock device interface
    mock_device_interface = Mock()
    mock_device_interface.connect.return_value = True
    mock_device_interface.get_attendance_logs.return_value = []
    mock_factory.create_device.return_value = mock_device_interface
    
    service = BiometricSyncService(mock_db)
    records_saved, message = service.sync_attendance_from_device(
        device_id=1,
        start_date=datetime.now(),
        end_date=datetime.now()
    )
    
    assert records_saved == 0
    assert "Synced" in message
    mock_device.last_sync_at = datetime.now()
    mock_device.connection_status = DeviceStatus.ONLINE.value
    mock_db.commit.assert_called_once()
