from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from ..database.database import Base
from datetime import datetime

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    file_path = Column(String)  # Path to PDF file or external link
    copies_owned = Column(Integer, default=1)
    copies_available = Column(Integer)
    tags = Column(String)  # Comma-separated tags
    created_at = Column(DateTime, default=datetime.utcnow)

class BookLending(Base):
    __tablename__ = "book_lendings"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    username = Column(String, index=True)  # Store username from JWT
    borrow_date = Column(DateTime, default=datetime.utcnow)
    return_date = Column(DateTime, nullable=True)
    is_active = Column(Integer, default=1)  # 1 for active, 0 for returned

    book = relationship("Book")
