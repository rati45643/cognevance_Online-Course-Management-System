# REST API Documentation - Online Course Management System

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints (`/api/auth`)

### 1. Register User
- **POST** `/api/auth/register`
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123",
  "role": "student"
}
```

### 2. Login User
- **POST** `/api/auth/login`
- **Request Body:**
```json
{
  "email": "student@academia.com",
  "password": "student123",
  "role": "student"
}
```

### 3. Google OAuth Sign-In
- **POST** `/api/auth/google`
- **Request Body:**
```json
{
  "name": "Sam Taylor",
  "email": "sam.taylor@google.com",
  "role": "student"
}
```

### 4. Forgot Password (Request 6-Digit Code)
- **POST** `/api/auth/forgot-password`
- **Request Body:**
```json
{
  "email": "student@academia.com"
}
```
- **Response (200 OK):**
```json
{
  "message": "Verification code sent to student@academia.com!",
  "verification_code": "873015",
  "expires_in": "15 minutes"
}
```

### 5. Reset Password (Verify Code & Update Password)
- **POST** `/api/auth/reset-password`
- **Request Body:**
```json
{
  "email": "student@academia.com",
  "code": "873015",
  "new_password": "newstudent123"
}
```
- **Response (200 OK):**
```json
{
  "message": "Password reset successfully! You can now log in with your new password."
}
```

### 6. Get Current Profile
- **GET** `/api/auth/me`
- **Headers:** `Authorization: Bearer <token>`

---

## Course Endpoints (`/api/courses`)

### 1. List Courses (Search, Filter, Sort)
- **GET** `/api/courses`
- **Query Parameters:** `search`, `category`, `level`, `sort`

### 2. Get Course Details by ID
- **GET** `/api/courses/:id`

### 3. Create Course (Admin Only)
- **POST** `/api/courses`

---

## Enrollment & Progress Endpoints (`/api/enrollments`)

### 1. Enroll in Course
- **POST** `/api/enrollments`

### 2. Get Student Enrollments & Progress Metrics
- **GET** `/api/enrollments`

### 3. Toggle Lesson Progress (Mark Complete / Incomplete)
- **POST** `/api/enrollments/:courseId/progress`

---

## Admin Portal Endpoints (`/api/admin`)

### 1. Get System Analytics & Metrics
- **GET** `/api/admin/stats`

### 2. List All Registered Users
- **GET** `/api/admin/users`
