# Arunalu ASM — Claude Code Context

Attendance & Staff Management system for Arunalu Supermarket.
Monorepo: `backend/` (Django API) + `frontend/` (React SPA) + `mobile/` (React Native).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Django 5 + DRF 3.14 + SimpleJWT, Python 3.10, Gunicorn (gthread) |
| Database | PostgreSQL 17 (psycopg2-binary) |
| Frontend | React 19 + MUI 7 + React Router 7 + Axios 1.9 |
| Mobile | React Native 0.79 + React Navigation 7 |
| Face Verification | AWS Rekognition (boto3) + OpenCV headless |
| Charts | Recharts + Chart.js (frontend) |
| Forms | react-hook-form + yup |
| Deployment | Docker Compose — 3 services: `db`, `backend`, `frontend` |

---

## Directory Map

```
arunalu-asm/
├── backend/
│   ├── aas/              # Django project: settings.py, urls.py, pagination.py
│   ├── main/             # Core models, employee CRUD, outlet/group/holiday views
│   ├── attendance/       # Punch-in/out logic, face recognition, leave API
│   ├── report/           # Dashboard, analytics, leave/attendance reports
│   ├── users/            # Custom JWT token view, user management
│   ├── mobile_api/       # Dedicated mobile endpoints (auth/, attendance/, leave/)
│   ├── models/           # Haar cascade XML for face detection
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # Header, Sidebar, Layout, ProtectedRoute, MapDialog
│   │   ├── pages/        # All page components (see Route Map below)
│   │   │   ├── admin/    # Admin pages + create/ and assign/ subdirs
│   │   │   └── manager/  # Manager-specific pages
│   │   ├── hooks/        # useManagerProfile()
│   │   └── utils/
│   │       ├── api.js    # Axios instance (Bearer interceptor, base URL)
│   │       └── auth.js   # JWT token helpers (isAuthenticated, getUserRole)
│   ├── public/
│   ├── nginx.conf        # SPA: try_files $uri /index.html
│   └── Dockerfile        # Multi-stage: Node 18 build → Nginx Alpine serve
├── mobile/
│   ├── src/
│   │   ├── config.js     # Centralized API endpoint constants
│   │   ├── api.js        # Fetch helpers with JWT (GET, POST, FormData)
│   │   ├── screens/      # Login, Home, CDR
│   │   ├── navigation/   # Stack navigator + feature screens
│   │   └── components/   # Shared mobile components
│   └── android/ ios/
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## Key Files

| File | Purpose |
|---|---|
| `backend/aas/settings.py` | Django config, DB, JWT, CORS, static/media |
| `backend/aas/urls.py` | Root URL routing hub |
| `backend/aas/pagination.py` | Custom pagination (default 50, max 200) |
| `backend/main/models.py` | All core DB models |
| `backend/main/views.py` | Employee CRUD, outlet, group, holiday endpoints |
| `backend/attendance/api.py` | Punch-in/out, leave requests, report generation |
| `backend/attendance/apiurls.py` | Attendance URL patterns (prefixed `/api/attendance/`) |
| `backend/attendance/face_recognition.py` | AWS Rekognition face match (95% threshold) |
| `backend/report/views.py` | Dashboard overviews, trend analytics, leave summaries |
| `backend/report/urls.py` | Report URL patterns (prefixed `/report/`) |
| `backend/users/views.py` | CustomTokenObtainPairView (JWT login) |
| `backend/mobile_api/attendance/urls.py` | Mobile attendance URLs |
| `frontend/src/App.js` | All routes + ProtectedRoute wiring |
| `frontend/src/utils/api.js` | Axios instance — import this for all API calls |
| `frontend/src/utils/auth.js` | `isAuthenticated()`, `getUserRole()` |
| `mobile/src/config.js` | All mobile API endpoint constants |
| `mobile/src/api.js` | `apiGet()`, `apiPost()`, `apiPostFormData()` |

---

## Architecture

### Auth
- JWT via SimpleJWT: access token 30 min, refresh 1 day with rotation + blacklist
- Auth header: `Authorization: Bearer <token>`
- Frontend: tokens in `localStorage` (`access_token`, `refresh_token`)
- Mobile: tokens in `AsyncStorage`
- Custom login view at `/api/token/` (web) and `/mobile/auth/token/` (mobile)

### Roles (RBAC)
`Admin` | `Manager` | `Staff` | `Viewer`

Role is embedded in the JWT payload. Frontend extracts it:
```js
const decoded = JSON.parse(atob(token.split('.')[1]));
const { role } = decoded;
```

Route protection via `<ProtectedRoute role={role} requiredRole="Admin">`.

### API Surface (dual)
- **Web API** `/api/*` — React frontend
- **Mobile API** `/mobile/*` — React Native app
- **Reports** `/report/*` — Dashboard + analytics

### Face Verification Flow
1. Employee takes selfie (mobile camera or web upload)
2. Selfie sent as `multipart/form-data`
3. Backend calls AWS Rekognition `compare_faces` against stored reference photo
4. Match threshold: 95% similarity → verified
5. Images stored in Django media: `reference_photos/`, `daily_selfies/`

### GPS Verification
- Outlet has `latitude`, `longitude`, `radius_meters`
- Check-in/out coordinates validated against outlet radius in `backend/main/utils.py`

### State Management (frontend)
- No Redux/Context — all local `useState` + `useEffect`
- Session data in `localStorage`: `access_token`, `refresh_token`, `outlet`, `outlet_name`, `manager_profile`

### Pagination
- Frontend: MUI DataGrid with server-side pagination; pass `page` + `page_size` query params
- Backend: custom paginator in `aas/pagination.py`; response shape:
  ```json
  { "count": N, "total_pages": N, "current_page": N, "next": "...", "previous": "...", "results": [] }
  ```

---

## Frontend Route Map

| Route | Component | Role |
|---|---|---|
| `/` | `LoginPage` | Public |
| `/manager/dashboard` | `Dashboard` | Manager |
| `/manager/outlet-selector` | `OutletSelector` | Manager |
| `/manager/employees` | `ManagerEmployeeList` | Manager |
| `/manager/daily-attendance-view` | `DailyAttendanceView` | Manager |
| `/manager/leave-approval` | `LeaveApproval` | Manager |
| `/manager/reports` | `ManagerAttendanceReport` | Manager |
| `/manager/daily-outlet-attendance` | `DailyOutletAttendance` | Manager |
| `/manager/outlet-leave-summary` | `OutletLeaveHistory` | Manager |
| `/manager/attendance-editor` | `AttendanceEditor` | Manager |
| `/manager/bulk-leave-assignment` | `BulkLeaveAssignment` | Manager |
| `/manager/daily-attendance` | `ManagerDailyAttendance` | Manager |
| `/manager/database-backup` | `DatabaseBackup` | Manager |
| `/admin/dashboard` | `AdminDashboard` | Admin |
| `/admin/outlets` | `OutletManager` | Admin |
| `/admin/create` | `CreateRole` | Admin |
| `/admin/create/employee` | `CreateEmployee` | Admin |
| `/admin/create/outlet` | `CreateOutlet` | Admin |
| `/admin/create/agency` | `CreateAgency` | Admin |
| `/admin/create/leave` | `CreateLeave` | Admin |
| `/admin/create/holidays` | `HolidayManager` | Admin |
| `/admin/assign/leave` | `AdminLeaveApproval` | Admin |
| `/admin/assign/workshift` | `DeviceOutletAssignment` | Admin |
| `/admin/reports/attendance` | `AdminAttendanceReport` | Admin |
| `/admin/reports/outlet-summary` | `AdminOutletSummary` | Admin |
| `/admin/employees/editor` | `AdminEmployeeEditor` | Admin |
| `/admin/employees/password-reset` | `EmployeePasswordReset` | Admin |
| `/admin/employees/face-reference` | `FaceReferenceImages` | Admin |
| `/admin/employees/status` | `UserStatusManager` | Admin |
| `/admin/attendance-edit-requests` | `AttendanceEditRequests` | Admin |

---

## Backend API Endpoint Map

### Auth & User
| Endpoint | Method | Description |
|---|---|---|
| `/api/token/` | POST | JWT login (web) |
| `/api/token/refresh/` | POST | Refresh access token |
| `/api/user/` | GET | Current user details |
| `/api/users/` | — | User management (users/apiurls.py) |
| `/api/changepassword/<id>/` | PUT | Change employee password |

### Employees
| Endpoint | Method | Description |
|---|---|---|
| `/api/getemployees` | GET | Active employees only |
| `/api/getallemployees/` | GET | All employees (incl. inactive) |
| `/api/getoutletemployees/` | GET | Employees filtered by outlet |
| `/api/simple-employees/` | GET | Minimal employee list |
| `/api/employees/create` | POST | Create employee |
| `/api/editemployees/<id>/` | PUT/PATCH | Edit employee |
| `/api/deactivate-employee/<id>/` | POST | Soft deactivate |
| `/api/activate-employee/<id>/` | POST | Re-activate |
| `/api/employee-status-history/<id>/` | GET | Deactivation audit log |

### Outlets, Agencies, Groups, Roles
| Endpoint | Description |
|---|---|
| `/api/outlets/`, `/api/outlets/create`, `/api/outlets/manage/<id>/` | Outlet CRUD |
| `/api/agencies/`, `/api/agencies/<id>/` | Agency CRUD |
| `/api/groups/`, `/api/group/`, `/api/group/create/`, `/api/group/<id>/update/` | Group/role management |
| `/api/create-role/` | Create role |
| `/api/devices/`, `/api/devices/delete/` | Device management |

### Holidays & Leave Types
| Endpoint | Description |
|---|---|
| `/api/holidays/`, `/api/holidays/<id>/` | Holiday CRUD |
| `/api/leavetypes/`, `/api/leavetypes/<id>/` | Leave type CRUD |

### Attendance (`/api/attendance/`)
| Sub-path | Description |
|---|---|
| `punch-in/` | Clock in (face + GPS) |
| `punch-out/` | Clock out (face + GPS) |
| `me/` | My attendance records |
| `outlet/` | Outlet attendance |
| `get_attall/` | All attendance records |
| `get_att/<id>/` | Single record |
| `status/<id>/` | Update attendance status |
| `applyleave/` | Submit leave request |
| `myleaverequests/` | My leaves |
| `allleaverequests/` | All leave requests |
| `outletleaverequests/` | Outlet-filtered leaves |
| `pendingleave/` | Pending approvals |
| `updateleavestatus/<id>/` | Approve/reject leave |
| `report/` | Generate attendance report |
| `verify/` | Verify attendance record |
| `update/` | Update attendance |
| `addleave/` | Manager-adds leave manually |
| `bulk-add/` | Bulk attendance add |
| `bulk-addleave/` | Bulk leave add |
| `v2/` | V2 attendance list |
| `v2/update/`, `v2/delete/`, `v2/bulk-add/` | V2 CRUD |
| `v2/edit-request/` | Submit edit request |
| `v2/edit-requests/` | List edit requests |
| `v2/edit-requests/review/` | Review edit request |
| `/api/attendance/all/` | All attendance (global) |

### Reports (`/report/`)
| Sub-path | Description |
|---|---|
| `dashboard/overview/` | System-wide KPIs |
| `dashboard/leave-presence-trend/` | 7-day trend data |
| `dashboard/outlet-summary/` | Per-outlet stats |
| `dashboard/employee-attendance-summary/` | Per-employee monthly |
| `dashboard/overview/outlet/<id>/` | Outlet-filtered KPIs |
| `dashboard/*/filter/` | Query-param filtered variants |
| `employee/<id>/` | Individual employee report |
| `employees/user/<id>/` | Employees managed by user |
| `leaves/outlet/` | Outlet leave list |
| `leaves/<id>/status/` | Update leave status |
| `leaves/bulk_create/` | Bulk leave creation |
| `leaves/outlet-data/` | Outlet leave data |
| `employees/`, `employees/<pk>/` | Employee CRUD (report app) |

### Mobile API (`/mobile/`)
| Endpoint | Description |
|---|---|
| `auth/token/` | Mobile JWT login |
| `attendance/today/` | Today's attendance |
| `attendance/punch-in/` | Mobile punch in |
| `attendance/punch-out/` | Mobile punch out |
| `leave/` | Mobile leave endpoints |

### Database Backup
| Endpoint | Description |
|---|---|
| `/api/db-health/` | DB connection check |
| `/api/db-backup/download/` | Authenticated DB dump download |
| `/api/db-backup/upload/` | Authenticated DB restore |
| `/db-backup/` | HTML backup admin page (no auth) |

---

## Core Data Models (`backend/main/models.py`)

| Model | Key Fields |
|---|---|
| `Employee` | `user` (1-1 User), `employee_id`, `empcode`, `fullname`, `phone_number`, `date_of_birth`, `outlets` (M2M), `basic_salary`, `epf_number`, `reference_photo`, `punchin_selfie`, `punchout_selfie`, `is_active` |
| `Attendance` | `employee`, `date`, `check_in_time`, `check_in_lat/long`, `check_out_time`, `check_out_lat/long`, `worked_hours`, `ot_hours`, `status` (Present/Late/Half Day/Absent/On Leave), `punchin_verification` (Pending/Verified/Rejected) |
| `AttendanceEditRequest` | `attendance`, `proposed_check_in`, `proposed_check_out`, `reason`, `status` (Pending/Approved/Rejected) |
| `EmpLeave` | `employee`, `leave_type`, `date`, `status` (pending/approved/rejected/cancelled) |
| `LeaveType` | `att_type`, `att_type_name`, `per_day_hours`, `pay_percentage`, `days_per_year` |
| `Holiday` | `hcode`, `holiday_name`, `date`, OT pay % |
| `Outlet` | `name`, `latitude`, `longitude`, `radius_meters`, `manager` (FK Employee), `agency` |
| `Agency` | `name`, `address` |
| `Role` | `group` (Django Group), `designation`, `is_active` |
| `Devices` | `user`, `device_id`, `device_type` (personal/company) |
| `EmployeeStatusLog` | `employee`, `action` (DEACTIVATED/ACTIVATED), `action_by`, `timestamp` |

---

## Development Patterns

### Adding a new backend endpoint
1. Write the view function/class in the appropriate app's `views.py` or `api.py`
2. Add the URL pattern to the app's `urls.py` / `apiurls.py`
3. Ensure the view uses `@permission_classes([IsAuthenticated])` or the default DRF setting

### Adding a new frontend page
1. Create the component in `frontend/src/pages/` (or `pages/admin/`, `pages/manager/`)
2. Import and add a `<Route>` in `frontend/src/App.js` wrapped in `<ProtectedRoute>`
3. Add a menu entry in `frontend/src/components/Sidebar.js` (role-aware)
4. Use `import api from '../utils/api'` for all HTTP calls

### Adding a new DB model
1. Define the model class in `backend/main/models.py`
2. Create a serializer in `backend/main/serializers.py`
3. Run `python manage.py makemigrations && python manage.py migrate`
4. Wire up views and URLs

### Adding a new mobile screen
1. Create screen file in `mobile/src/navigation/`
2. Register in the stack navigator
3. Use `apiGet()` / `apiPost()` / `apiPostFormData()` from `mobile/src/api.js`
4. Define endpoint constant in `mobile/src/config.js`

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django signing key |
| `DJANGO_DEBUG` | True (dev) / False (prod) |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS IAM credentials (Rekognition only) |
| `AWS_REKOGNITION_REGION` | AWS region (e.g. `us-east-2`) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |
| `REACT_APP_API_URL` | Backend URL for React build |
| `API_URL` | Backend URL for React Native (use LAN IP for physical device) |

Copy `.env.example` → `.env` and fill values. Never commit `.env`.

---

## Running the Project

```bash
# Full stack (recommended)
docker-compose up --build
# Frontend: http://localhost:3000  Backend: http://localhost:8000

# Backend only (local)
cd backend && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

# Frontend only (local)
cd frontend && npm install && npm start

# Mobile (Android)
cd mobile && npm install && npx react-native run-android
# Note: set API_URL in mobile/src/config.js to your machine's LAN IP
```

---

## Production Checklist

- [ ] `DJANGO_DEBUG=False`
- [ ] Strong `DJANGO_SECRET_KEY`
- [ ] `DJANGO_ALLOWED_HOSTS` — real domain only (currently `['*']` — must fix)
- [ ] `CORS_ALLOWED_ORIGINS` — frontend domain only
- [ ] HTTPS reverse proxy in front of Gunicorn
- [ ] AWS IAM: least-privilege (rekognition:* only), rotate credentials regularly
