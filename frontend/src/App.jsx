import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { PlanProvider } from "./context/PlanContext";
import useTheme from "./hooks/useTheme";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import AddTrack from "./pages/AddTrack";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import TopicQuiz from "./pages/TopicQuiz";
import ProgressPage from "./pages/Progress";
import NotFound from "./pages/NotFound";

function AppRoutes() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="content-area">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracks/new"
            element={
              <ProtectedRoute>
                <AddTrack />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmap"
            element={
              <ProtectedRoute>
                <Roadmap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:topicId"
            element={
              <ProtectedRoute>
                <TopicQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <ProgressPage />
              </ProtectedRoute>
            }
          />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  useTheme();
  return (
    <Router>
      <AuthProvider>
        <PlanProvider>
          <AppRoutes />
        </PlanProvider>
      </AuthProvider>
    </Router>
  );
}
