from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from .models import LearningPlan, QuizAttempt, QuizQuestion, RoadmapItem, Skill, Topic, Track


def _unique_track_slug(name):
    base = slugify(name)[:130] or "track"
    slug = base
    suffix = 1
    while Track.objects.filter(slug=slug).exists():
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = [
            "id",
            "skill",
            "name",
            "description",
            "difficulty",
            "estimated_hours",
            "resources",
            "order_index",
        ]


class TopicMiniSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = Topic
        fields = ["id", "name", "difficulty", "estimated_hours", "skill_name"]


class SkillSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)

    class Meta:
        model = Skill
        fields = ["id", "track", "name", "description", "order_index", "topics"]


class TrackSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)
    topic_count = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = ["id", "name", "slug", "description", "icon", "skills", "topic_count"]

    def get_topic_count(self, obj):
        return Topic.objects.filter(skill__track=obj).count()


class TrackListSerializer(serializers.ModelSerializer):
    skill_count = serializers.IntegerField(source="skills.count", read_only=True)
    topic_count = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = ["id", "name", "slug", "description", "icon", "skill_count", "topic_count"]

    def get_topic_count(self, obj):
        return Topic.objects.filter(skill__track=obj).count()


class TopicCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["name", "description", "difficulty", "estimated_hours", "resources", "order_index"]
        extra_kwargs = {
            "order_index": {"required": False},
            "description": {"required": False, "allow_blank": True},
            "resources": {"required": False, "allow_blank": True},
        }


class SkillCreateSerializer(serializers.ModelSerializer):
    topics = TopicCreateSerializer(many=True)

    class Meta:
        model = Skill
        fields = ["name", "description", "order_index", "topics"]
        extra_kwargs = {
            "order_index": {"required": False},
            "description": {"required": False, "allow_blank": True},
        }

    def validate_topics(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one topic for this skill.")
        return value


class TrackCreateSerializer(serializers.ModelSerializer):
    """Lets a logged-in user add a brand-new technology — with its skills and
    topics — straight from the app, so it's immediately pickable on the
    Onboarding page to generate a roadmap from."""

    skills = SkillCreateSerializer(many=True)

    class Meta:
        model = Track
        fields = ["id", "name", "icon", "description", "skills"]
        extra_kwargs = {
            "icon": {"required": False},
            "description": {"required": False, "allow_blank": True},
        }

    def validate_skills(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one skill for this technology.")
        return value

    def create(self, validated_data):
        skills_data = validated_data.pop("skills")
        validated_data.setdefault("icon", "🎯")
        with transaction.atomic():
            track = Track.objects.create(slug=_unique_track_slug(validated_data["name"]), **validated_data)
            for skill_index, skill_data in enumerate(skills_data):
                topics_data = skill_data.pop("topics")
                skill_data.setdefault("order_index", skill_index)
                skill = Skill.objects.create(track=track, **skill_data)
                for topic_index, topic_data in enumerate(topics_data):
                    topic_data.setdefault("order_index", topic_index)
                    Topic.objects.create(skill=skill, **topic_data)
        return track

    def to_representation(self, instance):
        # Return the same rich shape TrackSerializer gives a GET, so the
        # frontend gets the freshly nested skills/topics back immediately.
        return TrackSerializer(instance, context=self.context).data


class RoadmapItemSerializer(serializers.ModelSerializer):
    topic = TopicMiniSerializer(read_only=True)

    class Meta:
        model = RoadmapItem
        fields = [
            "id",
            "plan",
            "topic",
            "week_number",
            "scheduled_date",
            "order_index",
            "status",
            "is_review",
            "is_weak",
            "completed_at",
        ]
        read_only_fields = ["plan", "topic", "week_number", "order_index", "is_review", "is_weak", "completed_at"]


class LearningPlanSerializer(serializers.ModelSerializer):
    track_detail = TrackListSerializer(source="track", read_only=True)
    progress_percent = serializers.SerializerMethodField()
    target_end_date = serializers.ReadOnlyField()
    total_weeks = serializers.ReadOnlyField()

    class Meta:
        model = LearningPlan
        fields = [
            "id",
            "track",
            "track_detail",
            "hours_per_day",
            "duration_months",
            "current_level",
            "status",
            "current_streak",
            "longest_streak",
            "last_activity_date",
            "started_at",
            "target_end_date",
            "total_weeks",
            "progress_percent",
            "created_at",
        ]
        read_only_fields = [
            "status",
            "current_streak",
            "longest_streak",
            "last_activity_date",
            "started_at",
            "created_at",
        ]

    def get_progress_percent(self, obj):
        total = obj.roadmap_items.filter(is_review=False).count()
        if not total:
            return 0
        completed = obj.roadmap_items.filter(is_review=False, status=RoadmapItem.Status.COMPLETED).count()
        return round((completed / total) * 100, 1)


class QuizQuestionPublicSerializer(serializers.ModelSerializer):
    """Used when a learner is taking a quiz — hides the correct answer."""

    class Meta:
        model = QuizQuestion
        fields = ["id", "topic", "question_text", "option_a", "option_b", "option_c", "option_d"]


class QuizAnswerInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_option = serializers.ChoiceField(choices=["a", "b", "c", "d"])


class QuizSubmitSerializer(serializers.Serializer):
    plan = serializers.IntegerField()
    topic = serializers.IntegerField()
    answers = QuizAnswerInputSerializer(many=True)


class QuizAttemptSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source="topic.name", read_only=True)
    is_weak = serializers.ReadOnlyField()

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "plan",
            "topic",
            "topic_name",
            "total_questions",
            "correct_answers",
            "score_percent",
            "is_weak",
            "taken_at",
        ]
        read_only_fields = fields
