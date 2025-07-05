from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional
import logging
from ..config import get_settings

# Set up logging
logger = logging.getLogger(__name__)

# Get settings instance
settings = get_settings()

# JWT configuration - should match Api2 configuration
JWT_SECRET = settings.SECRET_KEY
ALGORITHM = "HS256"

security = HTTPBearer()

def verify_token_from_user_management_api(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify JWT token issued by the User Management API (Api2)
    Returns user data from the token
    """
    token = credentials.credentials
    
    try:
        # Decode the JWT token using the same secret as Api2
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        
        # Extract user data from token payload (Api2 format)
        user_id = payload.get("userId")  # API2 uses "userId" field
        role = payload.get("role")
        email = payload.get("email")
        
        # Validate required fields
        if user_id is None or role is None or email is None:
            logger.warning(f"Invalid token format - missing required fields. Payload: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format - missing required fields",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.debug(f"Successfully authenticated user: {email} with role: {role}")
        return {
            "userId": user_id,
            "role": role,
            "email": email,
            "username": email  # Use email as username for compatibility
        }
        
    except JWTError as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_teacher_or_admin(user_data: dict = Depends(verify_token_from_user_management_api)) -> dict:
    """
    Check if the user has instructor or admin role
    """
    if user_data["role"] not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and admins can access this resource"
        )
    return user_data

# Optional authentication - doesn't require token but extracts user data if present
def optional_auth(authorization: Optional[str] = Depends(lambda: None)) -> Optional[dict]:
    """
    Optional authentication - extracts user data if token is present, otherwise returns None
    """
    if not authorization:
        return None
    
    try:
        # Simple Bearer token extraction
        if not authorization.startswith("Bearer "):
            return None
            
        token = authorization[7:]  # Remove "Bearer " prefix
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        
        user_id = payload.get("userId")
        role = payload.get("role") 
        email = payload.get("email")
        
        if user_id and role and email:
            return {
                "userId": user_id,
                "role": role,
                "email": email
            }
    except:
        pass
    
    return None
