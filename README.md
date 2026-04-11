# Arunalu ASM — Attendance & Face Recognition System

A full-stack workforce management system for Arunalu Supermarket. Employees clock in/out with selfie verification and GPS location. Managers approve leave, view attendance reports, and manage outlets.

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│   React Frontend │◄──────►│   Django REST API     │◄──────►│   PostgreSQL DB  │
│   (nginx :3000)  │  HTTP  │   (Gunicorn :8000)    │        │   (postgres :5432│
└─────────────────┘        └──────────┬───────────┘        └──────────────────┘
                                       │
                            ┌──────────▼───────────┐
                            │   AWS Rekognition     │
                            │   (Face Verification) │
                            └──────────────────────┘
┌─────────────────┐
│  React Native   │◄──────► Same Django REST API
│  Mobile App     │  HTTP
└─────────────────┘
```

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Python 3.10, Django 5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 15 |
| Frontend | React 19, Material UI 7, Axios, React Router 7 |
| Mobile   | React Native 0.79, React Navigation 7, AsyncStorage |
| Face ID  | AWS Rekognition |
| Server   | Gunicorn (gthread), nginx |
| Containers | Docker, Docker Compose |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for containerised run)
- Node.js 18+ and npm (for frontend/mobile local dev)
- Python 3.10+ and pip (for backend local dev)
- React Native CLI + Android Studio or Xcode (for mobile)

---

## Quick Start (Docker — recommended)

### 1. Clone and configure environment

```bash
git clone <repo-url> arunalu-asm
cd arunalu-asm
cp .env.example .env
# Edit .env and fill in all values (see Environment Variables section below)
```

### 2. Start all services

```bash
docker compose up --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| DB | localhost:5432 (internal) |

### 3. Stop

```bash
docker compose down
```

To also delete the database volume:
```bash
docker compose down -v
```

---

## Running Locally (Development)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env         # fill in values
python manage.py migrate
python manage.py runserver
```

API available at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
# Create frontend/.env with: REACT_APP_API_URL=http://localhost:8000
npm start
```

App available at http://localhost:3000

### Mobile

```bash
cd mobile
npm install

# Android
npx react-native run-android

# iOS (macOS only)
cd ios && pod install && cd ..
npx react-native run-ios
```

Set `API_URL` in `mobile/src/config.js` to your backend address (e.g. your machine's LAN IP so the device can reach it).

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example). Copy it to `.env` and fill in real values.

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret key — generate with `get_random_secret_key()` |
| `DJANGO_DEBUG` | `True` for dev, `False` for production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | DB hostname (`db` when using Docker Compose) |
| `DB_PORT` | DB port (default `5432`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key (Rekognition) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REKOGNITION_REGION` | AWS region (e.g. `us-east-2`) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |
| `REACT_APP_API_URL` | Backend URL used by the React frontend |
| `API_URL` | Backend URL used by the React Native mobile app |

---

## Deployment Notes

Before deploying to production:

- [ ] Set `DJANGO_DEBUG=False`
- [ ] Set `DJANGO_SECRET_KEY` to a strong random value (never reuse the dev key)
- [ ] Set `DJANGO_ALLOWED_HOSTS` to your real domain(s) only
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain only
- [ ] Use a strong `DB_PASSWORD` (not `secure_password123`)
- [ ] Use an HTTPS reverse proxy (nginx/Caddy) in front of both services
- [ ] Store `.env` securely — never commit it to git

---

## Security Notes

- **AWS credentials:** Use a least-privilege IAM user with only `rekognition:*` permissions. Rotate keys if they were ever committed to git.
- **Secrets:** All secrets must be in `.env` only. The `.env.example` file contains only placeholder values.
- **CORS:** `CORS_ALLOWED_ORIGINS` is restricted to specific origins in production.
- **Hosts:** `ALLOWED_HOSTS` is set via environment variable — wildcard `"*"` is not used.
- **JWT:** Access tokens expire in 30 minutes; refresh tokens in 1 day with rotation enabled.

---

## Project Structure

```
arunalu-asm/
├── backend/              Django REST API
│   ├── aas/              Project settings, URLs, WSGI
│   ├── attendance/       Punch-in/out, leave management
│   ├── face_recognition/ AWS Rekognition integration
│   ├── main/             Core models and views
│   ├── report/           Reporting endpoints
│   ├── users/            User management
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             React SPA
│   ├── src/
│   │   ├── components/   Shared UI components
│   │   ├── pages/        Admin & Manager dashboards
│   │   ├── services/     API service layer
│   │   └── utils/        Axios instance, helpers
│   ├── Dockerfile
│   └── nginx.conf
├── mobile/               React Native app
│   ├── src/
│   │   ├── config.js     Centralised API URL config
│   │   ├── screens/      Login, Home
│   │   └── navigation/   Stack navigator + feature screens
│   ├── android/
│   └── ios/
├── docker-compose.yml    Unified compose (db + backend + frontend)
├── .env.example          Environment variable template
└── .gitignore
```
