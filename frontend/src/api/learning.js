import client from "./client";

// Tracks
export const fetchTracks = () => client.get("/tracks/").then((r) => r.data);
export const fetchTrack = (id) => client.get(`/tracks/${id}/`).then((r) => r.data);
export const createTrack = (payload) => client.post("/tracks/", payload).then((r) => r.data);

// Plans
export const fetchPlans = () => client.get("/plans/").then((r) => r.data);
export const fetchPlan = (id) => client.get(`/plans/${id}/`).then((r) => r.data);
export const createPlan = (payload) => client.post("/plans/", payload).then((r) => r.data);
export const fetchRoadmap = (planId) => client.get(`/plans/${planId}/roadmap/`).then((r) => r.data);
export const fetchDashboard = (planId) => client.get(`/plans/${planId}/dashboard/`).then((r) => r.data);
export const replanPlan = (planId) => client.post(`/plans/${planId}/replan/`).then((r) => r.data);

// Roadmap items
export const fetchRoadmapItems = (params) => client.get("/roadmap-items/", { params }).then((r) => r.data);
export const completeRoadmapItem = (id) => client.post(`/roadmap-items/${id}/complete/`).then((r) => r.data);
export const startRoadmapItem = (id) => client.post(`/roadmap-items/${id}/start/`).then((r) => r.data);
export const skipRoadmapItem = (id) => client.post(`/roadmap-items/${id}/skip/`).then((r) => r.data);

// Quiz
export const fetchTopicQuiz = (topicId) => client.get(`/topics/${topicId}/quiz/`).then((r) => r.data);
export const submitQuizAttempt = (payload) => client.post("/quiz-attempts/", payload).then((r) => r.data);
export const fetchQuizAttempts = (planId) =>
  client.get("/quiz-attempts/", { params: { plan: planId } }).then((r) => r.data);
