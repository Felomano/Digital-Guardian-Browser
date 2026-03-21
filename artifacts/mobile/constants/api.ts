// The API server is served at /api through the Replit proxy.
// EXPO_PUBLIC_DOMAIN gives us the public dev/prod domain.
const BASE_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";

export const API_BASE =
  BASE_DOMAIN
    ? `https://${BASE_DOMAIN}/api`
    : "http://localhost:8080/api";

export const SECURITY_ENDPOINT = `${API_BASE}/check-security`;
export const REPORT_ENDPOINT = `${API_BASE}/report`;
export const REPORTS_ENDPOINT = `${API_BASE}/reports`;
export const HEROES_ENDPOINT = `${API_BASE}/heroes`;
export const USER_ENDPOINT = `${API_BASE}/user`;
