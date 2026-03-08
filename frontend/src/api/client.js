import axios from "axios";
import { clearAuthSession, getAuthToken } from "../auth/session";

const resolvedBaseUrl =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000/api";

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
