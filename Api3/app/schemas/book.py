from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BookBase(BaseModel):
    title: str
    copies_owned: int
    tags: str

class BookCreate(BookBase):
    file_path: str

class BookUpdate(BaseModel):
    title: Optional[str] = None
    file_path: Optional[str] = None
    copies_owned: Optional[int] = None
    tags: Optional[str] = None

class BookResponse(BookBase):
    id: int
    file_path: Optional[str] = None
    copies_available: int
    created_at: datetime

    class Config:
        from_attributes = True

class BookLendingCreate(BaseModel):
    book_id: int

class BookLendingResponse(BaseModel):
    id: int
    book_id: int
    username: str
    borrow_date: datetime
    return_date: Optional[datetime]
    is_active: int
    book: BookResponse

    class Config:
        from_attributes = True
