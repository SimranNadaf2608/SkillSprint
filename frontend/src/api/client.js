import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const client = axios.create({
  baseURL: BASE_URL,
});

function getTokens() {
  try {
    return {
      access: localStorage.getItem("skillsprint_access"),
      refresh: localStorage.getItem("skillsprint_refresh"),
    };
  } catch {
    return { access: null, refresh: null };
  }
}

export function setTokens({ access, refresh }) {
  try {
    if (access) localStorage.setItem("skillsprint_access", access);
    if (refresh) localStorage.setItem("skillsprint_refresh", refresh);
  } catch {
    /* ignore storage errors */
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem("skillsprint_access");
    localStorage.removeItem("skillsprint_refresh");
  } catch {
    /* ignore storage errors */
  }
}

client.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) throw new Error("No refresh token");
  const res = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
  setTokens({ access: res.data.access, refresh: res.data.refresh || refresh });
  return res.data.access;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccess = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return client(original);
      } catch {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
