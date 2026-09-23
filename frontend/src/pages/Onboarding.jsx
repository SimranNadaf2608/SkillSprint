import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPlan, fetchTracks } from "../api/learning";
import { usePlan } from "../context/PlanContext";
import Loader from "../components/Loader";
import ConnectionError from "../components/ConnectionError";

const LEVELS = [
  { value: "beginner", label: "Beginner", blurb: "New to this — start from the fundamentals." },
  { value: "intermediate", label: "Intermediate", blurb: "Know the basics — skip the easy stuff." },
  { value: "advanced", label: "Advanced", blurb: "Solid foundation — go straight to the hard parts." },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPlan } = usePlan();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const newTrackId = location.state?.newTrackId;
  const newTrackName = location.state?.newTrackName;

  const [trackId, setTrackId] = useState(null);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [durationMonths, setDurationMonths] = useState(3);
  const [level, setLevel] = useState("beginner");

  useEffect(() => {
    fetchTracks()
      .then((data) => {
        const list = data.results || data;
        setTracks(list);
        if (newTrackId && list.some((t) => t.id === newTrackId)) {
          setTrackId(newTrackId);
        } else if (list.length) {
          setTrackId(list[0].id);
        }
      })
      .catch((err) => {
        setLoadError(
          err.response
            ? `Server error (${err.response.status}) while loading tracks.`
            : "Could not reach the backend. Is it running at the configured API URL?"
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trackId) return;
    setError("");
    setSubmitting(true);
    try {
      await createPlan({
        track: trackId,
        hours_per_day: hoursPerDay,
        duration_months: durationMonths,
        current_level: level,
      });
      await refreshPlan();
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create your learning plan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading tracks…" />;
  if (loadError) return <ConnectionError message={loadError} />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Choose your target</h1>
          <p className="page-subtitle">SkillSprint will generate a week-by-week roadmap for you.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {newTrackId && <div className="alert alert-success">"{newTrackName}" was created — pick a pace below to generate its roadmap.</div>}

      {tracks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📭</div>
          <h2>No tracks available yet</h2>
          <p>
            The backend is reachable, but no tracks have been seeded. Run{" "}
            <code>python manage.py seed_curriculum</code> in the backend, or add your own below.
          </p>
          <button type="button" className="btn btn-primary mt-16" onClick={() => navigate("/tracks/new")}>
            + Add a new technology
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit}>
        <div className="section-title">
          <span className="section-icon">🎯</span> Target track
        </div>
        <div className="track-grid">
          {tracks.map((track) => (
            <button
              type="button"
              key={track.id}
              className={`track-card${trackId === track.id ? " selected" : ""}`}
              onClick={() => setTrackId(track.id)}
            >
              <div className="track-card-icon">{track.icon}</div>
              <div className="track-card-name">{track.name}</div>
              <div className="track-card-desc">{track.description}</div>
              <div className="track-card-meta">
                {track.skill_count} skills · {track.topic_count} topics
              </div>
            </button>
          ))}
          <button type="button" className="track-card add-track-card" onClick={() => navigate("/tracks/new")}>
            <div className="track-card-icon">➕</div>
            <div className="track-card-name">Add a new technology</div>
          </button>
        </div>

        <div className="section-title">
          <span className="section-icon">⏱️</span> Pace
        </div>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hours">Hours per day</label>
              <input
                id="hours"
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                className="input"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="duration">Duration (months)</label>
              <input
                id="duration"
                type="number"
                min="1"
                max="24"
                className="input"
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
              />
            </div>
          </div>

          <label>Current level</label>
          <div className="level-grid">
            {LEVELS.map((lvl) => (
              <button
                type="button"
                key={lvl.value}
                className={`level-card${level === lvl.value ? " selected" : ""}`}
                onClick={() => setLevel(lvl.value)}
              >
                <div className="level-card-name">{lvl.label}</div>
                <div className="level-card-blurb">{lvl.blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-24" disabled={submitting || !trackId}>
          {submitting ? "Generating your roadmap..." : "Generate my roadmap"}
        </button>
      </form>
      )}
    </div>
  );
}
