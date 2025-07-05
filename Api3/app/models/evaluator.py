from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum as SQLAEnum, JSON
from sqlalchemy.orm import relationship
from ..database.database import Base
import enum
from datetime import datetime

class EvaluatorType(str, enum.Enum):
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"

class SubmissionType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    CODE = "code"

class QuizType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    OPEN_ENDED = "open_ended"
    CODE_EVALUATION = "code_evaluation"
    ESSAY = "essay"
    CODING = "coding"

class Evaluator(Base):
    __tablename__ = "evaluators"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    type = Column(SQLAEnum(EvaluatorType))
    teacher_username = Column(String, index=True)  # Store teacher's username from JWT
    created_at = Column(DateTime, default=datetime.utcnow)
    submission_type = Column(SQLAEnum(SubmissionType))
    is_auto_eval = Column(Integer, default=0)  # 0 for manual, 1 for auto evaluation
    deadline = Column(DateTime, nullable=True)
    quiz_type = Column(SQLAEnum(QuizType), nullable=True)
    quiz_data = Column(JSON, nullable=True)  # Store structured quiz data
    max_attempts = Column(Integer, default=1)  # Maximum number of attempts allowed
    
    @property
    def is_auto_eval_bool(self):
        return bool(getattr(self, 'is_auto_eval', 0))

    def to_dict(self):
        """Convert evaluator to dictionary for serialization"""
        created_at = getattr(self, 'created_at', None)
        deadline = getattr(self, 'deadline', None)
        type_value = getattr(self, 'type', None)
        submission_type_value = getattr(self, 'submission_type', None)
        quiz_type_value = getattr(self, 'quiz_type', None)
        
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "type": type_value.value if type_value else None,
            "teacher_username": self.teacher_username,
            "created_at": created_at.isoformat() if created_at else None,
            "submission_type": submission_type_value.value if submission_type_value else None,
            "is_auto_eval": bool(getattr(self, 'is_auto_eval', 0)),
            "deadline": deadline.isoformat() if deadline else None,
            "quiz_type": quiz_type_value.value if quiz_type_value else None,
            "quiz_data": getattr(self, 'quiz_data', None),
            "max_attempts": getattr(self, 'max_attempts', 1)
        }

class EvaluatorSubmission(Base):
    __tablename__ = "evaluator_submissions"

    id = Column(Integer, primary_key=True, index=True)
    evaluator_id = Column(Integer, ForeignKey("evaluators.id"))
    student_username = Column(String, index=True)  # Store student's username from JWT
    submission_content = Column(Text)  # Can be text content or file path
    submission_date = Column(DateTime, default=datetime.utcnow)
    provisional_grade = Column(Integer, nullable=True)  # For auto-evaluated quizzes
    final_grade = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String)  # submitted, graded, etc.

    evaluator = relationship("Evaluator")

    def to_dict(self):
        """Convert submission to dictionary for serialization"""
        submission_date = getattr(self, 'submission_date', None)
        
        return {
            "id": self.id,
            "evaluator_id": self.evaluator_id,
            "student_username": self.student_username,
            "submission_content": self.submission_content,
            "submission_date": submission_date.isoformat() if submission_date else None,
            "provisional_grade": self.provisional_grade,
            "final_grade": self.final_grade,
            "feedback": self.feedback,
            "status": self.status,
            "evaluator": self.evaluator.to_dict() if self.evaluator else None
        }
