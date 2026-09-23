export default function ConnectionError({ message }) {
  return (
    <div className="page">
      <div className="card empty-state">
        <div className="empty-state-icon">🔌</div>
        <h2>Can't reach the backend</h2>
        <p>{message}</p>
        <p className="text-muted" style={{ fontSize: 12.5 }}>
          Check that the Django server is running (<code>python manage.py runserver</code>) and that
          <code> VITE_API_URL</code> in <code>frontend/.env</code> points at it.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  );
}
