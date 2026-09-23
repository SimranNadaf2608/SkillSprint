import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page">
      <div className="card empty-state">
        <div className="empty-state-icon">🧭</div>
        <h2>Page not found</h2>
        <p>That page doesn't exist.</p>
        <Link className="btn btn-primary" to="/">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
