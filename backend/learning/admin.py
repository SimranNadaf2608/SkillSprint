from django.contrib import admin

from .models import LearningPlan, QuizAttempt, QuizQuestion, RoadmapItem, Skill, Topic, Track


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 0


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 0


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "created_at"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [SkillInline]


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ["name", "track", "order_index"]
    list_filter = ["track"]
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["name", "skill", "difficulty", "estimated_hours", "order_index"]
    list_filter = ["skill__track", "difficulty"]
    inlines = [QuizQuestionInline]


@admin.register(LearningPlan)
class LearningPlanAdmin(admin.ModelAdmin):
    list_display = ["user", "track", "current_level", "status", "current_streak", "created_at"]
    list_filter = ["status", "current_level", "track"]


@admin.register(RoadmapItem)
class RoadmapItemAdmin(admin.ModelAdmin):
    list_display = ["plan", "topic", "week_number", "scheduled_date", "status", "is_review", "is_weak"]
    list_filter = ["status", "is_review", "is_weak", "week_number"]


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ["topic", "question_text", "correct_option"]
    list_filter = ["topic__skill__track"]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ["plan", "topic", "score_percent", "taken_at"]
    list_filter = ["plan__track"]
