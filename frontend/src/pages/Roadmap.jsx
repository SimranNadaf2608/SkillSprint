import { useCallback, useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { completeRoadmapItem, fetchRoadmap, skipRoadmapItem, startRoadmapItem } from "../api/learning";
import { usePlan } from "../context/PlanContext";
import Loader from "../components/Loader";
import ConnectionError from "../components/ConnectionError";
import DifficultyBadge from "../components/DifficultyBadge";

const STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

function WeekBlock({ week, onComplete, onStart, onSkip, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = week.items.length;
  const done = week.items.filter((i) => i.status === "completed").length;

  return (
    <div className="card week-block">
      <button type="button" className="week-block-header" onClick={() => setOpen((o) => !o)}>
        <span>
          Week {week.week_number} <span className="text-muted">({done}/{total} done)</span>
        </span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="week-block-items">
          {week.items.map((item) => (
            <div key={item.id} className={`task-row${item.is_review ? " task-row-review" : ""}`}>
              <div className="task-row-main">
                <div className="task-row-title">
                  {item.is_review && <span className="badge badge-hard">Review</span>} {item.topic.name}
                </div>
                <div className="task-row-meta">
                  <span className="text-muted">{item.topic.skill_name}</span>
                  <DifficultyBadge difficulty={item.topic.difficulty} />
                  <span className="text-muted">{item.scheduled_date}</span>
                  <span className={`badge badge-${item.status === "completed" ? "resolved" : "unresolved"}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
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
                {item.status !== "completed" && item.status !== "skipped" && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onSkip(item)}>
                    Skip
                  </button>
                )}
                <Link className="btn btn-ghost btn-sm" to={`/quiz/${item.topic.id}`}>
                  Quiz
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Roadmap() {
  const { plan, loading: planLoading, error: planError } = usePlan();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!plan) return;
    setLoading(true);
    fetchRoadmap(plan.id)
      .then(setWeeks)
      .finally(() => setLoading(false));
  }, [plan]);

  useEffect(() => {
    load();
  }, [load]);

  if (planLoading) return <Loader label="Loading your plan…" />;
  if (planError) return <ConnectionError message={planError} />;
  if (!plan) return <Navigate to="/onboarding" replace />;
  if (loading) return <Loader label="Loading roadmap…" />;

  const firstIncompleteWeek = weeks.find((w) => w.items.some((i) => i.status !== "completed"))?.week_number;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your roadmap</h1>
          <p className="page-subtitle">
            {plan.track_detail.name} · generated for {plan.hours_per_day}h/day over {plan.total_weeks} weeks
          </p>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🗺️</div>
          No roadmap items yet.
        </div>
      ) : (
        weeks.map((week) => (
          <WeekBlock
            key={week.week_number}
            week={week}
            defaultOpen={week.week_number === firstIncompleteWeek}
            onComplete={async (item) => {
              await completeRoadmapItem(item.id);
              load();
            }}
            onStart={async (item) => {
              await startRoadmapItem(item.id);
              load();
            }}
            onSkip={async (item) => {
              await skipRoadmapItem(item.id);
              load();
            }}
          />
        ))
      )}
    </div>
  );
}
