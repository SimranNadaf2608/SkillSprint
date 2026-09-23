import django_filters

from .models import RoadmapItem


class RoadmapItemFilter(django_filters.FilterSet):
    class Meta:
        model = RoadmapItem
        fields = {
            "plan": ["exact"],
            "status": ["exact"],
            "week_number": ["exact"],
            "is_review": ["exact"],
            "scheduled_date": ["exact", "gte", "lte"],
        }
