import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logging():
    """Configure application-wide logging"""
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler for general logs
    file_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # API specific logger with its own file
    api_handler = RotatingFileHandler(
        log_dir / "api.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    api_handler.setLevel(logging.INFO)
    api_handler.setFormatter(file_formatter)
    
    api_logger = logging.getLogger("api")
    api_logger.setLevel(logging.INFO)
    api_logger.addHandler(api_handler)
    
    return root_logger

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for the given name"""
    return logging.getLogger(name)

def get_api_logger() -> logging.Logger:
    """Get the API-specific logger"""
    return logging.getLogger("api")