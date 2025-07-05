from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database.database import get_db
from ....models.book import Book, BookLending
from ....schemas.book import BookCreate, BookUpdate, BookResponse, BookLendingCreate, BookLendingResponse
from ....utils.external_auth import verify_token_from_user_management_api, require_teacher_or_admin
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=dict)
def get_books(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Number of books per page"),
    db: Session = Depends(get_db)
):
    """Get all books with pagination"""
    # Calculate offset
    offset = (page - 1) * limit
    
    # Get books with pagination
    books = db.query(Book).offset(offset).limit(limit).all()
    
    # Get total count
    total_count = db.query(Book).count()
    
    # Convert SQLAlchemy objects to Pydantic models
    book_responses = [BookResponse.model_validate(book) for book in books]
    
    return {
        "value": book_responses,
        "Count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.post("/upload", response_model=BookResponse)
def upload_book(
    book: BookCreate,
    db: Session = Depends(get_db)
    # Temporarily removed authentication for testing
    # user_data: dict = Depends(require_teacher_or_admin)
):
    db_book = Book(
        title=book.title,
        file_path=book.file_path,
        copies_owned=book.copies_owned,
        copies_available=book.copies_owned,
        tags=book.tags
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

@router.get("/available", response_model=List[BookResponse])
def get_available_books(
    db: Session = Depends(get_db)
):
    # Public endpoint - no authentication required for browsing books
    return db.query(Book).filter(Book.copies_available > 0).all()

@router.post("/rent", response_model=BookLendingResponse)
def lend_book(
    lending: BookLendingCreate,
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token_from_user_management_api)
):
    book = db.query(Book).filter(Book.id == lending.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Use getattr to safely access the attribute for comparison
    if getattr(book, 'copies_available', 0) <= 0:
        raise HTTPException(status_code=400, detail="No copies available")
    
    # Check if user already has an active lending for this book
    active_lending = db.query(BookLending).filter(
        BookLending.book_id == lending.book_id,
        BookLending.username == user_data["email"],  # Use email as username
        BookLending.is_active == 1
    ).first()
    
    if active_lending:
        raise HTTPException(
            status_code=400,
            detail="You already have an active lending for this book"
        )
    
    db_lending = BookLending(
        book_id=lending.book_id,
        username=user_data["email"]  # Use email as username
    )
    
    # Use setattr to safely update the copies_available
    current_available = getattr(book, 'copies_available', 0)
    setattr(book, 'copies_available', current_available - 1)
    
    db.add(db_lending)
    db.commit()
    db.refresh(db_lending)
    return db_lending

@router.post("/return/{lending_id}")
def return_book(
    lending_id: int,
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token_from_user_management_api)
):
    lending = db.query(BookLending).filter(
        BookLending.id == lending_id,
        BookLending.username == user_data["email"],  # Use email as username
        BookLending.is_active == 1
    ).first()
    
    if not lending:
        raise HTTPException(status_code=404, detail="Active lending not found")
    
    # Use setattr to safely update lending attributes
    setattr(lending, 'is_active', 0)
    setattr(lending, 'return_date', datetime.utcnow())
    
    book = db.query(Book).filter(Book.id == lending.book_id).first()
    if book:  # Check if book exists before updating
        current_available = getattr(book, 'copies_available', 0)
        setattr(book, 'copies_available', current_available + 1)
    
    db.commit()
    return {"message": "Book returned successfully"}

@router.get("/search")
def search_books(
    query: str,
    db: Session = Depends(get_db)
):
    # Public endpoint - no authentication required for searching books
    return db.query(Book).filter(
        (Book.title.ilike(f"%{query}%")) |
        (Book.tags.ilike(f"%{query}%"))
    ).all()

@router.get("/active", response_model=List[BookLendingResponse])
def get_active_lendings(
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token_from_user_management_api)
):
    return db.query(BookLending).filter(
        BookLending.username == user_data["email"],  # Use email as username
        BookLending.is_active == 1
    ).all()

@router.delete("/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token_from_user_management_api)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Check if book has active lendings
    active_lendings = db.query(BookLending).filter(
        BookLending.book_id == book_id,
        BookLending.is_active == 1
    ).count()
    
    if active_lendings > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete book with active lendings"
        )
    
    db.delete(book)
    db.commit()
    return {"message": "Book deleted successfully"}

@router.put("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int,
    book_update: BookUpdate,
    db: Session = Depends(get_db),
    user_data: dict = Depends(require_teacher_or_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Update only the fields that are provided using setattr for type safety
    update_data = book_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'copies_owned':
            # Special handling for copies_owned to update copies_available
            setattr(book, field, value)
            current_lent = db.query(BookLending).filter(
                BookLending.book_id == book_id,
                BookLending.is_active == 1
            ).count()
            new_available = max(0, value - current_lent)
            setattr(book, 'copies_available', new_available)
        else:
            setattr(book, field, value)
    
    db.commit()
    db.refresh(book)
    return book

@router.get("/debug/user-info")
def get_current_user_info(
    user_data: dict = Depends(verify_token_from_user_management_api)
):
    """Debug endpoint to check current user information"""
    return {
        "message": "Authentication successful",
        "user_data": user_data
    }
