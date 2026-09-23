"""Roadmap generation and adaptive re-planning.

This is the "interesting part" of SkillSprint: given a track, a pace
(hours/day) and duration, generate a week-by-week roadmap, then keep it
honest as the learner actually progresses — pulling it forward when
they're ahead, compressing it when they fall behind, and slotting in
review items for topics they scored weak on in quizzes.
"""

from datetime import timedelta

from django.utils import timezone

from .models import QuizAttempt, RoadmapItem, Topic

FOUNDATIONAL_SKILL_COUNT = 2

# For non-beginners, skip the easiest topics in the first couple of
# (foundational) skills of the track — they likely already know the basics.
LEVEL_SKIP_DIFFICULTY = {
    "beginner": set(),
    "intermediate": {"easy"},
    "advanced": {"easy", "medium"},
}


def _eligible_topics(plan):
    skills = list(plan.track.skills.order_by("order_index", "id"))
    skip_difficulties = LEVEL_SKIP_DIFFICULTY.get(plan.current_level, set())
    foundational_ids = {s.id for s in skills[:FOUNDATIONAL_SKILL_COUNT]}

    topics = []
    for skill in skills:
        for topic in skill.topics.order_by("order_index", "id"):
            if skill.id in foundational_ids and topic.difficulty in skip_difficulties:
                continue
            topics.append(topic)
    return topics


def generate_roadmap(plan):
    """Build the full week-by-week roadmap for a freshly created plan."""
    plan.roadmap_items.all().delete()
    topics = _eligible_topics(plan)
    total_weeks = max(1, plan.total_weeks)
    weekly_capacity = max(plan.hours_per_day, 0.5) * 7

    weeks = [[] for _ in range(total_weeks)]
    week_idx = 0
    week_hours = 0.0
    for topic in topics:
        if week_hours + topic.estimated_hours > weekly_capacity and weeks[week_idx]:
            if week_idx < total_weeks - 1:
                week_idx += 1
                week_hours = 0.0
        weeks[week_idx].append(topic)
        week_hours += topic.estimated_hours

    items = []
    order = 0
    for w, week_topics in enumerate(weeks, start=1):
        if not week_topics:
            continue
        week_start = plan.started_at + timedelta(weeks=w - 1)
        # Load-balance topics across the 7 days of the week by estimated hours.
        day_hours = [0.0] * 7
        day_assignment = []
        for topic in week_topics:
            day = min(range(7), key=lambda d: day_hours[d])
            day_hours[day] += topic.estimated_hours
            day_assignment.append((topic, day))
        day_assignment.sort(key=lambda pair: pair[1])
        for topic, day in day_assignment:
            items.append(
                RoadmapItem(
                    plan=plan,
                    topic=topic,
                    week_number=w,
                    scheduled_date=week_start + timedelta(days=day),
                    order_index=order,
                )
            )
            order += 1
    RoadmapItem.objects.bulk_create(items)
    return plan.roadmap_items.all()


def _reschedule(pending_items, start_date, pace_multiplier):
    """Shift a list of pending items, compressing/expanding the gaps between
    them by `pace_multiplier` (< 1 pulls the schedule forward/tighter,
    > 1 spreads it out) starting from `start_date`."""
    if not pending_items:
        return
    base_date = min(item.scheduled_date for item in pending_items)
    for item in pending_items:
        offset_days = (item.scheduled_date - base_date).days
        new_offset = max(0, round(offset_days * pace_multiplier))
        item.scheduled_date = start_date + timedelta(days=new_offset)
    RoadmapItem.objects.bulk_update(pending_items, ["scheduled_date"])


