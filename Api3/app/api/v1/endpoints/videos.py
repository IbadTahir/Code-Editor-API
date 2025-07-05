from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database.database import get_db
from ....models.video import VideoLecture
from ....schemas.video import VideoLectureCreate, VideoLectureUpdate, VideoLectureResponse
from ....utils.external_auth import verify_token_from_user_management_api, require_teacher_or_admin

router = APIRouter()

@router.post("/", response_model=VideoLectureResponse)
def create_video_lecture(
    video: VideoLectureCreate,
    db: Session = Depends(get_db)
    # Temporarily removed authentication for testing
    # user_data: dict = Depends(require_teacher_or_admin)
):
    video_data = video.model_dump()
    video_data['teacher_username'] = "demo-teacher"  # Use demo teacher for testing
    
    db_video = VideoLecture(**video_data)
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

@router.get("/", response_model=dict)
def get_video_lectures(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Number of videos per page"),
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all video lectures with pagination"""
    # Calculate offset
    offset = (page - 1) * limit
    
    # Build query
    query = db.query(VideoLecture)
    if subject:
        query = query.filter(VideoLecture.subject == subject)
    if topic:
        query = query.filter(VideoLecture.topic == topic)
    
    # Get videos with pagination
    videos = query.offset(offset).limit(limit).all()
    
    # Get total count
    total_count = query.count()
    
    # Convert SQLAlchemy objects to Pydantic models
    video_responses = [VideoLectureResponse.model_validate(video) for video in videos]
    
    return {
        "value": video_responses,
        "Count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/{video_id}", response_model=VideoLectureResponse)
def get_video_lecture(
    video_id: int,
    db: Session = Depends(get_db)
):
    # Public endpoint - no authentication required for viewing individual videos
    video = db.query(VideoLecture).filter(VideoLecture.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video lecture not found")
    return video

@router.get("/teacher/lectures", response_model=List[VideoLectureResponse])
def get_teacher_lectures(
    db: Session = Depends(get_db),
    user_data: dict = Depends(require_teacher_or_admin)
):
    return db.query(VideoLecture).filter(VideoLecture.teacher_username == user_data["email"]).all()

@router.put("/{video_id}", response_model=VideoLectureResponse)
def update_video_lecture(
    video_id: int,
    video_update: VideoLectureUpdate,
    db: Session = Depends(get_db),
    user_data: dict = Depends(require_teacher_or_admin)
):
    video = db.query(VideoLecture).filter(
        VideoLecture.id == video_id,
        VideoLecture.teacher_username == user_data["email"]  # Only allow teachers to edit their own videos
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video lecture not found or unauthorized")
    
    # Update video fields using setattr to avoid type issues
    update_data = video_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(video, field, value)
    
    db.commit()
    db.refresh(video)
    return video
    return video

@router.delete("/{video_id}")
def delete_video_lecture(
    video_id: int,
    db: Session = Depends(get_db),
    user_data: dict = Depends(require_teacher_or_admin)
):
    # First check if video exists
    video = db.query(VideoLecture).filter(VideoLecture.id == video_id).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video lecture not found")
    
    # Check if user owns the video
    if video.teacher_username != user_data.get("email", ""):
        raise HTTPException(status_code=403, detail="You can only delete videos that you created")
    
    db.delete(video)
    db.commit()
    return {"message": "Video lecture deleted successfully"}
