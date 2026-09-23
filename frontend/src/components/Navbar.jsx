import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useTheme from "../hooks/useTheme";

const LINKS = [
  { to: "/", end: true, icon: "📊", label: "Dashboard" },
  { to: "/roadmap", end: false, icon: "🗺️", label: "Roadmap" },
  { to: "/progress", end: false, icon: "📈", label: "Progress" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-brand" to="/">
          <span className="bug-icon">🚀</span> SkillSprint
        </Link>

        <nav className="navbar-tabs">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `navtab${isActive ? " active" : ""}`}
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-user">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <span>{user.username}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
