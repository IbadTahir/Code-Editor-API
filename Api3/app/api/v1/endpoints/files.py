from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from pathlib import Path
import os

router = APIRouter()

# Simple file serving endpoint
@router.get("/serve/{file_path:path}")
def serve_file(file_path: str):
    """
    Serve files from a secure directory.
    In production, you should add proper security checks and authentication.
    """
    # Define allowed directory (change this to your actual file storage path)
    base_directory = Path("./uploads")  # or wherever your book files are stored
    
    try:
        # Resolve the full file path
        full_path = base_directory / file_path
        
        # Security check: ensure the file is within the allowed directory
        if not str(full_path.resolve()).startswith(str(base_directory.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file exists
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Return the file
        return FileResponse(
            path=str(full_path),
            filename=full_path.name,
            media_type='application/octet-stream'
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")

@router.get("/download/{file_path:path}")
def download_file(file_path: str):
    """
    Download files with forced download headers.
    """
    base_directory = Path("./uploads")
    
    try:
        full_path = base_directory / file_path
        
        if not str(full_path.resolve()).startswith(str(base_directory.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=str(full_path),
            filename=full_path.name,
            media_type='application/octet-stream',
            headers={"Content-Disposition": f"attachment; filename={full_path.name}"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")
