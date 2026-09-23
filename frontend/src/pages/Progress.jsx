import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboard, fetchQuizAttempts, fetchRoadmap } from "../api/learning";
import { usePlan } from "../context/PlanContext";
import Loader from "../components/Loader";
import ConnectionError from "../components/ConnectionError";
import StatCard from "../components/StatCard";

export default function ProgressPage() {
  const { plan, loading: planLoading, error: planError } = usePlan();
  const [dashboard, setDashboard] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [skillStats, setSkillStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!plan) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [dash, attemptData, roadmapData] = await Promise.all([
        fetchDashboard(plan.id),
        fetchQuizAttempts(plan.id),
        fetchRoadmap(plan.id),
      ]);
      setDashboard(dash);
      const attemptList = (attemptData.results || attemptData).slice().reverse();
      setAttempts(attemptList);

      const bySkill = {};
      roadmapData.forEach((week) => {
        week.items.forEach((item) => {
          const name = item.topic.skill_name;
          if (!bySkill[name]) bySkill[name] = { name, total: 0, completed: 0 };
          bySkill[name].total += 1;
          if (item.status === "completed") bySkill[name].completed += 1;
        });
      });
      setSkillStats(Object.values(bySkill));
    } catch {
      setLoadError("Could not load your progress data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => {
    load();
  }, [load]);

  if (planLoading) return <Loader label="Loading your plan…" />;
  if (planError) return <ConnectionError message={planError} />;
  if (!plan) return <Navigate to="/onboarding" replace />;
  if (loading) return <Loader label="Loading progress…" />;
  if (loadError) return <ConnectionError message={loadError} />;
  if (!dashboard) return <Loader label="Loading progress…" />;

  const scoreData = attempts.map((a, idx) => ({
    name: `#${idx + 1}`,
    score: a.score_percent,
    topic: a.topic_name,
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Progress</h1>
          <p className="page-subtitle">Your streak, quiz history and skill breakdown.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="🔥" value={dashboard.current_streak} label="Current streak (days)" color="#d97706" colorLight="#fef3e2" />
        <StatCard icon="🏆" value={dashboard.longest_streak} label="Longest streak (days)" color="#16a34a" colorLight="#e9f9ee" />
        <StatCard icon="✅" value={`${dashboard.completed_topics}/${dashboard.total_topics}`} label="Topics completed" color="#4f46e5" colorLight="#eef0ff" />
        <StatCard icon="⚠️" value={dashboard.weak_topics.length} label="Weak topics" color="#dc2626" colorLight="#fdeaea" />
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="chart-card-title">Skill completion</div>
          {skillStats.length === 0 ? (
            <p className="text-muted">No roadmap data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={skillStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--color-border)" name="Total topics" />
                <Bar dataKey="completed" fill="var(--color-primary)" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="chart-card-title">Quiz score history</div>
          {scoreData.length === 0 ? (
            <p className="text-muted">Take a quiz to see your score trend here.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, key, item) => [`${value}%`, item.payload.topic]} />
                <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="section-title">
        <span className="section-icon">⚠️</span> Weak topics needing review
      </div>
      {dashboard.weak_topics.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">✨</div>
          No weak topics — keep it up!
        </div>
      ) : (
        <div className="card">
          {dashboard.weak_topics.map((topic) => (
            <div key={topic.id} className="list-row">
              <span>{topic.name}</span>
              <span className="text-muted">{topic.skill_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
