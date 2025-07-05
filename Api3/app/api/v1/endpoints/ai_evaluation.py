from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from ....utils.gemini_utils import evaluate_quiz, evaluate_multiple_choice, evaluate_code
from ....database.database import get_db
from sqlalchemy.orm import Session
import logging
import json
import re

logger = logging.getLogger(__name__)
router = APIRouter()

class QuizEvaluationRequest(BaseModel):
    quiz_content: str
    student_answer: str
    max_points: int = 100

class CodeEvaluationRequest(BaseModel):
    problem_description: str
    student_code: str
    language: str = "python"
    test_cases: List[Dict[str, Any]] = []

class MultipleChoiceEvaluationRequest(BaseModel):
    correct_answers: List[str]
    student_answers: List[str]
    points_per_question: Optional[int] = None

class EvaluationResponse(BaseModel):
    score: int
    feedback: str

class QuizGenerationRequest(BaseModel):
    language: str = "python"  # go, python, java, javascript
    difficulty: str = "intermediate"  # beginner, intermediate, advanced
    question_count: int = 10
    include_mcq: bool = True
    include_theoretical: bool = True
    topic: Optional[str] = None

class GeneratedQuiz(BaseModel):
    title: str
    description: str
    language: str
    difficulty: str
    questions: List[Dict[str, Any]]
    estimated_duration: int  # in minutes
    total_points: int

