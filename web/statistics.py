"""Deterministic percentages; missing observations never become invented data."""
from decimal import Decimal, ROUND_FLOOR

STATES = ('focused', 'relaxed', 'distracted', 'overstimulated')


def percentages(counts, places=1):
    weights = {key: max(Decimal(str(value or 0)), Decimal(0)) for key, value in counts.items()}
    total = sum(weights.values())
    if not total:
        return {key: 0 for key in weights}
    scale = 10 ** places
    exact = {key: value * 100 * scale / total for key, value in weights.items()}
    units = {key: int(value.to_integral_value(rounding=ROUND_FLOOR)) for key, value in exact.items()}
    for key in sorted(weights, key=lambda key: exact[key] - units[key], reverse=True)[:100 * scale - sum(units.values())]:
        units[key] += 1
    return {key: value / scale for key, value in units.items()}


def sample_distribution(samples):
    from django.db.models import Count
    counts = dict.fromkeys(STATES, 0)
    for row in samples.filter(state__in=STATES, accepted_channels__gt=0).values('state').annotate(count=Count('pk')):
        counts[row['state']] = row['count']
    return percentages(counts), sum(counts.values())
