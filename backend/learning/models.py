from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Track(models.Model):
    """A learning target, e.g. 'Python Developer'."""

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=8, blank=True, default="🎯")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Skill(models.Model):
    """A grouping of topics within a track, e.g. 'Python Fundamentals'."""

    track = models.ForeignKey(Track, related_name="skills", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["track_id", "order_index", "id"]
        unique_together = ["track", "name"]

    def __str__(self):
        return f"{self.track.name} / {self.name}"


class Topic(models.Model):
    """A single learnable unit within a skill, e.g. 'Functions'."""

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    skill = models.ForeignKey(Skill, related_name="topics", on_delete=models.CASCADE)
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    estimated_hours = models.FloatField(default=2.0)
    resources = models.TextField(blank=True, help_text="Optional links/notes, one per line.")
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["skill_id", "order_index", "id"]
        unique_together = ["skill", "name"]

    def __str__(self):
        return self.name


class LearningPlan(models.Model):
    """A user's personalized instance of a track, with pacing + progress."""

    class Level(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="learning_plans", on_delete=models.CASCADE)
    track = models.ForeignKey(Track, related_name="plans", on_delete=models.CASCADE)
    hours_per_day = models.FloatField(default=2.0)
    duration_months = models.PositiveIntegerField(default=3)
    current_level = models.CharField(max_length=15, choices=Level.choices, default=Level.BEGINNER)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)

    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    started_at = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} → {self.track.name}"

    @property
    def target_end_date(self):
        return self.started_at + timedelta(weeks=self.duration_months * 4)

    @property
    def total_weeks(self):
        return self.duration_months * 4

    def record_activity(self, on_date=None):
        """Update streak counters given activity happened on `on_date` (default today)."""
        on_date = on_date or timezone.localdate()
        if self.last_activity_date == on_date:
            return
        if self.last_activity_date == on_date - timedelta(days=1):
            self.current_streak += 1
        else:
            self.current_streak = 1
        self.longest_streak = max(self.longest_streak, self.current_streak)
        self.last_activity_date = on_date
        self.save(update_fields=["current_streak", "longest_streak", "last_activity_date", "updated_at"])


class RoadmapItem(models.Model):
    """A topic scheduled into a specific week/day of a plan — the 'daily task' unit."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    plan = models.ForeignKey(LearningPlan, related_name="roadmap_items", on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, related_name="roadmap_items", on_delete=models.CASCADE)
    week_number = models.PositiveIntegerField()
    scheduled_date = models.DateField()
    order_index = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    is_review = models.BooleanField(default=False, help_text="True when inserted as a weak-topic review item.")
    is_weak = models.BooleanField(default=False, help_text="Flagged from a low quiz score on this topic.")
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["week_number", "scheduled_date", "order_index", "id"]

    def __str__(self):
        return f"Week {self.week_number}: {self.topic.name} ({self.status})"

    def mark_completed(self):
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])
        self.plan.record_activity()


class QuizQuestion(models.Model):
    """A multiple-choice question attached to a topic."""

    topic = models.ForeignKey(Topic, related_name="quiz_questions", on_delete=models.CASCADE)
    question_text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[("a", "A"), ("b", "B"), ("c", "C"), ("d", "D")])
    explanation = models.TextField(blank=True)

    def __str__(self):
        return self.question_text[:60]


class QuizAttempt(models.Model):
    """A user's attempt at a topic's quiz — drives weak-topic detection."""

    plan = models.ForeignKey(LearningPlan, related_name="quiz_attempts", on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, related_name="quiz_attempts", on_delete=models.CASCADE)
    total_questions = models.PositiveIntegerField()
    correct_answers = models.PositiveIntegerField()
    score_percent = models.FloatField()
    taken_at = models.DateTimeField(auto_now_add=True)

    WEAK_THRESHOLD = 70.0

    class Meta:
        ordering = ["-taken_at"]

    def __str__(self):
        return f"{self.topic.name}: {self.score_percent:.0f}%"

    @property
    def is_weak(self):
        return self.score_percent < self.WEAK_THRESHOLD
