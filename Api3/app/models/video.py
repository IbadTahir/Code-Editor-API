from sqlalchemy import Column, Integer, String, DateTime, Text
from ..database.database import Base
from datetime import datetime

class VideoLecture(Base):
    __tablename__ = "video_lectures"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    video_url = Column(String)  # YouTube/Vimeo URL
    teacher_username = Column(String, index=True)  # Store teacher's username from JWT
    subject = Column(String, index=True)
    topic = Column(String, index=True)
    notes_url = Column(String, nullable=True)  # URL to attached notes/slides
    created_at = Column(DateTime, default=datetime.utcnow)
