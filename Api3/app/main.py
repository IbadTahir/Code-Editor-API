from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .api.v1.endpoints import auth, books, videos, evaluators, ai_evaluation, files
from .database.database import engine, Base

# Initialize FastAPI and dependencies
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from .utils.errors import AppError
import time
import logging

# Setup logging
from .utils.logging_config import setup_logging, get_api_logger
setup_logging()
logger = get_api_logger()

# Create database tables
logger.info("Creating database tables...")
Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully")

app = FastAPI(
    title="Educational Platform API",
    description="API for managing books, video lectures, and evaluations",
    version="1.0.0",
    docs_url="/docs",  # Changed from /api/v1/docs to /docs
    redoc_url="/redoc",  # Changed from /api/v1/redoc to /redoc
    openapi_url="/openapi.json"  # Changed from /api/v1/openapi.json
)

# Add error handling middleware
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    # Use getattr to safely access attributes that may not exist
    error_code = getattr(exc, "error_code", "APP_ERROR")
    extra_data = getattr(exc, "extra", None)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": error_code,
                "message": exc.detail,
                **({"extra": extra_data} if extra_data else {})
            }
        }
    )
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = [{"field": e["loc"][-1], "msg": e["msg"]} for e in exc.errors()]
    logger.warning(f"Validation error: {errors}")
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "data": {"errors": errors}
            }
        }
    )

@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database error occurred"
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred"
            }
        }
    )

# Configure CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Frontend development
    "http://localhost:5173",  # Frontend Vite dev server
    "http://localhost:5178",  # Additional frontend port
    "http://localhost:5179",  # Additional frontend port
    "http://localhost:5180",  # Additional frontend port
    "http://localhost:5181",  # Additional frontend port
    "http://localhost:8080",  # Additional development port
    "https://edu-platform.yourdomain.com"  # Production domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],  # Allow all headers for development
    expose_headers=["*"],  # Expose all headers
)

# Include routers
app.include_router(auth.router, tags=["Authentication"], prefix="/api/v1/auth")
app.include_router(books.router, tags=["Books"], prefix="/api/v1/books")
app.include_router(videos.router, tags=["Video Lectures"], prefix="/api/v1/video-lectures")
app.include_router(evaluators.router, tags=["Evaluators"], prefix="/api/v1/evaluators")
app.include_router(ai_evaluation.router, tags=["AI Evaluation"], prefix="/api/v1/ai")
app.include_router(files.router, tags=["Files"], prefix="/api/v1/files")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