def insert_weak_reviews(plan):
    """Insert review roadmap items for topics with a weak (<70%) quiz score
    that don't already have a pending review scheduled."""
    weak_topic_ids = set(
        QuizAttempt.objects.filter(plan=plan, score_percent__lt=QuizAttempt.WEAK_THRESHOLD)
        .values_list("topic_id", flat=True)
        .distinct()
    )
    already_reviewing = set(
        plan.roadmap_items.filter(is_review=True, status__in=["pending", "in_progress"]).values_list(
            "topic_id", flat=True
        )
    )
    to_review = sorted(weak_topic_ids - already_reviewing)
    if not to_review:
        return []

    today = timezone.localdate()
    last_item = plan.roadmap_items.order_by("-week_number").first()
    week_number = last_item.week_number if last_item else 1
    order = plan.roadmap_items.count()

    created = []
    for i, topic_id in enumerate(to_review):
        created.append(
            RoadmapItem(
                plan=plan,
                topic_id=topic_id,
                week_number=week_number,
                scheduled_date=today + timedelta(days=i),
                order_index=order + i,
                is_review=True,
                is_weak=True,
            )
        )
    RoadmapItem.objects.bulk_create(created)
    return created


def replan(plan):
    """Dynamically adjust the remaining roadmap based on completed-vs-expected
    pace, and slot in review items for weak topics. Returns a small summary
    dict describing what was adjusted."""
    today = timezone.localdate()
    pending_qs = plan.roadmap_items.filter(status=RoadmapItem.Status.PENDING, is_review=False)
    total_core = plan.roadmap_items.filter(is_review=False).count()
    completed_core = plan.roadmap_items.filter(is_review=False, status=RoadmapItem.Status.COMPLETED).count()

    elapsed_days = max(1, (today - plan.started_at).days)
    total_days = max(1, plan.total_weeks * 7)
    expected_ratio = min(1.0, elapsed_days / total_days)
    actual_ratio = (completed_core / total_core) if total_core else 0.0

    pace = "on_track"
    pending_items = list(pending_qs)
    if pending_items:
        if actual_ratio > expected_ratio + 0.08:
            pace = "ahead"
            _reschedule(pending_items, start_date=today, pace_multiplier=0.8)
        elif actual_ratio < expected_ratio - 0.08:
            pace = "behind"
            _reschedule(pending_items, start_date=today, pace_multiplier=1.2)

    reviews = insert_weak_reviews(plan)
    return {
        "pace": pace,
        "expected_progress": round(expected_ratio * 100, 1),
        "actual_progress": round(actual_ratio * 100, 1),
        "reviews_added": len(reviews),
    }


def build_dashboard(plan):
    """Aggregate everything the dashboard page needs in one call."""
    from .serializers import QuizAttemptSerializer, RoadmapItemSerializer, TopicMiniSerializer

    items = plan.roadmap_items.select_related("topic", "topic__skill")
    core_items = items.filter(is_review=False)
    total = core_items.count()
    completed = core_items.filter(status=RoadmapItem.Status.COMPLETED).count()
    progress_percent = round((completed / total) * 100, 1) if total else 0.0

    today = timezone.localdate()
    todays_tasks = items.filter(scheduled_date=today).exclude(status=RoadmapItem.Status.SKIPPED)
    upcoming_tasks = items.filter(
        scheduled_date__gt=today, status=RoadmapItem.Status.PENDING
    ).order_by("scheduled_date")[:6]
    overdue_count = items.filter(scheduled_date__lt=today, status=RoadmapItem.Status.PENDING).count()

    weak_topics = Topic.objects.filter(
        quiz_attempts__plan=plan, quiz_attempts__score_percent__lt=QuizAttempt.WEAK_THRESHOLD
    ).distinct()
    recent_attempts = plan.quiz_attempts.select_related("topic").order_by("-taken_at")[:5]

    return {
        "progress_percent": progress_percent,
        "completed_topics": completed,
        "total_topics": total,
        "current_streak": plan.current_streak,
        "longest_streak": plan.longest_streak,
        "overdue_count": overdue_count,
        "target_end_date": plan.target_end_date,
        "todays_tasks": RoadmapItemSerializer(todays_tasks, many=True).data,
        "upcoming_tasks": RoadmapItemSerializer(upcoming_tasks, many=True).data,
        "weak_topics": TopicMiniSerializer(weak_topics, many=True).data,
        "recent_quiz_attempts": QuizAttemptSerializer(recent_attempts, many=True).data,
    }
