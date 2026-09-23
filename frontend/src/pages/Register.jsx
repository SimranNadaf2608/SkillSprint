import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/onboarding");
    } catch (err) {
      if (err.response) {
        const data = err.response.data;
        setError(data ? Object.values(data).flat().join(" ") : "Registration failed.");
      } else {
        setError("Could not reach the backend. Is it running at the configured API URL?");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-logo">🚀</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start your personalized learning sprint</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" className="input" value={form.username} onChange={update("username")} required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={update("email")} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={update("password")}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password_confirm">Confirm password</label>
            <input
              id="password_confirm"
              type="password"
              className="input"
              value={form.password_confirm}
              onChange={update("password_confirm")}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
