import google.generativeai as genai  # type: ignore
from typing import Optional, List, Dict, Any, Tuple, Union
from ..config import get_settings
import json
import asyncio
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Type hint for Gemini model - using Any to avoid type checker issues
GeminiModel = Union[Any, None]

# Configure the Gemini API
def configure_gemini() -> GeminiModel:
    """Configure Gemini API with proper error handling"""
    try:
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key-here":
            logger.warning("Gemini API key not configured. Auto-evaluation will use fallback mode.")
            return None
        
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore
        model = genai.GenerativeModel('gemini-1.5-flash')  # type: ignore
        
        # Test the API with a simple call
        try:
            test_response = model.generate_content("Test")
            logger.info("Gemini API configured and tested successfully")
            return model
        except Exception as api_error:
            logger.error(f"Gemini API test failed: {api_error}")
            logger.warning("Falling back to mock evaluation mode")
            return None
            
    except Exception as e:
        logger.error(f"Failed to configure Gemini API: {e}")
        logger.warning("Falling back to mock evaluation mode")
        return None

# Initialize model
model: GeminiModel = configure_gemini()

async def evaluate_quiz(
    quiz_content: str,
    student_answer: str,
    max_points: int = 100
) -> tuple[int, str]:
    """
    Use Gemini AI to evaluate a quiz submission
    Returns: (score, feedback)
    """
    try:
        prompt = f"""
        You are an EXTREMELY STRICT educational AI evaluator. Be harsh and conservative in your scoring.
        Evaluate the student's answer based on the quiz content with the highest academic standards.
        
        Quiz Content:
        {quiz_content}
        
        Student's Answer:
        {student_answer}
        
        STRICT EVALUATION CRITERIA (BE VERY CONSERVATIVE):
        - Award 90-100 points ONLY for exceptional, comprehensive, perfectly accurate answers that go above and beyond
        - Award 80-89 points for very good answers with excellent understanding and minor imperfections
        - Award 70-79 points for good answers that meet requirements but lack depth or have minor errors
        - Award 60-69 points for adequate answers showing basic understanding but missing key concepts
        - Award 50-59 points for poor answers with significant gaps, errors, or misunderstandings
        - Award 40-49 points for very poor answers with major errors and little understanding
        - Award 30-39 points for answers showing minimal effort or severe misunderstandings
        - Award 20-29 points for largely incorrect answers with some attempt
        - Award 10-19 points for answers that are mostly wrong but show minimal effort
        - Award 0-9 points for completely incorrect, irrelevant, or no meaningful response
        
        IMPORTANT: Be significantly more strict than a typical teacher. Most answers should score between 40-70%.
        Only truly exceptional answers deserve scores above 80%.
        
        Please evaluate the answer and provide:
        1. A score out of {max_points} points (be realistic, strict, and conservative)
        2. Detailed feedback explaining the score and what could be improved
        
        Format your response exactly as follows:
        Score: [number]
        Feedback: [your detailed feedback]
        """
        
        if not model:
            logger.warning("Gemini model not available. Using fallback evaluation.")
            return _mock_evaluate_quiz(quiz_content, student_answer, max_points)
        
        # Use sync generate_content since the model doesn't have async methods
        response = model.generate_content(prompt)  # type: ignore
        response_text = response.text
        
        # Parse the response
        lines = response_text.split('\n')
        score_line = next(line for line in lines if line.startswith('Score:'))
        score = int(score_line.split(':')[1].strip())
        
        feedback = '\n'.join(lines[lines.index(next(line for line in lines if line.startswith('Feedback:'))):])\
            .replace('Feedback:', '').strip()
        
        return score, feedback
        
    except Exception as e:
        # Log the error and return a mock evaluation
        logger.error(f"Error in Gemini evaluation: {str(e)}")
        return _mock_evaluate_quiz(quiz_content, student_answer, max_points)

