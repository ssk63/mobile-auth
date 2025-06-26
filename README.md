# Mobile Auth Backend

A robust and secure authentication backend service built with Express.js and TypeScript, designed to handle OAuth 2.0 authentication flows for mobile applications. This service provides a secure intermediary layer between mobile applications and OAuth providers (such as Google), managing token exchange, session handling, and secure storage.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Database Management](#database-management)
- [API Documentation](#api-documentation)
- [Mobile Integration Guide](#mobile-integration-guide)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

✨ **Core Features**
- OAuth 2.0 Authentication with multiple providers
  - Google Sign-In integration
  - Extensible architecture for additional providers
- Secure JWT-based session management
- Automatic refresh token rotation
- Rate limiting and request throttling
- Comprehensive error handling and logging

🛠️ **Technical Stack**
- TypeScript for enhanced type safety and developer experience
- Express.js for robust API development
- PostgreSQL with Drizzle ORM for type-safe database operations
- Docker and Docker Compose for containerized development
- Jest for unit and integration testing

## Architecture

The service follows a clean architecture pattern with clear separation of concerns:

```
src/
├── controllers/    # Request handlers
├── services/      # Business logic
├── middleware/    # Express middleware
├── db/           # Database operations
└── routes/       # API route definitions
```

## Prerequisites

- Node.js (v18 or later)
- Docker and Docker Compose
- PostgreSQL (if running without Docker)
- Google Cloud Platform account with OAuth 2.0 credentials

## Getting Started

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd mobile-auth
   ```

2. **Environment Setup**
   ```bash
   # Copy environment configuration
   cp .env.example .env

   # Install dependencies
   npm install
   ```

3. **Configure Environment Variables**
   ```env
   # Required OAuth Configuration
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   
   # Security Configuration
   JWT_SECRET=your_secure_jwt_secret
   JWT_EXPIRY=15m
   
   # Application Configuration
   PORT=3000
   NODE_ENV=development
   
   # Database Configuration
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mobile_auth
   ```

4. **Start Development Environment**
   ```bash
   # Start services with Docker Compose
   docker-compose up -d

   # Run database migrations
   npm run db:migrate
   ```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Database Management

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Launch Drizzle Studio
npm run db:studio

# Test database connection
npm run db:test
```

## API Documentation

### Authentication Endpoints

#### OAuth Flow
- **GET** `/auth/google/login`
  - Initiates Google OAuth flow
  - Returns: Redirect to Google consent screen

- **GET** `/auth/callback`
  - OAuth provider callback handler
  - Query Params: `code`, `state`
  - Returns: Redirect to mobile app with tokens

#### Token Management
- **POST** `/auth/refresh`
  - Refresh access token
  - Headers: `Authorization: Bearer <refresh_token>`
  - Returns: `{ accessToken, refreshToken }`

- **POST** `/auth/logout`
  - Invalidate current session
  - Headers: `Authorization: Bearer <access_token>`
  - Returns: `200 OK`

## Mobile Integration Guide

### Deep Linking Setup

1. **Configure URL Scheme**
   ```xml
   <!-- Android: AndroidManifest.xml -->
   <data
     android:scheme="myauthapp"
     android:host="auth" />
   ```
   ```swift
   // iOS: Info.plist
   <key>CFBundleURLSchemes</key>
   <array>
     <string>myauthapp</string>
   </array>
   ```

2. **Handle Authentication Callback**
   ```typescript
   // React Native example
   import { Linking } from 'react-native';

   const handleDeepLink = (event: { url: string }) => {
     const { accessToken, refreshToken } = parseAuthCallback(event.url);
     // Store tokens securely
   };

   Linking.addEventListener('url', handleDeepLink);
   ```

## Security

- **Token Security**
  - Short-lived JWTs (15 minutes default)
  - Secure token rotation on refresh
  - HTTP-only cookies in web environments

- **Data Protection**
  - Encrypted storage of sensitive data
  - Parameterized queries prevent SQL injection
  - Rate limiting on authentication endpoints

- **Infrastructure**
  - CORS configuration for specified origins
  - Helmet.js for HTTP security headers
  - Environment-based security configurations

## Deployment

1. **Build Production Image**
   ```bash
   docker build -t mobile-auth:latest .
   ```

2. **Production Configuration**
   - Set secure JWT secrets
   - Configure production database URL
   - Enable production logging
   - Set appropriate CORS origins

3. **Health Monitoring**
   - Endpoint: `/health`
   - Monitors: Database, OAuth providers, system resources

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your PR adheres to:
- Consistent code style
- Comprehensive test coverage
- Clear commit messages
- Updated documentation
