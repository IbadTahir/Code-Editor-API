from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLAEnum
from ..database.database import Base
from datetime import datetime
from ..schemas.user import UserRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(SQLAEnum(UserRole), default=UserRole.STUDENT)
    jwt_key = Column(String, index=True, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
