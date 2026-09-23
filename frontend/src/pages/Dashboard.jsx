import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { completeRoadmapItem, fetchDashboard, replanPlan, skipRoadmapItem, startRoadmapItem } from "../api/learning";
import { usePlan } from "../context/PlanContext";
import Loader from "../components/Loader";
import ConnectionError from "../components/ConnectionError";
import ProgressRing from "../components/ProgressRing";
import DifficultyBadge from "../components/DifficultyBadge";

function TaskRow({ item, onComplete, onStart, onSkip }) {
  return (
    <div className={`task-row${item.is_review ? " task-row-review" : ""}`}>
      <div className="task-row-main">
        <div className="task-row-title">
          {item.is_review && <span className="badge badge-hard">Review</span>} {item.topic.name}
        </div>
        <div className="task-row-meta">
          <span className="text-muted">{item.topic.skill_name}</span>
          <DifficultyBadge difficulty={item.topic.difficulty} />
          <span className="text-muted">{item.topic.estimated_hours}h</span>
        </div>
      </div>
      <div className="task-row-actions">
        {item.status === "pending" && (
          <button className="btn btn-secondary btn-sm" onClick={() => onStart(item)}>
            Start
          </button>
        )}
        {item.status !== "completed" && (
          <button className="btn btn-primary btn-sm" onClick={() => onComplete(item)}>
            Complete
          </button>
        )}
        {item.status === "completed" && <span className="badge badge-resolved">Done</span>}
        {item.status !== "completed" && (
          <button className="btn btn-ghost btn-sm" onClick={() => onSkip(item)}>
            Skip
          </button>
        )}
        <Link className="btn btn-ghost btn-sm" to={`/quiz/${item.topic.id}`}>
          Quiz
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { plan, loading: planLoading, error: planError } = usePlan();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replanning, setReplanning] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    if (!plan) return;
    setLoading(true);
    fetchDashboard(plan.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [plan]);

  useEffect(() => {
    load();
  }, [load]);

  if (planLoading) return <Loader label="Loading your plan…" />;
  if (planError) return <ConnectionError message={planError} />;
  if (!plan) return <Navigate to="/onboarding" replace />;
  if (loading || !data) return <Loader label="Loading dashboard…" />;

  const handleComplete = async (item) => {
    await completeRoadmapItem(item.id);
    load();
  };
  const handleStart = async (item) => {
    await startRoadmapItem(item.id);
    load();
  };
  const handleSkip = async (item) => {
    await skipRoadmapItem(item.id);
    load();
  };

  const handleReplan = async () => {
    setReplanning(true);
    setMessage("");
    try {
      const result = await replanPlan(plan.id);
      setMessage(
        `Pace: ${result.pace.replace("_", " ")} — expected ${result.expected_progress}% done, you're at ${result.actual_progress}%. ${
          result.reviews_added ? `${result.reviews_added} review item(s) added.` : ""
        }`
      );
      load();
    } finally {
      setReplanning(false);
    }
  };

  return (
    <div className="page">
      <div className="hero-banner">
        <div className="hero-banner-info">
          <ProgressRing percent={data.progress_percent} />
          <div>
            <div className="hero-banner-title">
              {plan.track_detail.icon} {plan.track_detail.name}
            </div>
            <p className="hero-banner-subtitle">
              {plan.hours_per_day}h/day · {plan.duration_months} month plan · Level: {plan.current_level} ·{" "}
              {data.completed_topics}/{data.total_topics} topics done
            </p>
          </div>
        </div>
        <div className="hero-banner-streak">
          <span className="hero-streak-flame">🔥</span>
          <div>
            <div className="hero-streak-value">{data.current_streak}</div>
            <div className="hero-streak-label">day streak</div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <p className="page-subtitle">Best streak: {data.longest_streak} days · {data.overdue_count} overdue task(s)</p>
        </div>
        <button className="btn btn-secondary" onClick={handleReplan} disabled={replanning}>
          {replanning ? "Adjusting…" : "🔄 Adjust roadmap"}
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="section-title">
        <span className="section-icon">📅</span> Today's tasks
      </div>
      {data.todays_tasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🌤️</div>
          Nothing scheduled for today. Check the roadmap for what's next.
        </div>
      ) : (
        <div className="card">
          {data.todays_tasks.map((item) => (
            <TaskRow key={item.id} item={item} onComplete={handleComplete} onStart={handleStart} onSkip={handleSkip} />
          ))}
        </div>
      )}

      <div className="chart-grid mt-24">
        <div className="card">
          <div className="chart-card-title">Coming up</div>
          {data.upcoming_tasks.length === 0 ? (
            <p className="text-muted">Nothing else scheduled yet.</p>
          ) : (
            data.upcoming_tasks.map((item) => (
              <div key={item.id} className="list-row">
                <span>{item.topic.name}</span>
                <span className="text-muted">{item.scheduled_date}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="chart-card-title">⚠️ Weak topics</div>
          {data.weak_topics.length === 0 ? (
            <p className="text-muted">No weak spots detected yet — take some quizzes!</p>
          ) : (
            data.weak_topics.map((topic) => (
              <div key={topic.id} className="list-row">
                <span>{topic.name}</span>
                <Link className="btn btn-ghost btn-sm" to={`/quiz/${topic.id}`}>
                  Retry quiz
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
