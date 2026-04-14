// ─── Server ───────────────────────────────────────────────────────────────────
// Use your machine's local IP for physical devices (e.g. http://192.168.1.x:8000)
// Use http://10.0.2.2:8000 for Android emulator
export const BASE_URL = 'http://10.0.2.2:8000';

// ─── Mobile API endpoints ─────────────────────────────────────────────────────
export const ENDPOINTS = {
  token:           `${BASE_URL}/mobile/auth/token/`,
  todayAttendance: `${BASE_URL}/mobile/attendance/today/`,
  punchIn:         `${BASE_URL}/mobile/attendance/punch-in/`,
  punchOut:        `${BASE_URL}/mobile/attendance/punch-out/`,
  myLeaves:        `${BASE_URL}/mobile/leave/my-requests/`,
  pendingLeave:    `${BASE_URL}/mobile/leave/pending/`,
  applyLeave:      `${BASE_URL}/mobile/leave/apply/`,
};
