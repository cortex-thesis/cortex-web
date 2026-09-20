"""Create inbox records for actual account and learning events."""
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import JournalEntry, Notification, Profile, StudentBadge


@receiver(post_save, sender=StudentBadge)
def badge_notification(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        Notification.objects.create(recipient=instance.student, kind='achievement', title='New achievement earned',
                                    body=f'You earned the {instance.key} badge.', link='/student/profile')


@receiver(post_save, sender=JournalEntry)
def journal_notification(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    if instance.shared_with_teacher:
        Notification.objects.get_or_create(recipient=instance.session.school_class.teacher, kind='journal',
            title='A student shared a journal', link=f'/teacher/journals?entry={instance.pk}',
            defaults={'body': f'{instance.student.display_name} shared a journal for {instance.session.school_class.name}.'})


@receiver(post_save, sender=Profile)
def account_notification(sender, instance, created, raw=False, **kwargs):
    if not created or raw:
        return
    if instance.account_status == Profile.AccountStatus.PENDING:
        scope = Q(admin_scope=Profile.AdminScope.SUPER)
        if instance.school_id:
            scope |= Q(admin_scope=Profile.AdminScope.SCHOOL, school_id=instance.school_id)
        for admin in Profile.objects.filter(scope, role=Profile.Role.ADMIN, account_status=Profile.AccountStatus.ACTIVE):
            Notification.objects.create(recipient=admin, title='New account awaiting approval',
                body=f'{instance.display_name} registered as {instance.get_role_display()}.',
                link='/admin/requests' if admin.is_super_admin else '/school-admin/students' if instance.role == 'student' else '/school-admin/teachers')