def _mock_evaluate_quiz(quiz_content: str, student_answer: str, max_points: int) -> tuple[int, str]:
    """Fallback evaluation when Gemini is not available - much more conservative scoring"""
    # Simple heuristic-based evaluation with VERY strict scoring
    answer_length = len(student_answer.strip())
    word_count = len(student_answer.split())
    
    # Conservative scoring - start low and build up based on quality indicators
    score = 0
    feedback_parts = []
    
    # Check for completely empty or very short answers
    if answer_length < 5:
        score = 0
        feedback_parts.append("❌ No meaningful response provided.")
    elif answer_length < 20:
        score = max_points * 0.10  # Very low score for minimal effort
        feedback_parts.append("⚠️ Response is too brief and lacks detail.")
    elif answer_length < 50:
        score = max_points * 0.25  # Still low score for insufficient detail
        feedback_parts.append("📝 Response needs much more detail and explanation.")
    elif answer_length < 150:
        score = max_points * 0.40  # Conservative score for moderate effort
        feedback_parts.append("📚 Basic response, but needs significant improvement.")
    elif answer_length < 300:
        score = max_points * 0.55  # Moderate score for detailed response
        feedback_parts.append("✅ Decent response, but could demonstrate deeper understanding.")
    else:
        score = max_points * 0.65  # Conservative score even for long responses
        feedback_parts.append("🌟 Good length, but content quality cannot be verified without AI analysis.")
    
    # Apply harsh penalties for obvious issues
    if any(phrase in student_answer.lower() for phrase in ['i don\'t know', 'no idea', 'idk', 'not sure', 'maybe', 'i think']):
        score = max(0, score * 0.2)  # Much harsher penalty
        feedback_parts.append("⚠️ Response shows uncertainty or lack of knowledge.")
    
    # Apply penalties for repetitive or low-quality content
    if len(set(student_answer.lower().split())) < word_count * 0.6:  # Too much repetition
        score = score * 0.7
        feedback_parts.append("⚠️ Response appears repetitive or lacks varied vocabulary.")
    
    # Very small bonus for good indicators (but still conservative)
    bonus_keywords = ['example', 'because', 'therefore', 'analysis', 'however', 'furthermore', 'specifically', 'evidence']
    keyword_count = sum(1 for keyword in bonus_keywords if keyword in student_answer.lower())
    if keyword_count > 0:
        score = min(score * (1 + keyword_count * 0.05), max_points * 0.70)  # Max 70% even with bonuses
        feedback_parts.append(f"💡 Good use of analytical language ({keyword_count} indicators found).")
    
    # Very conservative cap - no score above 70% in fallback mode
    score = min(score, max_points * 0.70)
    
    feedback_parts.append(f"📊 Response analysis: {word_count} words, {answer_length} characters")
    feedback_parts.append("⚠️ IMPORTANT: This is basic length-based scoring only.")
    feedback_parts.append("🤖 Enable Gemini AI for accurate content-based evaluation.")
    
    return int(score), " ".join(feedback_parts)

async def evaluate_multiple_choice(
    correct_answers: list[str],
    student_answers: list[str],
    points_per_question: Optional[int] = None
) -> tuple[int, str]:
    """
    Evaluate multiple choice questions and provide AI-enhanced feedback
    """
    if len(correct_answers) != len(student_answers):
        return 0, f"Number of answers doesn't match number of questions. Expected {len(correct_answers)}, got {len(student_answers)}"
    
    total_questions = len(correct_answers)
    if total_questions == 0:
        return 0, "No questions to evaluate"
    
    # Calculate points per question correctly
    points_per_q = points_per_question or (100.0 / total_questions)
    
    # Count correct answers
    correct_count = 0
    detailed_results = []
    
    for i, (correct, student) in enumerate(zip(correct_answers, student_answers)):
        is_correct = str(correct).strip().lower() == str(student).strip().lower()
        if is_correct:
            correct_count += 1
        detailed_results.append({
            'question': i + 1,
            'correct': is_correct,
            'student_answer': str(student),
            'correct_answer': str(correct)
        })
    
    # Calculate final score as percentage
    percentage_correct = (correct_count / total_questions) * 100
    final_score = min(int(percentage_correct), 100)
    
    try:
        # Use Gemini to generate detailed feedback
        prompt = f"""As an educational evaluator, provide detailed feedback for this multiple choice quiz:
        
        Results Summary:
        - Total Questions: {total_questions}
        - Correct Answers: {correct_count}
        - Incorrect Answers: {total_questions - correct_count}
        - Percentage Score: {percentage_correct:.1f}%
        
        Question-by-Question Results:
        {json.dumps(detailed_results, indent=2)}
        
        Please provide:
        1. A clear summary of performance
        2. Specific feedback on what was answered incorrectly
        3. Educational tips for improvement
        4. Encouragement appropriate to the score level
        
        Keep the feedback constructive, specific, and encouraging.
        """
        
        if not model:
            logger.warning("Gemini model not available. Using fallback evaluation.")
            return final_score, _generate_detailed_mc_feedback(correct_count, total_questions, detailed_results)
        
        # Use sync generate_content since the model doesn't have async methods
        response = model.generate_content(prompt)  # type: ignore
        detailed_feedback = response.text
        
        return final_score, detailed_feedback
        
    except Exception as e:
        # Fallback to mock evaluation if AI fails
        logger.error(f"Error in Gemini multiple choice evaluation: {str(e)}")
        return final_score, _generate_detailed_mc_feedback(correct_count, total_questions, detailed_results)

