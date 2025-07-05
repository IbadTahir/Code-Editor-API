from fastapi import HTTPException, status

class AppError(HTTPException):
    """Base error class for our application"""
    def __init__(self, detail: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        super().__init__(status_code=status_code, detail=detail)

class AuthenticationError(AppError):
    """Raised when authentication fails"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)

class AuthorizationError(AppError):
    """Raised when user doesn't have permission"""
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)

class NotFoundError(AppError):
    """Raised when a resource is not found"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)

class ValidationError(AppError):
    """Raised when input validation fails"""
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)

class DatabaseError(AppError):
    """Raised when database operations fail"""
    def __init__(self, detail: str = "Database error occurred"):
        super().__init__(detail=detail, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EvaluationError(AppError):
    """Raised when quiz/assignment evaluation fails"""
    def __init__(self, detail: str = "Evaluation failed"):
        super().__init__(detail=detail, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)