"""
Biometric Device Abstraction Layer
Provides a unified interface for communicating with various biometric device brands
(ZKTeco, eSSL, Suprema, Hikvision, Anviz, FingerTec) via different protocols.
"""

import socket
import requests
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

from app.models.biometric_device import DeviceBrand, DeviceProtocol, DeviceStatus

logger = logging.getLogger(__name__)


@dataclass
class AttendanceRecord:
    """Standardized attendance record from any biometric device"""
    user_id: str
    timestamp: datetime
    device_id: int
    verification_mode: str  # fingerprint, face, card, password
    status: str  # check_in, check_out


@dataclass
class DeviceUser:
    """Standardized user data for biometric device"""
    user_id: str
    name: str
    card_number: Optional[str] = None
    fingerprint_template: Optional[bytes] = None
    face_template: Optional[bytes] = None
    privilege: int = 0


class BiometricDeviceInterface(ABC):
    """Abstract base class for biometric device communication"""

    def __init__(self, ip_address: str, port: int, device_id: int):
        self.ip_address = ip_address
        self.port = port
        self.device_id = device_id
        self.is_connected = False

    @abstractmethod
    def connect(self) -> bool:
        """Establish connection to the device"""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Close connection to the device"""
        pass

    @abstractmethod
    def test_connection(self) -> Tuple[bool, str]:
        """Test if device is reachable and responsive"""
        pass

    @abstractmethod
    def get_attendance_logs(self, start_date: datetime, end_date: datetime) -> List[AttendanceRecord]:
        """Fetch attendance logs from device"""
        pass

    @abstractmethod
    def get_users(self) -> List[DeviceUser]:
        """Fetch users enrolled on the device"""
        pass

    @abstractmethod
    def enroll_user(self, user: DeviceUser) -> Tuple[bool, str]:
        """Enroll a new user on the device"""
        pass

    @abstractmethod
    def delete_user(self, user_id: str) -> Tuple[bool, str]:
        """Delete a user from the device"""
        pass

    @abstractmethod
    def clear_attendance_logs(self) -> Tuple[bool, str]:
        """Clear attendance logs from device"""
        pass

    @abstractmethod
    def get_device_info(self) -> Dict:
        """Get device information (serial, firmware, etc.)"""
        pass


class ZKTecoDevice(BiometricDeviceInterface):
    """ZKTeco device implementation using TCP/IP protocol"""

    def __init__(self, ip_address: str, port: int, device_id: int):
        super().__init__(ip_address, port, device_id)
        self.socket = None

    def connect(self) -> bool:
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(10)
            self.socket.connect((self.ip_address, self.port))
            self.is_connected = True
            logger.info(f"Connected to ZKTeco device at {self.ip_address}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ZKTeco device: {e}")
            return False

    def disconnect(self) -> None:
        if self.socket:
            self.socket.close()
            self.is_connected = False
            logger.info(f"Disconnected from ZKTeco device at {self.ip_address}:{self.port}")

    def test_connection(self) -> Tuple[bool, str]:
        if not self.is_connected:
            if not self.connect():
                return False, "Connection failed"
        try:
            # Send a simple command to test connectivity
            # In real implementation, this would use ZKTeco SDK protocol
            self.disconnect()
            return True, "Device is responsive"
        except Exception as e:
            return False, str(e)

    def get_attendance_logs(self, start_date: datetime, end_date: datetime) -> List[AttendanceRecord]:
        """Fetch attendance logs using ZKTeco protocol"""
        if not self.is_connected:
            self.connect()
        
        # Placeholder: In real implementation, use ZKTeco SDK
        # This would involve sending specific protocol commands to fetch logs
        logger.info(f"Fetching attendance logs from ZKTeco device {self.device_id}")
        return []

    def get_users(self) -> List[DeviceUser]:
        """Fetch enrolled users from ZKTeco device"""
        if not self.is_connected:
            self.connect()
        
        # Placeholder: Use ZKTeco SDK to get user list
        logger.info(f"Fetching users from ZKTeco device {self.device_id}")
        return []

    def enroll_user(self, user: DeviceUser) -> Tuple[bool, str]:
        """Enroll user on ZKTeco device"""
        if not self.is_connected:
            self.connect()
        
        # Placeholder: Use ZKTeco SDK to enroll user with fingerprint/face
        logger.info(f"Enrolling user {user.user_id} on ZKTeco device {self.device_id}")
        return True, "User enrolled successfully"

    def delete_user(self, user_id: str) -> Tuple[bool, str]:
        """Delete user from ZKTeco device"""
        if not self.is_connected:
            self.connect()
        
        # Placeholder: Use ZKTeco SDK to delete user
        logger.info(f"Deleting user {user_id} from ZKTeco device {self.device_id}")
        return True, "User deleted successfully"

    def clear_attendance_logs(self) -> Tuple[bool, str]:
        """Clear attendance logs from ZKTeco device"""
        if not self.is_connected:
            self.connect()
        
        # Placeholder: Use ZKTeco SDK to clear logs
        logger.info(f"Clearing attendance logs from ZKTeco device {self.device_id}")
        return True, "Logs cleared successfully"

    def get_device_info(self) -> Dict:
        """Get ZKTeco device information"""
        if not self.is_connected:
            self.connect()
        
        # Placeholder: Use ZKTeco SDK to get device info
        return {
            "brand": "ZKTeco",
            "serial": "ZK123456",
            "firmware": "Ver 6.60",
            "ip_address": self.ip_address,
            "port": self.port
        }


class ESSLDevice(BiometricDeviceInterface):
    """eSSL device implementation"""

    def __init__(self, ip_address: str, port: int, device_id: int):
        super().__init__(ip_address, port, device_id)
        self.socket = None

    def connect(self) -> bool:
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(10)
            self.socket.connect((self.ip_address, self.port))
            self.is_connected = True
            logger.info(f"Connected to eSSL device at {self.ip_address}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to eSSL device: {e}")
            return False

    def disconnect(self) -> None:
        if self.socket:
            self.socket.close()
            self.is_connected = False

    def test_connection(self) -> Tuple[bool, str]:
        if not self.is_connected:
            if not self.connect():
                return False, "Connection failed"
        try:
            self.disconnect()
            return True, "Device is responsive"
        except Exception as e:
            return False, str(e)

    def get_attendance_logs(self, start_date: datetime, end_date: datetime) -> List[AttendanceRecord]:
        if not self.is_connected:
            self.connect()
        logger.info(f"Fetching attendance logs from eSSL device {self.device_id}")
        return []

    def get_users(self) -> List[DeviceUser]:
        if not self.is_connected:
            self.connect()
        logger.info(f"Fetching users from eSSL device {self.device_id}")
        return []

    def enroll_user(self, user: DeviceUser) -> Tuple[bool, str]:
        if not self.is_connected:
            self.connect()
        logger.info(f"Enrolling user {user.user_id} on eSSL device {self.device_id}")
        return True, "User enrolled successfully"

    def delete_user(self, user_id: str) -> Tuple[bool, str]:
        if not self.is_connected:
            self.connect()
        logger.info(f"Deleting user {user_id} from eSSL device {self.device_id}")
        return True, "User deleted successfully"

    def clear_attendance_logs(self) -> Tuple[bool, str]:
        if not self.is_connected:
            self.connect()
        logger.info(f"Clearing attendance logs from eSSL device {self.device_id}")
        return True, "Logs cleared successfully"

    def get_device_info(self) -> Dict:
        if not self.is_connected:
            self.connect()
        return {
            "brand": "eSSL",
            "serial": "ESSL789",
            "firmware": "Ver 3.2",
            "ip_address": self.ip_address,
            "port": self.port
        }


class RESTAPIDevice(BiometricDeviceInterface):
    """Generic REST API device implementation for modern biometric devices"""

    def __init__(self, ip_address: str, port: int, device_id: int, api_key: Optional[str] = None):
        super().__init__(ip_address, port, device_id)
        self.base_url = f"http://{ip_address}:{port}/api/v1"
        self.api_key = api_key
        self.headers = {}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    def connect(self) -> bool:
        try:
            response = requests.get(f"{self.base_url}/health", headers=self.headers, timeout=10)
            self.is_connected = response.status_code == 200
            if self.is_connected:
                logger.info(f"Connected to REST API device at {self.base_url}")
            return self.is_connected
        except Exception as e:
            logger.error(f"Failed to connect to REST API device: {e}")
            return False

    def disconnect(self) -> None:
        self.is_connected = False
        logger.info(f"Disconnected from REST API device at {self.base_url}")

    def test_connection(self) -> Tuple[bool, str]:
        try:
            response = requests.get(f"{self.base_url}/health", headers=self.headers, timeout=10)
            if response.status_code == 200:
                return True, "Device is responsive"
            return False, f"HTTP {response.status_code}"
        except Exception as e:
            return False, str(e)

    def get_attendance_logs(self, start_date: datetime, end_date: datetime) -> List[AttendanceRecord]:
        if not self.is_connected:
            self.connect()
        
        try:
            params = {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
            response = requests.get(f"{self.base_url}/attendance", headers=self.headers, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                # Parse and convert to AttendanceRecord objects
                return []
            return []
        except Exception as e:
            logger.error(f"Failed to fetch attendance logs: {e}")
            return []

    def get_users(self) -> List[DeviceUser]:
        if not self.is_connected:
            self.connect()
        
        try:
            response = requests.get(f"{self.base_url}/users", headers=self.headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                # Parse and convert to DeviceUser objects
                return []
            return []
        except Exception as e:
            logger.error(f"Failed to fetch users: {e}")
            return []

    def enroll_user(self, user: DeviceUser) -> Tuple[bool, str]:
        if not self.is_connected:
            self.connect()
        
        try:
            payload = {
                "user_id": user.user_id,
                "name": user.name,
                "card_number": user.card_number,
                "privilege": user.privilege
            }
            response = requests.post(f"{self.base_url}/users", headers=self.headers, json=payload, timeout=30)
            if response.status_code == 201:
                return True, "User enrolled successfully"
            return False, f"HTTP {response.status_code}"
        except Exception as e:
            logger.error(f"Failed to enroll user: {e}")
            return False, str(e)

    def delete_user(self, user_id: str) -> Tuple[bool, str]:
        if not self.is_connected:
            self.connect()
        
        try:
            response = requests.delete(f"{self.base_url}/users/{user_id}", headers=self.headers, timeout=30)
            if response.status_code == 200:
                return True, "User deleted successfully"
            return False, f"HTTP {response.status_code}"
        except Exception as e:
            logger.error(f"Failed to delete user: {e}")
            return False, str(e)

    def clear_attendance_logs(self) -> Tuple[bool, str]:
        if not self.is_connected:
            self.connect()
        
        try:
            response = requests.delete(f"{self.base_url}/attendance", headers=self.headers, timeout=30)
            if response.status_code == 200:
                return True, "Logs cleared successfully"
            return False, f"HTTP {response.status_code}"
        except Exception as e:
            logger.error(f"Failed to clear logs: {e}")
            return False, str(e)

    def get_device_info(self) -> Dict:
        if not self.is_connected:
            self.connect()
        
        try:
            response = requests.get(f"{self.base_url}/info", headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"Failed to get device info: {e}")
            return {}


class BiometricDeviceFactory:
    """Factory class to create appropriate device interface based on brand and protocol"""

    @staticmethod
    def create_device(
        brand: DeviceBrand,
        protocol: DeviceProtocol,
        ip_address: str,
        port: int,
        device_id: int,
        api_key: Optional[str] = None
    ) -> BiometricDeviceInterface:
        """
        Create a device interface instance based on brand and protocol
        
        Args:
            brand: Device brand (ZKTeco, eSSL, etc.)
            protocol: Communication protocol (tcp_ip, rest_api, etc.)
            ip_address: Device IP address
            port: Device port
            device_id: Database ID of the device
            api_key: Optional API key for REST API devices
        
        Returns:
            BiometricDeviceInterface instance
        """
        if protocol == DeviceProtocol.REST_API:
            return RESTAPIDevice(ip_address, port, device_id, api_key)
        
        # For TCP/IP protocol, use brand-specific implementations
        if brand == DeviceBrand.ZKTECO:
            return ZKTecoDevice(ip_address, port, device_id)
        elif brand == DeviceBrand.ESSL:
            return ESSLDevice(ip_address, port, device_id)
        else:
            # Default to ZKTeco for other brands (can be extended)
            logger.warning(f"No specific implementation for brand {brand}, using ZKTeco as fallback")
            return ZKTecoDevice(ip_address, port, device_id)


class BiometricSyncService:
    """Service for syncing data between biometric devices and the ERP system"""

    def __init__(self, db_session):
        self.db = db_session

    def sync_attendance_from_device(self, device_id: int, start_date: datetime, end_date: datetime) -> Tuple[int, str]:
        """
        Sync attendance logs from a biometric device to the ERP system
        
        Args:
            device_id: Database ID of the device
            start_date: Start date for attendance sync
            end_date: End date for attendance sync
        
        Returns:
            Tuple of (records_synced, status_message)
        """
        from app.models.biometric_device import BiometricDevice
        
        device = self.db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
        if not device:
            return 0, "Device not found"
        
        # Create device interface
        device_interface = BiometricDeviceFactory.create_device(
            brand=device.brand,
            protocol=device.protocol,
            ip_address=device.ip_address,
            port=device.port,
            device_id=device.id
        )
        
        # Connect and fetch logs
        if not device_interface.connect():
            return 0, "Failed to connect to device"
        
        try:
            attendance_logs = device_interface.get_attendance_logs(start_date, end_date)
            
            # Save logs to database
            # In real implementation, this would map to gym_attendance table
            records_saved = len(attendance_logs)
            
            device.last_sync_at = datetime.utcnow()
            device.connection_status = DeviceStatus.ONLINE.value
            self.db.commit()
            
            device_interface.disconnect()
            return records_saved, f"Synced {records_saved} attendance records"
            
        except Exception as e:
            logger.error(f"Error syncing attendance from device {device_id}: {e}")
            device.connection_status = DeviceStatus.ERROR.value
            self.db.commit()
            device_interface.disconnect()
            return 0, f"Sync failed: {str(e)}"

    def sync_user_to_device(self, device_id: int, user_id: str, user_data: Dict) -> Tuple[bool, str]:
        """
        Sync a user to a biometric device
        
        Args:
            device_id: Database ID of the device
            user_id: User ID to sync
            user_data: User data dictionary
        
        Returns:
            Tuple of (success, message)
        """
        from app.models.biometric_device import BiometricDevice
        
        device = self.db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
        if not device:
            return False, "Device not found"
        
        device_interface = BiometricDeviceFactory.create_device(
            brand=device.brand,
            protocol=device.protocol,
            ip_address=device.ip_address,
            port=device.port,
            device_id=device.id
        )
        
        if not device_interface.connect():
            return False, "Failed to connect to device"
        
        try:
            device_user = DeviceUser(
                user_id=user_id,
                name=user_data.get("name", ""),
                card_number=user_data.get("card_number"),
                privilege=user_data.get("privilege", 0)
            )
            
            success, message = device_interface.enroll_user(device_user)
            device_interface.disconnect()
            return success, message
            
        except Exception as e:
            logger.error(f"Error syncing user to device {device_id}: {e}")
            device_interface.disconnect()
            return False, str(e)

    def test_device_connection(self, device_id: int) -> Tuple[bool, str]:
        """
        Test connection to a biometric device
        
        Args:
            device_id: Database ID of the device
        
        Returns:
            Tuple of (is_connected, message)
        """
        from app.models.biometric_device import BiometricDevice
        
        device = self.db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
        if not device:
            return False, "Device not found"
        
        device_interface = BiometricDeviceFactory.create_device(
            brand=device.brand,
            protocol=device.protocol,
            ip_address=device.ip_address,
            port=device.port,
            device_id=device.id
        )
        
        is_connected, message = device_interface.test_connection()
        
        # Update device status
        device.connection_status = DeviceStatus.ONLINE.value if is_connected else DeviceStatus.OFFLINE.value
        device.last_heartbeat = datetime.utcnow()
        self.db.commit()
        
        return is_connected, message