def _generate_detailed_mc_feedback(correct_count: int, total_questions: int, detailed_results: list) -> str:
    """Generate detailed feedback for multiple choice questions"""
    percentage = (correct_count / total_questions) * 100
    
    feedback_parts = [
        f"🎯 **Quiz Results Summary**",
        f"📊 Score: {correct_count}/{total_questions} correct answers ({percentage:.1f}%)",
        f""
    ]
    
    # Performance level feedback
    if percentage >= 90:
        feedback_parts.append("🏆 **Excellent work!** Outstanding performance on this quiz.")
    elif percentage >= 80:
        feedback_parts.append("⭐ **Great job!** Very strong understanding of the material.")
    elif percentage >= 70:
        feedback_parts.append("👍 **Good work!** Solid understanding with room for improvement.")
    elif percentage >= 60:
        feedback_parts.append("📚 **Decent effort.** Review the material for better understanding.")
    else:
        feedback_parts.append("📖 **Needs improvement.** Consider reviewing the material thoroughly.")
    
    # Question-by-question feedback
    if correct_count < total_questions:
        feedback_parts.append(f"\n📝 **Question Analysis:**")
        incorrect_questions = [r for r in detailed_results if not r['correct']]
        
        for result in incorrect_questions:
            q_num = result['question']
            student_ans = result['student_answer']
            correct_ans = result['correct_answer']
            feedback_parts.append(
                f"❌ Question {q_num}: You answered '{student_ans}', correct answer was '{correct_ans}'"
            )
    
    if percentage < 100:
        feedback_parts.append(f"\n💡 **Study Tips:** Review the questions you missed and related concepts.")
    
    feedback_parts.append(f"\n🤖 **Note:** This is automated evaluation. Review with your instructor for detailed explanations.")
    
    return "\n".join(feedback_parts)

def _mock_evaluate_multiple_choice(correct_answers: list[str], student_answers: list[str], points_per_question: float) -> tuple[int, str]:
    """Fallback multiple choice evaluation with correct scoring"""
    correct_count = sum(1 for ca, sa in zip(correct_answers, student_answers) if str(ca).strip().lower() == str(sa).strip().lower())
    total_questions = len(correct_answers)
    
    # Calculate percentage score correctly
    percentage_score = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    final_score = min(int(percentage_score), 100)
    
    feedback_parts = [
        f"🎯 Score: {correct_count}/{total_questions} correct answers ({percentage_score:.1f}%)"
    ]
    
    if correct_count == total_questions:
        feedback_parts.append("🏆 Perfect score! Excellent work!")
    elif percentage_score >= 80:
        feedback_parts.append("⭐ Great job! Very strong performance.")
    elif percentage_score >= 60:
        feedback_parts.append("👍 Good work! Room for improvement.")
    else:
        feedback_parts.append("📚 Consider reviewing the material for better understanding.")
    
    feedback_parts.append("🤖 Note: This is a basic evaluation. Enable Gemini AI for detailed analysis.")
    
    return final_score, " ".join(feedback_parts)

