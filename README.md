# Mobile Auth Backend

A production-ready authentication service designed for mobile applications, providing secure OAuth 2.0 integration and session management. Built with TypeScript and Express.js, it offers a robust solution for handling authentication flows in mobile environments.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-green.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Overview

This service provides a secure intermediary layer between mobile applications and OAuth providers (such as Google), managing token exchange, session handling, and secure storage. It's designed with security, scalability, and developer experience in mind.

### ✨ Key Features
- **OAuth 2.0 Authentication** with multiple provider support
- **Secure JWT-based Session Management** with automatic token rotation
- **PostgreSQL Database Integration** using Drizzle ORM
- **Rate Limiting and Request Throttling** for enhanced security
- **Comprehensive Error Handling** and logging
- **Docker-ready** with development and production configurations
- **TypeScript** for enhanced type safety and developer experience

### 🛠️ Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: OAuth 2.0, JWT
- **Development**: Docker, ESLint, Prettier
- **Security**: Helmet, Rate limiting, Token rotation, CORS

## 📑 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 📋 Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose
- PostgreSQL (v16 recommended)
- Google Cloud Platform account with OAuth 2.0 credentials

## 🚀 Quick Start

1. **Clone & Install Dependencies**
   ```bash
   git clone <repository-url>
   cd mobile-auth
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   ```

3. **Configure Environment Variables**
   ```env
   # Required environment variables are listed in the Environment Setup section below
   ```

4. **Start Services**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d

   # Or locally
   npm run dev
   ```

## 🏗️ Project Structure

```
src/
├── controllers/    # Request handlers and route logic
├── services/      # Business logic and external service integration
├── middleware/    # Express middleware (auth, validation, etc.)
├── db/           # Database schema, migrations, and queries
├── routes/       # API route definitions
└── utils/        # Utility functions and error handling
```

## 💻 Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run db:push      # Push database schema changes
npm run db:generate  # Generate new migrations
npm run db:studio    # Start Drizzle Studio for database management
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mobile_auth
DB_SSL=false
DB_POOL_SIZE=10
DB_IDLE_TIMEOUT=30000

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Application URLs
APP_URL=http://localhost:3000
APP_REDIRECT_URL=myauthapp://auth/callback
ALLOWED_ORIGINS=http://localhost:3000,exp://localhost:19000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM="Auth Service <auth@example.com>"
```

## 📚 API Documentation

### Authentication Endpoints

#### OAuth Flow
```typescript
GET /auth/google/login
// Initiates Google OAuth flow
// Redirects to Google consent screen

GET /auth/callback
// Handles OAuth provider callback
// Query Parameters: code (string)
// Returns: Redirects to mobile app with tokens

POST /auth/refresh
// Refresh access token
// Body: { refreshToken: string }
// Returns: { accessToken, refreshToken }

POST /auth/logout
// Invalidate current session
// Body: { refreshToken: string }
// Returns: 200 OK
```

#### Email Verification Flow
```typescript
POST /auth/email/request-code
// Request email verification code
// Body: { email: string }
// Returns: { success: true, message: string }

POST /auth/email/verify
// Verify email code and login/register
// Body: { email: string, code: string }
// Returns: {
//   success: true,
//   message: string,
//   data: {
//     user: {
//       id: string,
//       email: string,
//       name: string,
//       lastLoginAt: string,
//       loginCount: number,
//       createdAt: string,
//       updatedAt: string
//     },
//     accessToken: string,
//     refreshToken: string
//   }
// }
```

### Response Formats

Success Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

Error Response:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid refresh token"
  }
}
```

## 🔒 Security Features

- **JWT Token Management**
  - Access tokens (15 minutes)
  - Refresh tokens (7 days)
  - Automatic token rotation
  - Secure token storage

- **Request Protection**
  - Rate limiting
  - CORS configuration
  - Helmet security headers
  - Request size limiting
  - JSON payload validation

- **Email Verification**
  - 6-digit numeric codes
  - 15-minute expiration
  - One-time use codes
  - Rate-limited requests
  - Secure email delivery

- **Database Security**
  - Connection pooling
  - Prepared statements
  - Type-safe queries with Drizzle ORM
  - Encrypted verification codes

## 🚢 Deployment

### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t mobile-auth .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env mobile-auth
   ```

### Production Considerations

- Set appropriate environment variables
- Configure secure database connection
- Set up proper logging
- Configure reverse proxy (e.g., Nginx)
- Enable SSL/TLS
- Set up monitoring and alerts
- Configure production SMTP server
- Enable email delivery tracking

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [Sathish Kumar](https://github.com/yourusername)