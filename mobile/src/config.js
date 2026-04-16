// ─── Server ───────────────────────────────────────────────────────────────────
// Production backend URL
export const BASE_URL = 'http://123.231.60.24:1605';

// ─── Mobile API endpoints ─────────────────────────────────────────────────────
export const ENDPOINTS = {
  token:              `${BASE_URL}/mobile/auth/token/`,
  todayAttendance:    `${BASE_URL}/mobile/attendance/today/`,
  punchIn:            `${BASE_URL}/mobile/attendance/punch-in/`,
  punchOut:           `${BASE_URL}/mobile/attendance/punch-out/`,
  employeeProfile:    `${BASE_URL}/mobile/attendance/profile/`,
  attendanceHistory:  `${BASE_URL}/mobile/attendance/history/`,
  myLeaves:           `${BASE_URL}/mobile/leave/my-requests/`,
  pendingLeave:       `${BASE_URL}/mobile/leave/pending/`,
  applyLeave:         `${BASE_URL}/mobile/leave/apply/`,
};
