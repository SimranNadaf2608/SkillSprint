import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasToken = (() => {
      try {
        return Boolean(localStorage.getItem("skillsprint_access"));
      } catch {
        return false;
      }
    })();

    if (!hasToken) {
      setLoading(false);
      return;
    }

    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    await authApi.login(username, password);
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  };

  const register = async (payload) => {
    await authApi.register(payload);
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