@router.post("/evaluate-quiz", response_model=EvaluationResponse)
async def evaluate_quiz_endpoint(request: QuizEvaluationRequest):
    """
    Direct endpoint for quiz evaluation using Gemini AI
    """
    try:
        score, feedback = await evaluate_quiz(
            quiz_content=request.quiz_content,
            student_answer=request.student_answer,
            max_points=request.max_points
        )
        return EvaluationResponse(score=score, feedback=feedback)
    except Exception as e:
        logger.error(f"Quiz evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.post("/evaluate-code", response_model=EvaluationResponse)
async def evaluate_code_endpoint(request: CodeEvaluationRequest):
    """
    Direct endpoint for code evaluation using Gemini AI
    """
    try:
        score, feedback = await evaluate_code(
            problem_description=request.problem_description,
            test_cases=request.test_cases,
            student_code=request.student_code,
            language=request.language
        )
        return EvaluationResponse(score=score, feedback=feedback)
    except Exception as e:
        logger.error(f"Code evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.post("/evaluate-multiple-choice", response_model=EvaluationResponse)
async def evaluate_multiple_choice_endpoint(request: MultipleChoiceEvaluationRequest):
    """
    Direct endpoint for multiple choice evaluation using Gemini AI
    """
    try:
        score, feedback = await evaluate_multiple_choice(
            correct_answers=request.correct_answers,
            student_answers=request.student_answers,
            points_per_question=request.points_per_question
        )
        return EvaluationResponse(score=score, feedback=feedback)
    except Exception as e:
        logger.error(f"Multiple choice evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.get("/status")
async def ai_status():
    """
    Check AI evaluation service status
    """
    from ....utils.gemini_utils import get_model_status
    status = get_model_status()
    return {
        "ai_available": status["available"],
        "api_key_configured": status["api_key_configured"],
        "service": "Gemini AI" if status["available"] else "Fallback Mock",
        "status": "active"
    }

@router.post("/reinitialize")
async def reinitialize_ai():
    """
    Reinitialize AI service (useful after updating API key)
    """
    from ....utils.gemini_utils import reinitialize_gemini
    success = reinitialize_gemini()
    return {
        "success": success,
        "message": "AI service reinitialized successfully" if success else "Failed to initialize AI service"
    }

@router.post("/generate-quiz", response_model=GeneratedQuiz)
async def generate_ai_quiz(request: QuizGenerationRequest):
    """
    Generate an AI-powered quiz using Gemini AI
    """
    try:
        from ....utils.gemini_utils import model
        
        if not model:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        # Create comprehensive prompt for quiz generation
        prompt = f"""
        Generate a comprehensive programming quiz for {request.language} language.
        
        Requirements:
        - Difficulty: {request.difficulty}
        - Total questions: {request.question_count}
        - Include MCQs: {request.include_mcq}
        - Include theoretical questions: {request.include_theoretical}
        - Topic focus: {request.topic or 'General ' + request.language + ' programming'}
        
        Create a balanced mix of:
        1. Multiple Choice Questions (if enabled) - 4 options each
        2. Theoretical/Conceptual Questions (if enabled) - open-ended
        3. Code analysis questions
        4. Best practices questions
        
        Format the response as JSON with this exact structure:
        {{
            "title": "Quiz title",
            "description": "Brief description",
            "language": "{request.language}",
            "difficulty": "{request.difficulty}",
            "questions": [
                {{
                    "id": 1,
                    "type": "mcq",
                    "question": "Question text",
                    "options": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                    "explanation": "Why this is correct",
                    "points": 5
                }},
                {{
                    "id": 2,
                    "type": "theoretical",
                    "question": "Question text",
                    "sample_answer": "Expected answer guidelines",
                    "points": 10
                }}
            ],
            "estimated_duration": 30,
            "total_points": 100
        }}
        
        Make sure questions are practical, relevant, and test real programming knowledge.
        Include current best practices and common pitfalls.
        """
        
        # Generate quiz using Gemini
        response = model.generate_content(prompt)
        quiz_text = response.text
          # Clean and parse JSON response
        # Extract JSON from response (remove markdown formatting if present)
        json_match = re.search(r'\{.*\}', quiz_text, re.DOTALL)
        if json_match:
            quiz_data = json.loads(json_match.group())
        else:
            # Fallback if JSON parsing fails
            quiz_data = _generate_fallback_quiz(request)
        
        return GeneratedQuiz(**quiz_data)
        
    except json.JSONDecodeError:
        logger.warning("Failed to parse AI-generated quiz JSON, using fallback")
        quiz_data = _generate_fallback_quiz(request)
        return GeneratedQuiz(**quiz_data)
    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}")
        # Return fallback quiz instead of failing
        quiz_data = _generate_fallback_quiz(request)
        return GeneratedQuiz(**quiz_data)

def _generate_fallback_quiz(request: QuizGenerationRequest) -> dict:
    """Generate a fallback quiz when AI generation fails"""
    
    language_topics = {
        "python": {
            "mcq": [
                {
                    "question": "Which of the following is the correct way to create a list in Python?",
                    "options": ["list = []", "list = ()", "list = {}", "list = ||"],
                    "correct_answer": "list = []",
                    "explanation": "Square brackets [] are used to create lists in Python"
                },
                {
                    "question": "What is the output of print(type([]))?",
                    "options": ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"],
                    "correct_answer": "<class 'list'>",
                    "explanation": "[] creates a list object, and type() returns the class type"
                }
            ],
            "theoretical": [
                {
                    "question": "Explain the difference between lists and tuples in Python. When would you use each?",
                    "sample_answer": "Lists are mutable and use [], tuples are immutable and use (). Use lists for changeable data, tuples for fixed data."
                },
                {
                    "question": "What are Python decorators and how do they work? Provide an example.",
                    "sample_answer": "Decorators are functions that modify other functions. They use @ syntax and are used for logging, authentication, etc."
                }
            ]
        },
        "javascript": {
            "mcq": [
                {
                    "question": "Which method is used to add an element to the end of an array in JavaScript?",
                    "options": ["push()", "add()", "append()", "insert()"],
                    "correct_answer": "push()",
                    "explanation": "push() method adds elements to the end of an array"
                },
                {
                    "question": "What is the correct way to declare a variable in modern JavaScript?",
                    "options": ["var x = 5", "let x = 5", "const x = 5", "All of the above"],
                    "correct_answer": "All of the above",
                    "explanation": "var, let, and const are all valid variable declarations with different scoping rules"
                }
            ],
            "theoretical": [
                {
                    "question": "Explain the concept of closures in JavaScript with an example.",
                    "sample_answer": "Closures allow inner functions to access outer function variables even after the outer function returns."
                },
                {
                    "question": "What is the difference between == and === in JavaScript?",
                    "sample_answer": "== performs type coercion, === checks strict equality without type conversion."
                }
            ]
        },
        "java": {
            "mcq": [
                {
                    "question": "Which keyword is used to create a constant in Java?",
                    "options": ["const", "final", "static", "immutable"],
                    "correct_answer": "final",
                    "explanation": "final keyword is used to create constants in Java"
                },
                {
                    "question": "What is the correct way to start the main method in Java?",
                    "options": ["public static void main(String[] args)", "static public void main(String args[])", "public void main(String[] args)", "Both A and B"],
                    "correct_answer": "Both A and B",
                    "explanation": "Both syntax variations are valid for the main method"
                }
            ],
            "theoretical": [
                {
                    "question": "Explain the concept of inheritance in Java and provide an example.",
                    "sample_answer": "Inheritance allows classes to inherit properties and methods from parent classes using extends keyword."
                },
                {
                    "question": "What are Java interfaces and how do they differ from abstract classes?",
                    "sample_answer": "Interfaces define contracts with all abstract methods (before Java 8), while abstract classes can have concrete methods."
                }
            ]
        },
        "go": {
            "mcq": [
                {
                    "question": "How do you declare a variable in Go?",
                    "options": ["var name string", "string name", "declare name string", "name := string"],
                    "correct_answer": "var name string",
                    "explanation": "var keyword is used for variable declaration in Go"
                },
                {
                    "question": "Which symbol is used for short variable declaration in Go?",
                    "options": [":=", "=", "==", "->"],
                    "correct_answer": ":=",
                    "explanation": ":= is used for short variable declaration and assignment in Go"
                }
            ],
            "theoretical": [
                {
                    "question": "Explain goroutines and how they differ from traditional threads.",
                    "sample_answer": "Goroutines are lightweight threads managed by Go runtime, more efficient than OS threads."
                },
                {
                    "question": "What are channels in Go and how are they used for communication?",
                    "sample_answer": "Channels are used for communication between goroutines, following 'Don't communicate by sharing memory' principle."
                }
            ]
        }
    }
    
    lang_data = language_topics.get(request.language.lower(), language_topics["python"])
    questions = []
    question_id = 1
    
    # Add MCQ questions
    if request.include_mcq:
        for mcq in lang_data["mcq"][:request.question_count//2]:
            questions.append({
                "id": question_id,
                "type": "mcq",
                "question": mcq["question"],
                "options": mcq["options"],
                "correct_answer": mcq["correct_answer"],
                "explanation": mcq["explanation"],
                "points": 5
            })
            question_id += 1
    
    # Add theoretical questions
    if request.include_theoretical:
        for theoretical in lang_data["theoretical"][:request.question_count//2]:
            questions.append({
                "id": question_id,
                "type": "theoretical",
                "question": theoretical["question"],
                "sample_answer": theoretical["sample_answer"],
                "points": 10
            })
            question_id += 1
    
    return {
        "title": f"{request.language.title()} Programming Quiz - {request.difficulty.title()}",
        "description": f"A comprehensive {request.difficulty} level quiz covering {request.language} programming concepts",
        "language": request.language,
        "difficulty": request.difficulty,
        "questions": questions,
        "estimated_duration": max(20, len(questions) * 2),
        "total_points": sum(q["points"] for q in questions)
    }

@router.post("/create-from-ai-quiz")
async def create_evaluator_from_ai_quiz(request: QuizGenerationRequest, db: Session = Depends(get_db)):
    """
    Generate an AI quiz and create an evaluator from it
    """
    try:
        # First, generate the quiz
        generated_quiz = await generate_ai_quiz(request)
        
        # Convert to evaluator format
        from ....models.evaluator import Evaluator, EvaluatorType
        from ....schemas.evaluator import QuizType
        
        # Prepare quiz data for database
        quiz_data = {
            "questions": generated_quiz.questions,
            "total_points": generated_quiz.total_points,
            "language": generated_quiz.language,
            "difficulty": generated_quiz.difficulty
        }
        
        # Create evaluator
        db_evaluator = Evaluator(
            title=generated_quiz.title,
            description=f"{generated_quiz.description}\n\nEstimated Duration: {generated_quiz.estimated_duration} minutes",
            type=EvaluatorType.QUIZ,
            teacher_username="ai-generated",
            submission_type="text",
            is_auto_eval=1,  # Enable auto-evaluation
            quiz_type=QuizType.OPEN_ENDED,  # Use open-ended for mixed quiz types
            quiz_data=quiz_data,
            max_attempts=3
        )
        
        db.add(db_evaluator)
        db.commit()
        db.refresh(db_evaluator)
        
        return {
            "evaluator_id": db_evaluator.id,
            "quiz": generated_quiz.dict(),
            "message": "AI-generated quiz created successfully",
            "auto_evaluation_enabled": True
        }
        
    except Exception as e:
        logger.error(f"Failed to create evaluator from AI quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create quiz: {str(e)}")
