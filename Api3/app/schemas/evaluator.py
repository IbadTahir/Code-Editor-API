from pydantic import BaseModel, Field, model_validator, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Union
from enum import Enum
import json
import re

class EvaluatorType(str, Enum):
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"

class SubmissionType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    CODE = "code"

class QuizType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    OPEN_ENDED = "open_ended"
    CODE_EVALUATION = "code_evaluation"
    ESSAY = "essay"
    CODING = "coding"

class EvaluatorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=5000)
    type: EvaluatorType
    submission_type: SubmissionType
    is_auto_eval: bool
    deadline: Optional[datetime] = Field(None)
    max_attempts: int = Field(1, ge=1, le=10)
    quiz_type: Optional[QuizType] = None
    quiz_data: Optional[Dict] = None
    
    @model_validator(mode='before')
    @classmethod
    def validate_title(cls, data):
        """Validate title contains only allowed characters and is properly formatted"""
        if isinstance(data, dict):
            title = data.get('title')
            if title:
                # Allow alphanumeric, spaces, common punctuation, and colons
                if not re.match(r'^[\w\s\-.,?!():&\'\"]+$', title):
                    raise ValueError('Title contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed.')
                # Trim whitespace
                data['title'] = title.strip()
        return data
        
    @model_validator(mode='before')
    @classmethod
    def validate_deadline(cls, data):
        deadline = data.get('deadline')
        if deadline and deadline < datetime.now():
            raise ValueError('Deadline cannot be in the past')
        return data

    @model_validator(mode='before')
    @classmethod
    def validate_quiz_fields(cls, data):
        eval_type = data.get('type')
        is_auto_eval = data.get('is_auto_eval')
        quiz_type = data.get('quiz_type')
        quiz_data = data.get('quiz_data')

        if eval_type == EvaluatorType.QUIZ and is_auto_eval:
            if not quiz_type:
                raise ValueError('Auto-evaluated quizzes must specify quiz_type')
            
            # Only validate quiz_data if it's provided (allows creation without data, validation on update)
            if quiz_data is not None and quiz_type == QuizType.MULTIPLE_CHOICE:
                if not isinstance(quiz_data, dict):
                    raise ValueError('Quiz data must be a valid dictionary')
                if 'questions' in quiz_data and 'correct_answers' in quiz_data:
                    if len(quiz_data['questions']) != len(quiz_data['correct_answers']):
                        raise ValueError('Number of questions must match number of answers')

        return data

class EvaluatorCreate(EvaluatorBase):
    pass

class EvaluatorResponse(EvaluatorBase):
    id: int
    teacher_username: str
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def convert_auto_eval(cls, data):
        if not isinstance(data, dict):
            data = dict(data)
        # Convert integer is_auto_eval to boolean if needed
        if 'is_auto_eval' in data and isinstance(data['is_auto_eval'], int):
            data['is_auto_eval'] = bool(data['is_auto_eval'])
        return data

class SubmissionCreate(BaseModel):
    submission_content: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The content of the submission. For text submissions, this is the actual text. For other types, this could be a file path or URL."
    )
    
    @model_validator(mode='before')
    @classmethod
    def validate_content(cls, data):
        content = data.get('submission_content')
        if not content or not content.strip():
            raise ValueError('Submission content cannot be empty or just whitespace')
        data['submission_content'] = content.strip()
        return data

class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    evaluator_id: int
    student_username: str
    submission_content: str
    submission_date: datetime
    provisional_grade: Optional[int] = None
    final_grade: Optional[int] = None
    feedback: Optional[str] = None
    status: str
    evaluator: Optional[EvaluatorResponse] = None

class EvaluatorStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    status: str
    submission_date: Optional[datetime] = None
    provisional_grade: Optional[int] = None
    final_grade: Optional[int] = None
    feedback: Optional[str] = None
    grade: Optional[int] = None

class GradeSubmission(BaseModel):
    grade: int = Field(..., ge=0, le=100, description="Final grade between 0 and 100")
    feedback: str = Field(..., min_length=1, description="Feedback for the submission")

class EvaluatorUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    type: Optional[EvaluatorType] = None
    submission_type: Optional[SubmissionType] = None
    is_auto_eval: Optional[bool] = None
    quiz_type: Optional[QuizType] = None
    quiz_data: Optional[Dict] = None
    max_attempts: Optional[int] = Field(None, ge=1, le=10)
    deadline: Optional[datetime] = None
