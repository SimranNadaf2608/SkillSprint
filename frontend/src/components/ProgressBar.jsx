export default function ProgressBar({ percent = 0, color }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${clamped}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  );
}
