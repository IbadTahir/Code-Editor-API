# Gemini AI Integration Setup Guide

## Overview
This project integrates Google's Gemini AI for intelligent evaluation of quizzes, code submissions, and assignments. The AI provides detailed feedback and scoring for student submissions.

## Where to Put Your Gemini API Key

### Step 1: Get Your Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" and create a new API key
4. Copy the generated API key

### Step 2: Configure the API Key in the Backend (Api3)

The Gemini API key should be configured in the **Api3** backend service:

**Location**: `Api3/.env`

```bash
# Api3/.env file
PORT=8000

# Database
DATABASE_URL=sqlite:///./edu_platform.db

# AI Configuration - PUT YOUR GEMINI API KEY HERE
GEMINI_API_KEY=your-actual-gemini-api-key-here

# JWT Configuration
SECRET_KEY=your-secret-key-for-jwt-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
DEBUG=True
```

⚠️ **Important**: Replace `your-actual-gemini-api-key-here` with your actual Gemini API key!

### Step 3: Restart the Backend
After updating the API key, restart the Api3 service:

```bash
cd Api3
python -m app.main
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## How to Verify the Setup

### 1. Check AI Status via API
Visit: `http://localhost:8000/api/v1/ai/status`

You should see:
```json
{
  "ai_available": true,
  "api_key_configured": true,
  "service": "Gemini AI",
  "status": "active"
}
```

### 2. Test AI Evaluation
Visit: `http://localhost:8000/docs` and try the AI evaluation endpoints:
- `/api/v1/ai/evaluate-quiz`
- `/api/v1/ai/evaluate-code`
- `/api/v1/ai/evaluate-multiple-choice`

### 3. Frontend Integration
The frontend will automatically use the enhanced AI evaluation when:
- A valid Gemini API key is configured
- The backend service is running
- The user submits content for evaluation

## Issues Fixed

### Backend Issues:
1. ✅ **Missing .env file**: Created `.env` file in Api3 directory
2. ✅ **Async/sync mismatch**: Fixed Gemini API calls to use sync methods
3. ✅ **Missing AI endpoints**: Added direct AI evaluation endpoints
4. ✅ **Model reinitialization**: Added functions to reinitialize Gemini model

### Frontend Issues:
1. ✅ **Mock AI service**: Updated frontend to call backend AI evaluation
2. ✅ **Enhanced analysis**: Added methods that combine client-side and backend AI
3. ✅ **Error handling**: Added fallback to client-side analysis when backend fails

### Database Integration:
1. ✅ **Auto-evaluation**: Submissions are automatically evaluated when `is_auto_eval` is enabled
2. ✅ **Feedback storage**: AI feedback is stored in the database with submissions
3. ✅ **Grade provisioning**: AI provides provisional grades that teachers can review

## Fallback Behavior

If the Gemini API key is not configured or invalid:
- The system will use mock evaluation functions
- Users will still receive feedback (less sophisticated)
- All functionality remains available
- Teachers can still manually grade submissions

## Security Notes

- Never commit your actual API key to version control
- Use environment variables for API key configuration
- The `.env` file is gitignored by default
- Consider using different API keys for development and production

## Cost Considerations

Gemini AI API usage is charged per request. Monitor your usage in the Google Cloud Console to avoid unexpected charges. The system includes fallback mechanisms to minimize API calls when errors occur.