async def evaluate_code(
    problem_description: str,
    test_cases: List[Dict[str, Any]],
    student_code: str,
    language: str
) -> tuple[int, str]:
    """
    Evaluate a code submission using Gemini AI.
    Returns a tuple of (score, feedback).
    """
    try:
        prompt = f"""As an EXTREMELY STRICT coding evaluator, evaluate this {language} code submission with high academic standards:
        
        Problem Description:
        {problem_description}
        
        Student's Code:
        ```{language}
        {student_code}
        ```
        
        Test Cases:
        {json.dumps(test_cases, indent=2)}
        
        STRICT EVALUATION CRITERIA (BE VERY CONSERVATIVE):
        1. Correctness (50% weight): Does it solve the problem correctly? Are there bugs or logic errors?
        2. Code quality (25% weight): Style, efficiency, readability, proper structure
        3. Test case coverage (15% weight): Does it handle all provided test cases?
        4. Error handling (10% weight): Robustness and edge case handling
        
        SCORING GUIDELINES (BE HARSH):
        - 90-100: Perfect solution, exceptional code quality, handles all edge cases
        - 80-89: Correct solution with very good coding practices
        - 70-79: Mostly correct with minor issues or inefficiencies
        - 60-69: Basic working solution but with notable problems
        - 50-59: Partial solution with significant issues
        - 40-49: Major problems, may not work for many cases
        - 30-39: Severe issues, minimal functionality
        - 20-29: Largely non-functional but shows some understanding
        - 10-19: Minimal effort, mostly incorrect
        - 0-9: Non-functional or no meaningful attempt
        
        IMPORTANT: Most student code should score between 30-70%. Only exceptional code deserves 80+.
        
        Provide your response in the following format:
        Score: [0-100]
        Feedback: [detailed analysis and suggestions]
        """
        
        if not model:
            logger.warning("Gemini model not available. Using fallback evaluation.")
            return _mock_evaluate_code(problem_description, test_cases, student_code, language)
        
        # Use sync generate_content since the model doesn't have async methods
        response = model.generate_content(prompt)  # type: ignore
        response_text = response.text
        
        # Parse the response
        lines = response_text.split('\n')
        score_line = next(line for line in lines if line.startswith('Score:'))
        score = int(score_line.split(':')[1].strip())
        
        feedback = '\n'.join(lines[lines.index(next(line for line in lines if line.startswith('Feedback:'))):])\
            .replace('Feedback:', '').strip()
        
        return score, feedback
        
    except Exception as e:
        logger.error(f"Error in Gemini code evaluation: {str(e)}")
        return _mock_evaluate_code(problem_description, test_cases, student_code, language)

def _mock_evaluate_code(problem_description: str, test_cases: List[Dict[str, Any]], student_code: str, language: str) -> tuple[int, str]:
    """Fallback code evaluation when Gemini is not available - conservative scoring"""
    code_length = len(student_code.strip())
    lines_count = len(student_code.split('\n'))
    
    # Start with very low base score - code evaluation needs to be earned
    score = 15  # Very low base score
    feedback_parts = []
    
    # Basic code quality checks with conservative scoring
    if code_length < 10:
        score = 0
        feedback_parts.append("❌ Code is too short to be meaningful.")
        return score, " ".join(feedback_parts)
    elif code_length < 20:
        score = 10
        feedback_parts.append("⚠️ Code seems too short to be a complete solution.")
    elif code_length < 50:
        score = 20
        feedback_parts.append("📝 Code is very brief - may be incomplete.")
    else:
        score = 25
        feedback_parts.append("✅ Code has reasonable length.")
    
    # Check for common good practices - small bonuses only
    if any(keyword in student_code.lower() for keyword in ['def ', 'function', 'class']):
        score += 8
        feedback_parts.append("👍 Uses functions/classes.")
    
    if '//' in student_code or '#' in student_code or '/*' in student_code:
        score += 5
        feedback_parts.append("📝 Includes comments.")
    
    if any(keyword in student_code.lower() for keyword in ['try', 'catch', 'except', 'error']):
        score += 8
        feedback_parts.append("🛡️ Includes error handling.")
    
    # Check for basic programming constructs
    if any(keyword in student_code.lower() for keyword in ['if', 'else', 'for', 'while', 'loop']):
        score += 5
        feedback_parts.append("🔄 Uses control structures.")
    
    if any(keyword in student_code.lower() for keyword in ['return', 'print', 'console.log', 'cout']):
        score += 5
        feedback_parts.append("📤 Produces output or returns values.")
    
    # Language-specific checks - very small bonuses
    if language == 'python':
        if 'import' in student_code:
            score += 3
            feedback_parts.append("📦 Uses imports.")
    elif language == 'javascript':
        if 'const' in student_code or 'let' in student_code:
            score += 3
            feedback_parts.append("🔧 Uses modern JavaScript syntax.")
    
    # Apply penalties for obvious issues
    if len(student_code.strip().split('\n')) < 3:
        score = int(score * 0.7)
        feedback_parts.append("⚠️ Solution appears overly simplistic.")
    
    # Very conservative cap - max 60% for fallback code evaluation
    score = max(0, min(60, int(score)))
    
    feedback_parts.extend([
        f"📊 Code metrics: {lines_count} lines, {code_length} characters",
        f"🔧 Language: {language.title()}",
        "⚠️ IMPORTANT: This is basic structural analysis only.",
        "🤖 Enable Gemini AI for proper code logic and correctness evaluation."
    ])
    
    return score, " ".join(feedback_parts)

def reinitialize_gemini():
    """Reinitialize Gemini model - useful when API key is updated"""
    global model
    model = configure_gemini()
    return model is not None

def get_model_status():
    """Get current model status"""
    return {
        "available": model is not None,
        "api_key_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here")
    }
