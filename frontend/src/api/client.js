import axios from "axios";

const resolvedBaseUrl =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000/api";

const client = axios.create({
  baseURL: resolvedBaseUrl,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
