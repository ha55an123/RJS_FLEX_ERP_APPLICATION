from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth_dependencies import get_current_user
from app.models.user import User
from app.models.face_biometric import FaceBiometric, FaceRecognitionLog
from app.models.gym_member import GymMember
from app.models.gym_staff import GymStaff
from app.models.gym_attendance import GymAttendance, CheckInMethod, AttendanceStatus
from app.services.face_recognition_service import face_service
from loguru import logger
from datetime import datetime, date
import os

router = APIRouter()


class FaceRegistrationResponse(BaseModel):
    success: bool
    message: str
    biometric_id: Optional[int] = None
    quality_score: Optional[float] = None


class FaceRecognitionResponse(BaseModel):
    success: bool
    recognized: bool
    member_id: Optional[int] = None
    member_name: Optional[str] = None
    member_code: Optional[str] = None
    confidence: Optional[float] = None
    attendance_recorded: bool = False
    message: str


class BiometricStatusResponse(BaseModel):
    has_biometric: bool
    is_active: bool
    registered_at: Optional[str] = None
    model_name: Optional[str] = None


@router.post("/register/{member_id}", response_model=FaceRegistrationResponse)
async def register_face(
    member_id: int,
    image: UploadFile = File(...),
    branch_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Register face biometric for a member
    Only authorized users can register faces
    """
    try:
        # Verify member exists
        member = db.query(GymMember).filter(
            GymMember.id == member_id,
            GymMember.deleted_at.is_(None)
        ).first()
        
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Check if member already has active biometric
        existing = db.query(FaceBiometric).filter(
            FaceBiometric.member_id == member_id,
            FaceBiometric.is_active == True,
            FaceBiometric.deleted_at.is_(None)
        ).first()
        
        if existing:
            # Deactivate existing registration
            existing.is_active = False
            existing.deleted_at = datetime.utcnow()
            db.commit()
        
        # Read image data
        image_data = await image.read()
        
        # Validate face quality
        is_valid, quality_score, quality_error = face_service.validate_face_quality(image_data)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Face quality check failed: {quality_error}")
        
        # Extract face embedding
        embedding, confidence, error = face_service.detect_and_extract_embedding(image_data)
        if embedding is None:
            raise HTTPException(status_code=400, detail=f"Face detection failed: {error}")
        
        # Convert embedding to bytes
        embedding_bytes = face_service.embedding_to_bytes(embedding)
        
        # Create biometric record
        biometric = FaceBiometric(
            member_id=member_id,
            face_embedding=embedding_bytes,
            model_name=face_service.model_name,
            face_quality_score=quality_score,
            enrollment_confidence=confidence,
            enrollment_device=current_user.username,
            enrollment_ip=None,  # Could be extracted from request
            is_active=True,
            is_verified=True,
            registered_by=current_user.id
        )
        
        db.add(biometric)
        db.commit()
        db.refresh(biometric)
        
        logger.info(f"Face registered for member {member_id} by user {current_user.id}")
        
        return FaceRegistrationResponse(
            success=True,
            message="Face registered successfully",
            biometric_id=biometric.id,
            quality_score=quality_score
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face registration error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/recognize", response_model=FaceRecognitionResponse)
async def recognize_face(
    image: UploadFile = File(...),
    branch_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recognize face and record attendance
    """
    try:
        if not branch_id:
            raise HTTPException(status_code=400, detail="Branch ID required")
        
        # Read image data
        image_data = await image.read()
        
        # Validate face quality
        is_valid, quality_score, quality_error = face_service.validate_face_quality(image_data)
        if not is_valid:
            # Log failed recognition attempt
            log = FaceRecognitionLog(
                branch_id=branch_id,
                is_recognized=False,
                confidence_score=0.0,
                face_quality_score=quality_score,
                error_message=quality_error,
                attempt_device=current_user.username
            )
            db.add(log)
            db.commit()
            
            return FaceRecognitionResponse(
                success=False,
                recognized=False,
                message=f"Face quality check failed: {quality_error}"
            )
        
        # Extract face embedding
        query_embedding, confidence, error = face_service.detect_and_extract_embedding(image_data)
        if query_embedding is None:
            log = FaceRecognitionLog(
                branch_id=branch_id,
                is_recognized=False,
                confidence_score=0.0,
                face_quality_score=quality_score,
                error_message=error,
                attempt_device=current_user.username
            )
            db.add(log)
            db.commit()
            
            return FaceRecognitionResponse(
                success=False,
                recognized=False,
                message=f"Face detection failed: {error}"
            )
        
        # Get all active face embeddings
        biometrics = db.query(FaceBiometric).filter(
            FaceBiometric.is_active == True,
            FaceBiometric.deleted_at.is_(None)
        ).all()
        
        if not biometrics:
            return FaceRecognitionResponse(
                success=True,
                recognized=False,
                message="No registered faces found in database"
            )
        
        # Prepare stored embeddings
        stored_embeddings = []
        for bio in biometrics:
            try:
                embedding = face_service.bytes_to_embedding(bio.face_embedding)
                stored_embeddings.append((bio.id, embedding))
            except Exception as e:
                logger.error(f"Error loading embedding {biometric.id}: {str(e)}")
                continue
        
        # Find best match
        best_match_id, best_score = face_service.find_best_match(query_embedding, stored_embeddings)
        
        # Check if confidence meets threshold
        if best_match_id and best_score >= face_service.min_confidence:
            # Get the biometric record
            biometric = db.query(FaceBiometric).filter(
                FaceBiometric.id == best_match_id
            ).first()
            
            if not biometric:
                return FaceRecognitionResponse(
                    success=True,
                    recognized=False,
                    message="Biometric record not found"
                )
            
            # Get member details
            member = db.query(GymMember).filter(
                GymMember.id == biometric.member_id,
                GymMember.deleted_at.is_(None)
            ).first()
            
            if not member:
                return FaceRecognitionResponse(
                    success=True,
                    recognized=False,
                    message="Member not found"
                )
            
            # Check for duplicate attendance (within 1 hour)
            from datetime import timedelta
            recent_attendance = db.query(GymAttendance).filter(
                GymAttendance.member_id == member.id,
                GymAttendance.branch_id == branch_id,
                GymAttendance.attendance_date == date.today(),
                GymAttendance.check_in_time >= datetime.utcnow() - timedelta(hours=1)
            ).first()
            
            attendance_recorded = False
            if recent_attendance:
                logger.info(f"Duplicate attendance prevented for member {member.id}")
            else:
                # Create attendance record
                attendance = GymAttendance(
                    member_id=member.id,
                    branch_id=branch_id,
                    attendance_date=date.today(),
                    check_in_time=datetime.utcnow(),
                    method=CheckInMethod.FACE,
                    status=AttendanceStatus.CHECKED_IN,
                    recorded_by=current_user.id
                )
                db.add(attendance)
                
                # Update biometric last used
                biometric.last_used_at = datetime.utcnow()
                db.commit()
                
                attendance_recorded = True
            
            # Log successful recognition
            log = FaceRecognitionLog(
                face_biometric_id=biometric.id,
                member_id=member.id,
                branch_id=branch_id,
                is_recognized=True,
                confidence_score=best_score,
                face_quality_score=quality_score,
                attempt_device=current_user.username
            )
            db.add(log)
            db.commit()
            
            return FaceRecognitionResponse(
                success=True,
                recognized=True,
                member_id=member.id,
                member_name=member.full_name,
                member_code=member.member_code,
                confidence=best_score,
                attendance_recorded=attendance_recorded,
                message="Face recognized successfully"
            )
        else:
            # Log failed recognition
            log = FaceRecognitionLog(
                branch_id=branch_id,
                is_recognized=False,
                confidence_score=best_score if best_match_id else 0.0,
                face_quality_score=quality_score,
                error_message="Face not recognized (confidence below threshold)",
                attempt_device=current_user.username
            )
            db.add(log)
            db.commit()
            
            return FaceRecognitionResponse(
                success=True,
                recognized=False,
                confidence=best_score if best_match_id else 0.0,
                message="Face not recognized"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face recognition error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


@router.get("/status/{member_id}", response_model=BiometricStatusResponse)
async def get_biometric_status(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get biometric registration status for a member"""
    try:
        biometric = db.query(FaceBiometric).filter(
            FaceBiometric.member_id == member_id,
            FaceBiometric.is_active == True,
            FaceBiometric.deleted_at.is_(None)
        ).first()
        
        if biometric:
            return BiometricStatusResponse(
                has_biometric=True,
                is_active=biometric.is_active,
                registered_at=biometric.created_at.isoformat() if biometric.created_at else None,
                model_name=biometric.model_name
            )
        else:
            return BiometricStatusResponse(
                has_biometric=False,
                is_active=False
            )
            
    except Exception as e:
        logger.error(f"Error getting biometric status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.delete("/delete/{member_id}")
async def delete_biometric(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete face biometric registration for a member"""
    try:
        biometric = db.query(FaceBiometric).filter(
            FaceBiometric.member_id == member_id,
            FaceBiometric.is_active == True,
            FaceBiometric.deleted_at.is_(None)
        ).first()
        
        if not biometric:
            raise HTTPException(status_code=404, detail="No active biometric found")
        
        # Soft delete
        biometric.is_active = False
        biometric.deleted_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Biometric deleted for member {member_id} by user {current_user.id}")
        
        return {"success": True, "message": "Biometric deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting biometric: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete biometric: {str(e)}")
