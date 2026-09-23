from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from . import roadmap as roadmap_service
from .filters import RoadmapItemFilter
from .models import LearningPlan, QuizAttempt, QuizQuestion, RoadmapItem, Topic, Track
from .permissions import IsPlanOwner, IsRoadmapItemOwner
from .serializers import (
    LearningPlanSerializer,
    QuizAttemptSerializer,
    QuizQuestionPublicSerializer,
    QuizSubmitSerializer,
    RoadmapItemSerializer,
    TrackCreateSerializer,
    TrackListSerializer,
    TrackSerializer,
)


class TrackViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Catalog of learning tracks a user can start a plan from — listing and
    detail are read-only, but any logged-in user can also POST a brand-new
    technology (with its skills/topics nested in one call) so it's
    immediately pickable on Onboarding. No update/delete via the API on
    purpose; use the Django admin for editing or removing existing content."""

    queryset = Track.objects.all().prefetch_related("skills__topics")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return TrackListSerializer
        if self.action == "create":
            return TrackCreateSerializer
        return TrackSerializer


class LearningPlanViewSet(viewsets.ModelViewSet):
    serializer_class = LearningPlanSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlanOwner]

    def get_queryset(self):
        return LearningPlan.objects.filter(user=self.request.user).select_related("track")

    def perform_create(self, serializer):
        plan = serializer.save(user=self.request.user)
        roadmap_service.generate_roadmap(plan)

    @action(detail=True, methods=["get"])
    def roadmap(self, request, pk=None):
        plan = self.get_object()
        items = plan.roadmap_items.select_related("topic", "topic__skill").all()
        week = request.query_params.get("week")
        if week:
            items = items.filter(week_number=week)

        weeks = {}
        for item in items:
            weeks.setdefault(item.week_number, []).append(item)
        data = [
            {"week_number": w, "items": RoadmapItemSerializer(week_items, many=True).data}
            for w, week_items in sorted(weeks.items())
        ]
        return Response(data)

    @action(detail=True, methods=["post"])
    def replan(self, request, pk=None):
        plan = self.get_object()
        result = roadmap_service.replan(plan)
        return Response(result)

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        plan = self.get_object()
        return Response(roadmap_service.build_dashboard(plan))


class RoadmapItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RoadmapItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsRoadmapItemOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_class = RoadmapItemFilter

    def get_queryset(self):
        return RoadmapItem.objects.filter(plan__user=self.request.user).select_related("topic", "plan")

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        item = self.get_object()
        item.mark_completed()
        return Response(RoadmapItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        item = self.get_object()
        item.status = RoadmapItem.Status.IN_PROGRESS
        item.save(update_fields=["status"])
        return Response(RoadmapItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def skip(self, request, pk=None):
        item = self.get_object()
        item.status = RoadmapItem.Status.SKIPPED
        item.save(update_fields=["status"])
        return Response(RoadmapItemSerializer(item).data)


class TopicQuizView(generics.ListAPIView):
    """List quiz questions for a topic (answers hidden)."""

    serializer_class = QuizQuestionPublicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return QuizQuestion.objects.filter(topic_id=self.kwargs["topic_id"])


class QuizAttemptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = QuizAttempt.objects.filter(plan__user=request.user).select_related("topic")
        plan_id = request.query_params.get("plan")
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return Response(QuizAttemptSerializer(qs, many=True).data)

    def post(self, request):
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = get_object_or_404(LearningPlan, id=data["plan"], user=request.user)
        topic = get_object_or_404(Topic, id=data["topic"])
        questions = {q.id: q for q in QuizQuestion.objects.filter(topic=topic)}

        correct = 0
        for answer in data["answers"]:
            question = questions.get(answer["question_id"])
            if question and question.correct_option == answer["selected_option"]:
                correct += 1
        total = len(data["answers"])
        score = round((correct / total) * 100, 1) if total else 0.0

        attempt = QuizAttempt.objects.create(
            plan=plan,
            topic=topic,
            total_questions=total,
            correct_answers=correct,
            score_percent=score,
        )
        plan.record_activity()
        if attempt.is_weak:
            roadmap_service.insert_weak_reviews(plan)

        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)
