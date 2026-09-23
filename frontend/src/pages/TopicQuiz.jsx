import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { fetchTopicQuiz, submitQuizAttempt } from "../api/learning";
import { usePlan } from "../context/PlanContext";
import Loader from "../components/Loader";
import ConnectionError from "../components/ConnectionError";

const OPTIONS = ["a", "b", "c", "d"];

export default function TopicQuiz() {
  const { topicId } = useParams();
  const { plan, loading: planLoading, error: planError } = usePlan();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTopicQuiz(topicId)
      .then((data) => setQuestions(data.results || data))
      .catch(() => setError("Could not load quiz questions for this topic."))
      .finally(() => setLoading(false));
  }, [topicId]);

  if (planLoading) return <Loader label="Loading your plan…" />;
  if (planError) return <ConnectionError message={planError} />;
  if (!plan) return <Navigate to="/onboarding" replace />;
  if (loading) return <Loader label="Loading quiz…" />;

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        plan: plan.id,
        topic: Number(topicId),
        answers: Object.entries(answers).map(([question_id, selected_option]) => ({
          question_id: Number(question_id),
          selected_option,
        })),
      };
      const data = await submitQuizAttempt(payload);
      setResult(data);
    } catch {
      setError("Could not submit your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Topic quiz</h1>
          <p className="page-subtitle">Answer every question, then submit to see your score.</p>
        </div>
        <Link className="btn btn-secondary" to="/roadmap">
          Back to roadmap
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {questions.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📝</div>
          No quiz questions for this topic yet.
        </div>
      ) : result ? (
        <div className={`card quiz-result ${result.is_weak ? "quiz-result-weak" : "quiz-result-strong"}`}>
          <div className="quiz-result-score">{result.score_percent}%</div>
          <p>
            {result.correct_answers} / {result.total_questions} correct on <strong>{result.topic_name}</strong>
          </p>
          {result.is_weak ? (
            <p className="text-muted">
              That's below 70% — this topic has been flagged as weak and a review item was added to your roadmap.
            </p>
          ) : (
            <p className="text-muted">Nice work — that's a solid score!</p>
          )}
          <Link className="btn btn-primary" to="/">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <>
          {questions.map((q, idx) => (
            <div className="card mt-16" key={q.id}>
              <div className="quiz-question-title">
                {idx + 1}. {q.question_text}
              </div>
              <div className="quiz-options">
                {OPTIONS.map((opt) => {
                  const text = q[`option_${opt}`];
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      className={`quiz-option${selected ? " selected" : ""}`}
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                    >
                      <span className="quiz-option-letter">{opt.toUpperCase()}</span>
                      {text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary mt-24"
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </button>
        </>
      )}
    </div>
  );
}
