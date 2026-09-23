from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    LearningPlanViewSet,
    QuizAttemptView,
    RoadmapItemViewSet,
    TopicQuizView,
    TrackViewSet,
)

router = DefaultRouter()
router.register("tracks", TrackViewSet, basename="track")
router.register("plans", LearningPlanViewSet, basename="plan")
router.register("roadmap-items", RoadmapItemViewSet, basename="roadmap-item")

urlpatterns = [
    path("topics/<int:topic_id>/quiz/", TopicQuizView.as_view(), name="topic-quiz"),
    path("quiz-attempts/", QuizAttemptView.as_view(), name="quiz-attempts"),
]

urlpatterns += router.urls
