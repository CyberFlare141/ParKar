import axios from "axios";
import { clearAuthSession, getAuthToken } from "../auth/session";

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:18080/api`;
  }

  return "http://localhost:18080/api";
}

const resolvedBaseUrl = resolveBaseUrl();

const client = axios.create({
  baseURL: resolvedBaseUrl,
});

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (!token) {
    return config;
  }

  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldSkipRedirect = Boolean(error?.config?.skipAuthRedirect);
    if (error?.response?.status === 401 && !shouldSkipRedirect) {
      clearAuthSession();
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default client;
