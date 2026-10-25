"""Reuse the single-lesson publisher for the two CAREER-03 replacements."""
from pathlib import Path

from .publish_career01_revision import Command as SingleLessonPublisher


class Command(SingleLessonPublisher):
    help = 'Version CAREER-03 only, preserving all old slides, evidence and sessions.'
    definition_path = Path(__file__).resolve().parents[2] / 'career03_revision.json'
    publication_action = 'career03_publication'
