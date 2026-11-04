const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function getToken() {
  return sessionStorage.getItem("janta_hospital_token");
}

export function getStoredUser() {
  try {
    const value = sessionStorage.getItem("janta_hospital_user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveSession({ token, user }) {
  sessionStorage.setItem("janta_hospital_token", token);
  sessionStorage.setItem("janta_hospital_user", JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem("janta_hospital_token");
  sessionStorage.removeItem("janta_hospital_user");
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Unable to connect to Janta Hospital. Check that the backend is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function getHomePath(user) {
  if (user?.role === "DOCTOR" || user?.role === "ADMIN") return "/doctor";
  return "/patient";
}
