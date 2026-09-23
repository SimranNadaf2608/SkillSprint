from rest_framework import permissions


class IsPlanOwner(permissions.BasePermission):
    """Object-level permission: only the plan's owner may view/edit it."""

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class IsRoadmapItemOwner(permissions.BasePermission):
    """Object-level permission: only the owning plan's user may touch this item."""

    def has_object_permission(self, request, view, obj):
        return obj.plan.user_id == request.user.id
