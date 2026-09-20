import numpy as np
from deepface import DeepFace
from PIL import Image
import io
import base64
from typing import Optional, Tuple, List
from loguru import logger


class FaceRecognitionService:
    """Service for face recognition operations using DeepFace"""
    
    def __init__(self, model_name: str = "VGG-Face"):
        self.model_name = model_name
        self.min_confidence = 0.6  # Minimum confidence threshold for recognition
        
    def detect_and_extract_embedding(self, image_data: bytes) -> Tuple[Optional[np.ndarray], Optional[float], Optional[str]]:
        """
        Detect face and extract embedding from image data
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Tuple of (embedding, confidence_score, error_message)
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save to temporary file for DeepFace
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                image.save(temp_file, format='JPEG')
                temp_path = temp_file.name
            
            try:
                # Extract face embedding using DeepFace
                embedding_objs = DeepFace.represent(
                    img_path=temp_path,
                    model_name=self.model_name,
                    enforce_detection=True,
                    align=True
                )
                
                if not embedding_objs:
                    return None, None, "No face detected in image"
                
                # Get the first detected face
                embedding_obj = embedding_objs[0]
                embedding = np.array(embedding_obj["embedding"])
                confidence = embedding_obj.get("confidence", 0.0)
                
                return embedding, confidence, None
                
            finally:
                # Clean up temporary file
                import os
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except Exception as e:
            logger.error(f"Face detection error: {str(e)}")
            return None, None, f"Face detection failed: {str(e)}"
    
    def compare_faces(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compare two face embeddings and return similarity score
        
        Args:
            embedding1: First face embedding
            embedding2: Second face embedding
            
        Returns:
            Similarity score (0-1)
        """
        try:
            from scipy.spatial.distance import cosine
            # Cosine similarity (1 - cosine distance)
            similarity = 1 - cosine(embedding1, embedding2)
            return float(similarity)
        except Exception as e:
            logger.error(f"Face comparison error: {str(e)}")
            return 0.0
    
    def find_best_match(
        self, 
        query_embedding: np.ndarray, 
        stored_embeddings: List[Tuple[int, np.ndarray]]
    ) -> Tuple[Optional[int], float]:
        """
        Find the best matching face from stored embeddings
        
        Args:
            query_embedding: Face embedding to match
            stored_embeddings: List of (id, embedding) tuples
            
        Returns:
            Tuple of (matched_id, confidence_score)
        """
        best_match_id = None
        best_score = 0.0
        
        for stored_id, stored_embedding in stored_embeddings:
            try:
                similarity = self.compare_faces(query_embedding, stored_embedding)
                if similarity > best_score:
                    best_score = similarity
                    best_match_id = stored_id
            except Exception as e:
                logger.error(f"Error comparing face {stored_id}: {str(e)}")
                continue
        
        return best_match_id, best_score
    
    def validate_face_quality(self, image_data: bytes) -> Tuple[bool, float, Optional[str]]:
        """
        Validate if face image meets quality requirements
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Tuple of (is_valid, quality_score, error_message)
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Check image size
            width, height = image.size
            min_size = 100
            if width < min_size or height < min_size:
                return False, 0.0, f"Image too small: {width}x{height} (minimum {min_size}x{min_size})"
            
            # Check if image is too dark or too bright
            import numpy as np
            img_array = np.array(image)
            if len(img_array.shape) == 3:
                avg_brightness = np.mean(img_array)
                if avg_brightness < 50:
                    return False, 0.0, "Image too dark"
                if avg_brightness > 200:
                    return False, 0.0, "Image too bright"
            
            # Extract embedding to check face detection
            embedding, confidence, error = self.detect_and_extract_embedding(image_data)
            if embedding is None:
                return False, 0.0, error
            
            # Quality score based on confidence
            quality_score = min(confidence, 1.0)
            
            return True, quality_score, None
            
        except Exception as e:
            logger.error(f"Face quality validation error: {str(e)}")
            return False, 0.0, f"Quality validation failed: {str(e)}"
    
    def embedding_to_bytes(self, embedding: np.ndarray) -> bytes:
        """Convert numpy embedding to bytes for storage"""
        return embedding.tobytes()
    
    def bytes_to_embedding(self, data: bytes) -> np.ndarray:
        """Convert bytes back to numpy embedding"""
        return np.frombuffer(data, dtype=np.float64)


# Global service instance
face_service = FaceRecognitionService()
