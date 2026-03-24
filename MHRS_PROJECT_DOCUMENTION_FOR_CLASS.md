Technical Documentation and User Manual
(Technical English for Software Engineering)

Project Name
MSRN - MHRS Demo (Appointment Management System)

1. Technical Documentation

1.1 System Overview
MSRN is a web-based hospital appointment management system inspired by Turkey's MHRS model. It allows patients to search doctors and book appointments, while admins and doctors use role-based panels for management and tracking.

Main features:
- User registration and login with JWT authentication
- Email verification flow for account activation
- Role-based access: patient, doctor, admin
- Hospital and clinic management (admin)
- Doctor application and approval flow
- Appointment booking, cancellation, and listing
- Doctor availability and busy slot filtering
- Search integration with Elasticsearch
- Event-driven background processing with RabbitMQ

1.2 System Architecture
The system follows a layered client-server architecture.

Components:
Frontend (Next.js + React)
-> Backend API (FastAPI)
-> MariaDB (main relational database)

Additional services:
- Elasticsearch (doctor and appointment search indexing)
- RabbitMQ (async tasks and sync events)
- Brevo (transactional email for verification)

1.3 Technology Stack
Backend:
- Python 3
- FastAPI
- SQLAlchemy 2.x
- Alembic
- MariaDB (PyMySQL)
- PyJWT
- Passlib (bcrypt)
- Elasticsearch client
- aio-pika

Frontend:
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS

Infrastructure:
- Docker Compose (MariaDB, Elasticsearch, RabbitMQ)

1.4 Installation and Run Guide
Step 1: Start infrastructure services
From project root:
docker-compose up -d

Step 2: Apply migrations
From project root:
./.venv/Scripts/python.exe -m alembic -c alembic.ini upgrade head

Step 3: Run backend
From project root:
./.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001

Step 4: Run frontend
cd frontend
npm install
npm run dev -- -H 127.0.0.1 -p 5173

Available URLs:
- Backend API root: http://127.0.0.1:8001
- Backend health: http://127.0.0.1:8001/health
- Swagger docs: http://127.0.0.1:8001/docs
- Frontend: http://127.0.0.1:5173

1.5 Configuration
Important environment variables:
- SECRET_KEY
- ACCESS_TOKEN_EXPIRE_MINUTES
- REFRESH_TOKEN_EXPIRE_DAYS
- MARIADB_USER, MARIADB_PASSWORD, MARIADB_HOST, MARIADB_PORT, MARIADB_DB
- ELASTICSEARCH_URL
- RABBITMQ_URL
- BACKEND_CORS_ORIGINS
- FRONTEND_BASE_URL
- BREVO_API_KEY
- BREVO_SENDER_EMAIL
- BREVO_SENDER_NAME
- EMAIL_VERIFICATION_REQUIRED
- EMAIL_VERIFICATION_EXPIRE_MINUTES

1.6 API Overview
Base path: /api/v1

Auth endpoints:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- GET /auth/me
- POST /auth/verify-email/request
- POST /auth/verify-email

Appointment endpoints:
- POST /appointments/
- GET /appointments/me
- GET /appointments/me/search
- GET /appointments/doctor/me
- DELETE /appointments/{appointment_uid}
- GET /appointments/doctor/{doctor_id}/busy-slots?date=YYYY-MM-DD

Admin and doctor management endpoints:
- GET /hospitals/
- POST /hospitals/
- POST /hospitals/{hospital_id}/clinics
- GET /doctors/
- POST /doctors/
- PUT /doctors/{doctor_id}
- DELETE /doctors/{doctor_id}

Search endpoints:
- GET /search/doctors?q=...
- GET /search/available-doctors?q=...&start_date=...&end_date=...

1.7 Error Handling
The API returns structured error responses:
{
  "success": false,
  "error": {
    "code": "HTTP_400",
    "message": "Doğrulama bağlantısı geçersiz veya süresi dolmuş."
  }
}

2. User Manual

2.1 Introduction
This user manual explains how patients use the web application to create an account, verify email, log in, search doctors, and book appointments.

2.2 System Requirements
- Windows 10 or higher (or any modern OS)
- Modern web browser (Chrome, Edge, Firefox)
- Stable internet connection

2.3 First-Time Setup (for local use)
1. Start backend and frontend servers.
2. Open http://127.0.0.1:5173 in the browser.
3. Go to Auth page.

2.4 Register a New Account
1. Open the Auth page.
2. Select "Kayit Ol".
3. Enter email and password.
4. Submit the form.
5. Check your email inbox and click the verification link.

2.5 Verify Email
1. Open the email from MHRS sender.
2. Click the verification link.
3. The browser opens the Auth page and verifies your account automatically.
4. After success, log in with your credentials.

2.6 Login
1. Select "Giris" tab.
2. Enter registered email and password.
3. Submit the form.
4. If your account is not verified, login is blocked until verification is complete.

2.7 Search and Book Appointment (Patient)
1. Search by doctor/hospital/clinic.
2. Select an available doctor and date.
3. Choose an empty time slot.
4. Confirm appointment booking.
5. View appointments in personal panel.

2.8 Doctor Panel
Doctors can:
- View their upcoming and past appointments
- Track appointment statuses

2.9 Admin Panel
Admins can:
- Create hospitals
- Add clinics
- Review doctor applications
- Add, update, and delete doctor records

2.10 Troubleshooting
Problem: I cannot log in after registration.
Possible reason: Email not verified.
Solution: Use the verification link in your inbox or request a new verification email.

Problem: Verification email does not arrive.
Possible solutions:
- Check spam/junk folder
- Ensure sender email is verified in Brevo
- Confirm BREVO_API_KEY and BREVO_SENDER_EMAIL are configured

Problem: Backend not reachable.
Possible solutions:
- Check backend server is running on port 8001
- Check Docker services are up
- Check CORS and API base URL settings

3. Documentation Best Practices Used in This Project
- Clear section hierarchy
- Real environment commands
- Concrete API examples
- Separation of technical and user-focused content
- Updatable configuration section for deployment

4. Conclusion
MSRN demonstrates a full-stack appointment system with real-world software engineering practices: role-based security, search indexing, asynchronous processing, and email verification. The project is suitable as an educational reference for backend/frontend integration, API design, and maintainable documentation.
