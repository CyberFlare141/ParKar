import axios from "axios";

const resolvedBaseUrl =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000/api";

const client = axios.create({
  baseURL: resolvedBaseUrl,
});

export default client;
