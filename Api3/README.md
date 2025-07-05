# Educational Platform API - Phase 4 Backend

A comprehensive FastAPI-based backend for an educational platform that provides book management, video lectures, and AI-powered content evaluation using Google's Gemini AI.

## 🚀 Features

- **User Authentication**: JWT-based authentication system with secure login/registration
- **Book Management**: Upload, store, and manage educational books (PDF, EPUB, TXT)
- **Video Lectures**: Manage video content with YouTube/Vimeo integration
- **AI-Powered Evaluation**: Content assessment and question generation using Google Gemini AI
- **RESTful API**: Complete REST API with comprehensive documentation
- **Database Management**: SQLite database with Alembic migrations
- **File Upload**: Secure file handling with size and type validation
- **Logging**: Comprehensive logging system for monitoring and debugging

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.115.12
- **Database**: SQLite with SQLAlchemy ORM 2.0.41
- **Authentication**: JWT tokens with python-jose
- **AI Integration**: Google Generative AI (Gemini)
- **File Handling**: Python-multipart for file uploads
- **Validation**: Pydantic v2 for data validation
- **Migration**: Alembic for database migrations
- **Testing**: Pytest with async support
- **Server**: Uvicorn ASGI server

## 📋 Prerequisites

- Python 3.11+
- Virtual environment (recommended)
- Google Gemini API key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Phase4-Backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Linux/macOS
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.template .env
   ```
   Edit `.env` file with your configuration:
   ```env
   SECRET_KEY=your-production-secret-key
   GEMINI_API_KEY=AIzaSyA9DqC9_G3m14rehZGRrnQ40JZl7B0fNSo
   DATABASE_URL=sqlite:///edu_platform.db
   ```

5. **Initialize database**
   ```bash
   alembic upgrade head
   ```

## 🚀 Running the Application

### Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base**: http://localhost:8000
- **Interactive Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 📚 API Documentation

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile

### Book Management Endpoints
- `GET /books/` - List all books
- `POST /books/` - Upload a new book
- `GET /books/{book_id}` - Get book details
- `PUT /books/{book_id}` - Update book information
- `DELETE /books/{book_id}` - Delete a book
- `POST /books/{book_id}/evaluate` - AI evaluation of book content

### Video Lecture Endpoints
- `GET /videos/` - List all video lectures
- `POST /videos/` - Create a new video lecture
- `GET /videos/{video_id}` - Get video details
- `PUT /videos/{video_id}` - Update video information
- `DELETE /videos/{video_id}` - Delete a video lecture

### Evaluator Endpoints
- `GET /evaluators/` - List all evaluations
- `POST /evaluators/` - Create a new evaluation
- `GET /evaluators/{evaluator_id}` - Get evaluation details
- `PUT /evaluators/{evaluator_id}` - Update evaluation
- `DELETE /evaluators/{evaluator_id}` - Delete evaluation

## 🗄️ Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `hashed_password`
- `full_name`
- `role` (student/teacher/admin)
- `is_active`
- `created_at`

### Books Table
- `id` (Primary Key)
- `title`
- `author`
- `description`
- `file_path`
- `file_type`
- `uploaded_by` (Foreign Key to Users)
- `subject`
- `grade_level`
- `created_at`

### Video Lectures Table
- `id` (Primary Key)
- `title`
- `description`
- `video_url`
- `teacher_username`
- `subject`
- `topic`
- `notes_url`
- `created_at`

### Evaluators Table
- `id` (Primary Key)
- `title`
- `description`
- `content_type`
- `questions`
- `max_attempts`
- `created_by` (Foreign Key to Users)
- `created_at`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register** or **Login** to get an access token
2. Include the token in the `Authorization` header: `Bearer <token>`
3. Tokens expire after 30 minutes (configurable)

## 🤖 AI Integration

The platform integrates with Google's Gemini AI for:

- **Content Analysis**: Automatic analysis of uploaded books
- **Question Generation**: AI-generated questions for assessments
- **Content Evaluation**: Intelligent evaluation of educational materials

## 📁 Project Structure

```
Phase4-Backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── auth.py
│   │           ├── books.py
│   │           ├── videos.py
│   │           └── evaluators.py
│   ├── database/
│   │   └── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── book.py
│   │   ├── video.py
│   │   └── evaluator.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── book.py
│   │   ├── video.py
│   │   └── evaluator.py
│   ├── utils/
│   │   ├── auth.py
│   │   ├── errors.py
│   │   ├── gemini_utils.py
│   │   └── logging_config.py
│   ├── config.py
│   └── main.py
├── alembic/
│   └── versions/
├── logs/
├── .env
├── .env.template
├── requirements.txt
├── alembic.ini
└── README.md
```

## 🔄 Database Migrations

Create new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback migration:
```bash
alembic downgrade -1
```

## 🧪 Testing

Run all tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app
```

Run specific test file:
```bash
pytest app/tests/test_api.py
```

## 📊 Data Storage

- **Database**: SQLite database stored in `edu_platform.db`
- **File Uploads**: Stored in `uploads/` directory
- **Logs**: Application logs in `logs/` directory
- **Configuration**: Environment variables in `.env` file

## 🚨 Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server errors

## 🔧 Configuration

Key configuration options in `.env`:

```env
# JWT Settings
SECRET_KEY=your-production-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database Settings
DATABASE_URL=sqlite:///edu_platform.db

# File Upload Settings
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_FILE_TYPES=pdf,epub,mp4,txt
UPLOAD_DIR=uploads

# Gemini AI Settings
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MAX_RETRIES=3
GEMINI_TIMEOUT=30

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

## 📝 Logging

Logs are stored in the `logs/` directory:
- `api.log` - API operation logs
- `app.log` - Application-level logs

Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Support

For support and questions:
- Check the API documentation at `/docs` or `/redoc`
- Review the logs in the `logs/` directory
- Check the issues section of the repository

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added Gemini AI integration
- **v1.2.0** - Enhanced authentication and validation
- **v1.3.0** - Added comprehensive testing and documentation

---

**Built with ❤️ using FastAPI and modern Python technologies**
