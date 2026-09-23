import client, { clearTokens, setTokens } from "./client";

export async function login(username, password) {
  const res = await client.post("/auth/login/", { username, password });
  setTokens({ access: res.data.access, refresh: res.data.refresh });
  return res.data;
}

export async function register(payload) {
  const res = await client.post("/auth/register/", payload);
  setTokens({ access: res.data.access, refresh: res.data.refresh });
  return res.data;
}

export async function fetchMe() {
  const res = await client.get("/auth/me/");
  return res.data;
}

export function logout() {
  clearTokens();
}
