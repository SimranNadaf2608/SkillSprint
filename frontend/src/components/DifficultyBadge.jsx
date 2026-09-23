const LABELS = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function DifficultyBadge({ difficulty }) {
  return <span className={`badge badge-${difficulty}`}>{LABELS[difficulty] || difficulty}</span>;
}
