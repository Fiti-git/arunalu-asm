/**
 * Shared API helpers.
 * All screens import from here — no hardcoded URLs anywhere else.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── JWT ──────────────────────────────────────────────────────────────────────
export const decodeJWT = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
  } catch {
    return null;
  }
};

export const getToken = () => AsyncStorage.getItem('accessToken');

// ─── Auth header helper ───────────────────────────────────────────────────────
const authHeaders = (token, extra = {}) => ({
  Authorization: `Bearer ${token}`,
  ...extra,
});

// ─── Fetch wrappers ───────────────────────────────────────────────────────────

/** GET with Bearer token */
export const apiGet = async (url) => {
  const token = await getToken();
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
};

/** POST JSON with Bearer token */
export const apiPost = async (url, body) => {
  const token = await getToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
};

/** POST FormData with Bearer token */
export const apiFormPost = async (url, formData) => {
  const token = await getToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),   // no Content-Type — let fetch set multipart boundary
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
};
