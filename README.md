# 🎓 AcademiaPulse - Online Course Management System

## 🛠️ Technologies Used

- **Frontend**: React 18, Vite, Lucide React Icons, Canvas Confetti
- **Styling**: Vanilla CSS, Glassmorphism Design System, Custom CSS Tokens
- **Backend**: Node.js, Express.js REST API
- **Database & Cloud**: SQLite Database (`backend/database.sqlite`), Cloud Firestore, Firebase Auth
- **Authentication**: JWT (JSON Web Tokens), Bcrypt Password Encryption, Firebase Authentication

---

## 🚀 Setup Process

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Install & Run Backend Server
```bash
cd backend
npm install
node server.js
```
The REST API server will run on `http://localhost:5000`.

### 2. Install & Run Frontend Client
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will run on `http://localhost:5173`.

---

## 🔄 Project Workflow

### 1. Authentication & Role Access
- **Student Sign-Up / Login**: Users can register and log in as Students to access course catalogs, enroll in courses, track lesson progress, and earn certificates.
- **Admin Access**: Administrators log in to access the Admin Portal, monitor platform metrics, publish new courses, manage existing courses, and oversee enrollments.

### 2. Student Workflow
- **Course Discovery**: Search and filter 500+ courses across 50 role categories (e.g., Web Developer, Data Scientist, UI/UX Designer) with dynamic category counts and filter pills.
- **Enrollment & Classroom**: Students enroll in courses, view domain-matched YouTube video embed lessons with unique lesson titles and descriptions, mark lessons as completed, and track progress.
- **Certificates**: Upon completing 100% of course lessons, an official Certificate of Completion is unlocked and generated.
- **Student Profile Settings**: Accessible by clicking the user badge in the Navbar. Students can update their display name, profile avatar image URL, and security password with show/hide eye toggle controls (email address is displayed as read-only primary account ID).

### 3. Admin Workflow
- **Dashboard Analytics**: Real-time analytics tracking total courses, active student enrollments, completed courses, and platform metrics.
- **Course Management**: Create, edit, and delete courses across all 50 target role categories. Newly created courses instantly appear in the Catalog and filter pills.
- **Admin Profile Settings**: Accessible by clicking the Admin profile badge in the Navbar. Admins can update their display name and profile avatar image URL on a dedicated page with live preview thumbnail.
