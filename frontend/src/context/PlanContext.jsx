import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchPlans } from "../api/learning";
import { useAuth } from "./AuthContext";

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshPlan = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setError(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlans();
      const plans = data.results || data;
      const active = plans.find((p) => p.status === "active") || plans[0] || null;
      setPlan(active);
      return active;
    } catch (err) {
      // Surface the failure instead of silently leaving `plan` null — a
      // network/CORS/server error here otherwise looks identical to "you
      // just haven't created a plan yet" and bounces you to onboarding
      // with no explanation.
      setPlan(null);
      setError(
        err.response
          ? `Server error (${err.response.status}) while loading your plan.`
          : "Could not reach the backend. Is it running at the configured API URL?"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // AuthContext restores the session (verifying the stored token) before
    // `user` is known to be set or null. If we fetch plans immediately,
    // `user` is still momentarily null on first render, refreshPlan()
    // concludes "not logged in -> no plan" and flips `loading` to false —
    // and every page that reads "no plan yet" as "go to onboarding" does so
    // before auth actually finishes, permanently bouncing a returning user
    // with an active plan back to onboarding on every refresh. Wait for
    // auth to settle first so `user` is accurate before we decide anything.
    if (authLoading) return;
    refreshPlan();
  }, [authLoading, refreshPlan]);

  return (
    <PlanContext.Provider value={{ plan, setPlan, loading, error, refreshPlan }}>{children}</PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
