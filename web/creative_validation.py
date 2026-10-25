"""Bounded, server-validated evidence for Career/Enrichment creative experiences."""
import json

MODES = {'intro', 'gallery', 'map', 'collection', 'connect', 'work', 'story', 'order', 'art', 'sound', 'beat', 'compare', 'movement', 'wheel', 'participation', 'showcase'}
COLORS = ['#534ab7', '#1d7a65', '#cb5477', '#e5aa35', '#173b53']

def validate_experience(config):
    ex = config.get('experience')
    if not isinstance(ex, dict) or ex.get('mode') not in MODES:
        return 'A supported creative experience is required.'
    mode = ex['mode']
    for key in ('items', 'stations', 'categories', 'scenes'):
        rows = ex.get(key, [])
        if not isinstance(rows, list) or len(rows) > 12 or any(not isinstance(r, dict) or not isinstance(r.get('id'), str) or not r.get('label') for r in rows) or len({r['id'] for r in rows}) != len(rows):
            return 'Creative objects require unique IDs and readable labels.'
    ids = {r['id'] for r in ex.get('items', [])}
    if mode in ('gallery', 'collection', 'order', 'sound', 'movement', 'wheel', 'participation') and not ids:
        return 'This experience needs objects.'
    if mode in ('map', 'work', 'connect') and not ex.get('stations'):
        return 'This experience needs destinations.'
    if mode == 'collection' and not ex.get('categories'):
        return 'A collection needs reflection categories.'
    if mode == 'order' and (set(ex.get('order', [])) != ids or len(ex['order']) != len(ids)):
        return 'The taught sequence must reference every object once.'
    if mode == 'connect':
        destinations = {r['id'] for r in ex['stations']}
        links = ex.get('links', {})
        if set(links) != ids or any(not targets or len(targets) != len(set(targets)) or not set(targets) <= destinations for targets in links.values()):
            return 'Connections must reference valid skills and destinations.'
    if mode == 'work' and any(not all(r.get(k) for k in ('tool', 'distractor', 'action', 'before', 'after')) or r['tool'] == r['distractor'] for r in ex['stations']):
        return 'Work stations require tools and visible action outcomes.'
    if mode == 'story':
        scenes = {r['id']: r for r in ex.get('scenes', [])}
        if ex.get('start') not in scenes or not any(not r.get('choices') for r in scenes.values()):
            return 'A story needs an opening and a terminal scene.'
        for row in scenes.values():
            choices = row.get('choices', [])
            if not row.get('state') or not isinstance(choices, list) or len(choices) > 4 or len({c.get('id') for c in choices}) != len(choices) or any(not c.get('label') or c.get('next') not in scenes for c in choices):
                return 'Story choices must lead to real illustrated scenes.'
    return None


def evaluate_experience(config, selected):
    try:
        if validate_experience(config): return False
        ex = config['experience']; mode = ex['mode']
        value = json.loads(selected)
        if not isinstance(value, dict) or value.get('version') != config.get('content_version'): return False
        ids = {r['id'] for r in ex.get('items', [])}
        def unique(values, valid, minimum=1, maximum=12):
            return isinstance(values, list) and minimum <= len(values) <= maximum and all(isinstance(x, str) for x in values) and len(values) == len(set(values)) and set(values) <= valid
        if mode in ('intro', 'showcase'): return value.get('reviewed') is True and unique(value.get('reflection', []), ids, 0)
        if mode in ('map', 'gallery', 'wheel', 'sound'):
            valid = {r['id'] for r in ex.get('stations', [])} if mode == 'map' else ids
            return unique(value.get('visited'), valid)
        if mode == 'participation': return value.get('route') in ids
        if mode == 'collection':
            categories = {r['id'] for r in ex['categories']}; picks = value['selections']
            return isinstance(picks, dict) and set(picks) == categories and all(unique(v, ids | {'unsure', 'decline'}) and (not set(v) & {'unsure', 'decline'} or len(v) == 1) for v in picks.values())
        if mode == 'connect':
            links = value['links']
            return isinstance(links, dict) and set(links) == set(ex['links']) and all(unique(links[k], set(targets), len(targets)) and set(links[k]) == set(targets) for k, targets in ex['links'].items())
        if mode == 'work':
            station = next(r for r in ex['stations'] if r['id'] == value.get('station'))
            return value.get('tool') == station['tool'] and value.get('applied') is True
        if mode == 'story':
            scenes = {r['id']: r for r in ex['scenes']}; current = ex['start']; path = value['path']
            if not isinstance(path, list) or not 1 <= len(path) <= 16: return False
            for step in path:
                if step['scene'] != current: return False
                current = next(c['next'] for c in scenes[current]['choices'] if c['id'] == step['choice'])
            return not scenes[current].get('choices')
        if mode == 'order': return value.get('order') == ex['order']
        if mode == 'movement':
            order = value.get('order')
            return isinstance(order, list) and len(order) == 3 and all(isinstance(x, str) and x in ids for x in order) and value.get('route') in ('seated', 'standing', 'point', 'observe')
        if mode == 'art':
            objects = value['objects']
            return value.get('background') in ('paper', 'sky', 'garden') and isinstance(objects, list) and len(objects) <= 12 and (bool(objects) or value.get('blank') is True) and all(isinstance(r, dict) and type(r.get('id')) is int and r.get('shape') in ('circle', 'square', 'triangle', 'star') and r.get('color') in COLORS and type(r.get('x')) is int and 0 <= r['x'] <= 4 and type(r.get('y')) is int and 0 <= r['y'] <= 2 for r in objects) and len({r['id'] for r in objects}) == len(objects)
        if mode == 'beat':
            grid = value['grid']
            return value.get('tempo') in (60, 80, 100) and isinstance(grid, list) and len(grid) == 2 and all(isinstance(row, list) and len(row) == 4 and all(type(cell) is bool for cell in row) for row in grid) and (any(any(row) for row in grid) or value.get('rest') is True)
        if mode == 'compare': return unique(value.get('explored'), {'soft', 'louder', 'slow', 'faster'}, 2)
    except (ValueError, KeyError, TypeError, StopIteration, AttributeError):
        return False
    return False
