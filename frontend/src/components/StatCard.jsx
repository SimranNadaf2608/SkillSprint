export default function StatCard({ icon, value, label, color, colorLight }) {
  return (
    <div
      className="stat-card"
      style={{
        ...(color ? { "--stat-color": color } : {}),
        ...(colorLight ? { "--stat-color-light": colorLight } : {}),
      }}
    >
      <div className="stat-card-icon">{icon}</div>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </div>
  );
}
