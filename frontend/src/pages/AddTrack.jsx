import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTrack } from "../api/learning";

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}-${Date.now()}`;

const emptyTopic = () => ({ key: nextKey(), name: "", difficulty: "medium", estimated_hours: 2, description: "" });
const emptySkill = () => ({ key: nextKey(), name: "", description: "", topics: [emptyTopic()] });

export default function AddTrack() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState([emptySkill()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateSkill = (skillKey, field, value) => {
    setSkills((prev) => prev.map((s) => (s.key === skillKey ? { ...s, [field]: value } : s)));
  };

  const updateTopic = (skillKey, topicKey, field, value) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.key !== skillKey
          ? s
          : { ...s, topics: s.topics.map((t) => (t.key === topicKey ? { ...t, [field]: value } : t)) }
      )
    );
  };

  const addSkill = () => setSkills((prev) => [...prev, emptySkill()]);
  const removeSkill = (skillKey) => setSkills((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== skillKey) : prev));

  const addTopic = (skillKey) =>
    setSkills((prev) => prev.map((s) => (s.key === skillKey ? { ...s, topics: [...s.topics, emptyTopic()] } : s)));

  const removeTopic = (skillKey, topicKey) =>
    setSkills((prev) =>
      prev.map((s) =>
        s.key !== skillKey ? s : { ...s, topics: s.topics.length > 1 ? s.topics.filter((t) => t.key !== topicKey) : s.topics }
      )
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Give this technology a name.");
      return;
    }
    for (const skill of skills) {
      if (!skill.name.trim()) {
        setError("Every skill needs a name.");
        return;
      }
      for (const topic of skill.topics) {
        if (!topic.name.trim()) {
          setError(`Every topic under "${skill.name}" needs a name.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        icon: icon.trim() || "🎯",
        description: description.trim(),
        skills: skills.map((s, si) => ({
          name: s.name.trim(),
          description: s.description.trim(),
          order_index: si,
          topics: s.topics.map((t, ti) => ({
            name: t.name.trim(),
            description: t.description.trim(),
            difficulty: t.difficulty,
            estimated_hours: Number(t.estimated_hours) || 1,
            order_index: ti,
          })),
        })),
      };
      const created = await createTrack(payload);
      navigate("/onboarding", { state: { newTrackId: created.id, newTrackName: created.name } });
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(" ") : "Could not create this technology. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add a new technology</h1>
          <p className="page-subtitle">
            Define its skills and topics — as soon as you save, it's ready to generate a roadmap from.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/onboarding")}>
          Cancel
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="track-name">Technology name</label>
              <input
                id="track-name"
                className="input"
                placeholder="e.g. React Developer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="track-icon">Icon (any emoji)</label>
              <input id="track-icon" className="input" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="track-desc">Description</label>
            <textarea
              id="track-desc"
              className="textarea"
              rows={2}
              placeholder="One line about what this track teaches."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="section-title">
          <span className="section-icon">🧩</span> Skills &amp; topics
        </div>

        {skills.map((skill, si) => (
          <div className="card skill-builder-card" key={skill.key}>
            <div className="skill-builder-header">
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Skill {si + 1} name</label>
                <input
                  className="input"
                  placeholder="e.g. React Fundamentals"
                  value={skill.name}
                  onChange={(e) => updateSkill(skill.key, "name", e.target.value)}
                />
              </div>
              {skills.length > 1 && (
                <button type="button" className="remove-icon-btn" title="Remove skill" onClick={() => removeSkill(skill.key)}>
                  ✕
                </button>
              )}
            </div>
            <div className="form-group">
              <label>Skill description</label>
              <input
                className="input"
                placeholder="Optional"
                value={skill.description}
                onChange={(e) => updateSkill(skill.key, "description", e.target.value)}
              />
            </div>

            <label>Topics</label>
            {skill.topics.map((topic, ti) => (
              <div className="topic-builder-row" key={topic.key}>
                <input
                  className="input"
                  placeholder={`Topic ${ti + 1} name, e.g. Components & Props`}
                  value={topic.name}
                  onChange={(e) => updateTopic(skill.key, topic.key, "name", e.target.value)}
                />
                <select
                  className="select"
                  value={topic.difficulty}
                  onChange={(e) => updateTopic(skill.key, topic.key, "difficulty", e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="input topic-hours-input"
                  title="Estimated hours"
                  value={topic.estimated_hours}
                  onChange={(e) => updateTopic(skill.key, topic.key, "estimated_hours", e.target.value)}
                />
                {skill.topics.length > 1 && (
                  <button
                    type="button"
                    className="remove-icon-btn"
                    title="Remove topic"
                    onClick={() => removeTopic(skill.key, topic.key)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-dashed-btn" onClick={() => addTopic(skill.key)}>
              + Add topic
            </button>
          </div>
        ))}

        <button type="button" className="add-dashed-btn add-skill-btn" onClick={addSkill}>
          + Add another skill
        </button>

        <button type="submit" className="btn btn-primary mt-24" disabled={submitting}>
          {submitting ? "Creating…" : "Create technology"}
        </button>
      </form>
    </div>
  );
}
