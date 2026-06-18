export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  API_BASE_URL.replace(/\/api$/, "");

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;
export const getWsUrl = (path: string) => `${WS_BASE_URL}${path}`;
