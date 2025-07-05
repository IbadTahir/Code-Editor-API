# Online Code Editor Platform

A comprehensive full-stack educational code editor platform built with Node.js, Express, TypeScript, and SQLite. This platform provides user management, authentication, and role-based access control for educational environments.

## 🚀 Features

### 🔐 Authentication & Security
- **JWT-based Authentication** with access and refresh tokens
- **Role-based Access Control** (Admin, Instructor, Librarian, Student)
- **Secure Password Management** with bcrypt hashing
- **Password Reset** functionality via tokens
- **Account Lockout** protection after failed attempts
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization

### 👥 User Management
- Complete CRUD operations for user accounts
- Role assignment and management
- Profile updates and maintenance
- User activity tracking
- Admin dashboard capabilities

### 🛡️ Security Features
- Helmet.js security headers
- CORS configuration
- SQL injection protection
- XSS protection
- Rate limiting on all endpoints
- Secure token management

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **SQLite** - Lightweight database
- **TypeORM** - Object-Relational Mapping
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing

### Security & Middleware
- **Helmet** - Security headers
- **express-rate-limit** - API rate limiting
- **express-validator** - Input validation
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
Online Code Editor/
├── src/
│   ├── app.ts                 # Application entry point
│   ├── config/
│   │   ├── appConfig.ts       # Application configuration
│   │   ├── database.ts        # Database connection config
│   │   └── db.ts              # Database instance management
│   ├── controllers/
│   │   ├── authController.ts  # Authentication logic
│   │   └── userController.ts  # User management logic
│   ├── entity/
│   │   └── User.ts            # User entity (TypeORM)
│   ├── interfaces/
│   │   ├── auth.interface.ts  # Authentication interfaces
│   │   └── user.interface.ts  # User type definitions
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── errorHandler.ts    # Global error handling
│   │   └── rateLimiter.ts     # Rate limiting middleware
│   ├── models/
│   │   └── User.ts            # User model interfaces
│   ├── routes/
│   │   ├── authRoutes.ts      # Authentication endpoints
│   │   └── userRoutes.ts      # User management endpoints
│   └── services/
│       └── userService.ts     # User business logic
├── test-apis.ps1              # API testing script
├── .env.example               # Environment variables template
├── .env                       # Environment configuration
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

## ⚡ Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Online Code Editor"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Update your `.env` file:
   ```env
   PORT=5000
   NODE_ENV=development
   SQLITE_PATH=test.sqlite
   JWT_SECRET=your-super-secret-key-change-this-in-production
   ALLOWED_ORIGINS=http://localhost:3000
   
   # Security Settings
   PASSWORD_MIN_LENGTH=8
   TOKEN_EXPIRES_IN=15m
   REFRESH_TOKEN_EXPIRES_IN=7d
   MAX_LOGIN_ATTEMPTS=5
   LOCKOUT_DURATION=900000
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   AUTH_RATE_LIMIT_MAX=5
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:5000/health
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000
```

### 🔑 Authentication Endpoints

| Method | Endpoint | Description | Access Level |
|--------|----------|-------------|--------------|
| `POST` | `/api/auth/register` | Register new user | Public |
| `POST` | `/api/auth/login` | User login | Public |
| `GET` | `/api/auth/me` | Get current user profile | Authenticated |
| `POST` | `/api/auth/logout` | User logout | Authenticated |
| `POST` | `/api/auth/refresh-token` | Refresh access token | Public |
| `POST` | `/api/auth/request-reset` | Request password reset | Public |
| `POST` | `/api/auth/reset-password` | Reset password with token | Public |
| `GET` | `/api/auth/verify-email/:token` | Verify email address | Public |

### 👤 User Management Endpoints

| Method | Endpoint | Description | Access Level |
|--------|----------|-------------|--------------|
| `GET` | `/api/users` | Get all users | Admin Only |
| `GET` | `/api/users/:id` | Get specific user | Admin Only |
| `PUT` | `/api/users/:id` | Update user details | Admin Only |
| `PATCH` | `/api/users/:id/role` | Update user role | Admin Only |
| `DELETE` | `/api/users/:id` | Delete user account | Admin Only |

### 🏥 System Endpoints

| Method | Endpoint | Description | Access Level |
|--------|----------|-------------|--------------|
| `GET` | `/health` | Server health check | Public |

## 💡 Usage Examples

### User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass@123",
  "role": "student"
}
```

### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass@123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "student",
    "emailVerified": false
  }
}
```

### Get All Users (Admin)
```http
GET /api/users
Authorization: Bearer <admin_access_token>
```

### Update User Role (Admin)
```http
PATCH /api/users/550e8400-e29b-41d4-a716-446655440000/role
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "role": "instructor"
}
```

## 👥 User Roles & Permissions

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Admin** | System Administrator | Full system access, user management, all operations |
| **Instructor** | Course Instructor | Course management, student oversight |
| **Librarian** | Resource Manager | Educational resource management |
| **Student** | End User | Access learning materials, personal profile |

## 🔒 Security Features

### Password Requirements
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*)

### Rate Limiting
- **Authentication routes**: 5 requests per minute
- **Account creation**: 3 accounts per hour  
- **General API**: 100 requests per 15 minutes

### Token Management
- **Access Token**: 15 minutes expiration
- **Refresh Token**: 7 days expiration
- **Account Lockout**: After 5 failed login attempts (15 minutes)

## 🧪 Testing

### Automated API Testing
Run the comprehensive test suite:

```powershell
# Start the server (Terminal 1)
npm run dev

# Run API tests (Terminal 2)
.\test-apis.ps1
```

### Manual Testing with cURL

```bash
# Health Check
curl http://localhost:5000/health

# Register Admin User
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System Admin",
    "email": "admin@codeeditor.com", 
    "password": "AdminPass@123",
    "role": "admin"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@codeeditor.com",
    "password": "AdminPass@123"
  }'
```

## ❌ Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "MACHINE_READABLE_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTH_REQUIRED` - Authentication required
- `INVALID_CREDENTIALS` - Invalid email/password
- `USER_EXISTS` - Email already registered
- `USER_NOT_FOUND` - User doesn't exist
- `ACCOUNT_LOCKED` - Too many failed attempts
- `TOKEN_EXPIRED` - JWT token expired
- `INSUFFICIENT_PERMISSIONS` - Access denied
- `DUPLICATE_ERROR` - Resource already exists

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment mode | development | No |
| `SQLITE_PATH` | Database file path | test.sqlite | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | * | No |
| `TOKEN_EXPIRES_IN` | Access token expiry | 15m | No |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry | 7d | No |
| `MAX_LOGIN_ATTEMPTS` | Max failed login attempts | 5 | No |
| `LOCKOUT_DURATION` | Account lockout duration (ms) | 900000 | No |

### Available Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript to JavaScript
npm start          # Start production server
npm run test       # Run test suite
```

## 🏗️ Development

### Code Organization
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data operations  
- **Middleware**: Authentication, validation, error handling
- **Routes**: API endpoint definitions
- **Entities**: Database models using TypeORM
- **Interfaces**: TypeScript type definitions

### Database Schema
The application uses SQLite with TypeORM. The main entities:

- **User**: Stores user information, credentials, and roles
- Auto-generated UUIDs for primary keys
- Timestamps for creation and updates
- Password hashing before storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License. See the `package.json` file for details.

## 🆘 Support

For support and questions:
- 📝 Create an issue in the repository
- 📖 Check the API documentation above
- 🧪 Review the test scripts for usage examples
- 📧 Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** June 17, 2025  
**Developed with ❤️ for Educational Excellence**