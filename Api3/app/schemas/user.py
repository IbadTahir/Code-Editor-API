from pydantic import BaseModel, EmailStr, Field, model_validator
from enum import Enum
from typing import Optional
from datetime import datetime

class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.STUDENT

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class TokenData(BaseModel):
    username: str
    role: str

class UserSession(BaseModel):
    username: str
    email: EmailStr
    role: UserRole

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
