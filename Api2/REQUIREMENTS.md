# API2 - User Management Service Requirements

## Node.js Dependencies

Install all dependencies:
```bash
npm install
```

## System Requirements
- **Node.js**: 18+ (LTS recommended)
- **SQLite**: Included with Node.js

## Dependencies
- **Express**: ^5.1.0 - Web framework
- **TypeORM**: ^0.3.24 - Database ORM
- **SQLite3**: ^5.1.7 - Database
- **bcryptjs**: ^3.0.2 - Password hashing
- **jsonwebtoken**: ^9.0.2 - JWT authentication
- **express-validator**: ^7.2.1 - Input validation
- **express-rate-limit**: ^7.5.0 - Rate limiting
- **helmet**: ^7.2.0 - Security headers
- **cors**: ^2.8.5 - Cross-origin requests
- **winston**: ^3.17.0 - Logging
- **TypeScript**: ^5.8.3 - Type checking

## Scripts
```bash
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server (http://localhost:5000)
npm run dev      # Start development server with auto-reload
npm test         # Run tests
```

## Environment Variables
Create `.env` file:
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_EXPIRES_IN=24h
DATABASE_URL=sqlite:./database.db
NODE_ENV=development
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Database Setup
The service uses SQLite with TypeORM. Database will be created automatically on first run.

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/users` - List users (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

## Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- CORS enabled for frontend

## Security Features
- Helmet.js security headers
- Input validation and sanitization
- Rate limiting
- Password strength requirements
- JWT token expiration

## User Roles
- **free**: Basic access to low-tier languages
- **pro**: Access to medium-tier languages
- **enterprise**: Access to all languages and features

## Database Schema
- Users table with authentication data
- Profile information
- Role-based access control
