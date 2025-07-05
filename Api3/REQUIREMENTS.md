# API3 - Educational Platform Service Requirements

## Python Dependencies

Install all dependencies:
```bash
pip install -r requirements.txt
```

## System Requirements
- **Python**: 3.8+ (3.11 recommended)
- **SQLite**: Included with Python

## Dependencies (requirements.txt)
```
fastapi==0.115.12
uvicorn==0.34.3
sqlalchemy==2.0.41
pydantic==2.11.5
python-jose[cryptography]==3.5.0
passlib[bcrypt]==1.7.4
email-validator==2.1.0.post1
google-generativeai==0.3.2
pydantic-settings==2.1.0
```

## Optional Dependencies
```bash
# For development
pip install pytest pytest-asyncio httpx
```

## Scripts
```bash
# Production
python -m app.main

# Development with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest
```

## Environment Variables
Create `.env` file:
```
PORT=8000
DATABASE_URL=sqlite:///./edu_platform.db
GEMINI_API_KEY=your-gemini-api-key-here
SECRET_KEY=your-secret-key-for-jwt
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Database Setup
The service uses SQLite with SQLAlchemy. Database and tables will be created automatically on first run.

## API Endpoints

### Books
- `GET /api/books` - List books with pagination
- `GET /api/books/{id}` - Get specific book
- `POST /api/books` - Create new book (admin)
- `PUT /api/books/{id}` - Update book (admin)
- `DELETE /api/books/{id}` - Delete book (admin)

### Videos
- `GET /api/videos` - List videos with pagination
- `GET /api/videos/{id}` - Get specific video
- `POST /api/videos` - Create new video (admin)
- `PUT /api/videos/{id}` - Update video (admin)
- `DELETE /api/videos/{id}` - Delete video (admin)

### AI Evaluations
- `GET /api/evaluations` - List evaluations
- `POST /api/evaluations` - Create new evaluation
- `GET /api/evaluations/{id}` - Get specific evaluation
- `POST /api/evaluations/{id}/submit` - Submit evaluation response

## AI Integration
- **Google Gemini AI**: For code evaluation and feedback
- Automated assessment of user submissions
- Intelligent feedback generation

## Features
- **Educational Content Management**: Books and videos
- **AI-Powered Assessments**: Automated code evaluation
- **Progress Tracking**: User learning progress
- **Content Categorization**: Subject-based organization
- **Search and Filtering**: Easy content discovery

## Database Schema
- Books table (title, content, category, difficulty)
- Videos table (title, url, description, duration)
- Evaluations table (questions, answers, AI feedback)
- User progress tracking

## API Documentation
Once running, visit: http://localhost:8000/docs for interactive API documentation.
