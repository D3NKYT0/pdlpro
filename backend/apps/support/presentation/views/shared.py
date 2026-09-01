from datetime import timedelta

from django.utils import timezone


SLA_HOURS = {"low": 72, "normal": 48, "high": 24, "urgent": 8}


def user_name(user) -> str:
    if not user:
        return "Sistema"
    return user.display_name or user.username


def serialize_message(message):
    return {
        "id": str(message.id),
        "body": message.body,
        "author_name": user_name(message.author),
        "is_staff_reply": message.is_staff_reply,
        "is_internal": message.is_internal,
        "created_at": message.created_at,
    }


def serialize_ticket(ticket, *, detail=False, staff=False):
    due_at = ticket.created_at + timedelta(hours=SLA_HOURS.get(ticket.priority, 48))
    payload = {
        "id": str(ticket.id),
        "protocol": ticket.protocol,
        "subject": ticket.subject,
        "description": ticket.description,
        "category": ticket.category,
        "category_label": ticket.get_category_display(),
        "priority": ticket.priority,
        "priority_label": ticket.get_priority_display(),
        "status": ticket.status,
        "status_label": ticket.get_status_display(),
        "context": ticket.context,
        "assigned_to": user_name(ticket.assigned_to) if ticket.assigned_to else "Equipe PDL",
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "last_activity_at": ticket.last_activity_at,
        "first_response_at": ticket.first_response_at,
        "resolved_at": ticket.resolved_at,
        "closed_at": ticket.closed_at,
        "sla_due_at": due_at,
        "sla_breached": timezone.now() > due_at and ticket.status not in {"resolved", "closed"},
    }
    if staff:
        payload["customer"] = {
            "id": str(ticket.user.id),
            "username": ticket.user.username,
            "display_name": user_name(ticket.user),
            "email": ticket.user.email,
        }
    if detail:
        messages = ticket.messages.all()
        if not staff:
            messages = messages.filter(is_internal=False)
        payload["messages"] = [serialize_message(row) for row in messages]
    else:
        payload["message_count"] = ticket.messages.filter(is_internal=False).count()
    return payload

