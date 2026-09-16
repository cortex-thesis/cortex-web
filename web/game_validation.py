"""Deterministic game contracts and response checks independent of EEG state."""
import json


def validate_game(config):
    template = config.get("task_template")
    try:
        if template == "word_search":
            grid, targets = config["grid"], config["targets"]
            if not 6 <= len(grid) <= 9 or not 6 <= len(grid[0]) <= 9 or any(len(row) != len(grid[0]) for row in grid):
                return "Word hunts require a rectangular 6–9 cell grid."
            if any(not isinstance(letter, str) or len(letter) != 1 or not letter.isascii() or not letter.isupper() for row in grid for letter in row):
                return "Word hunt letters must be uppercase ASCII letters."
            if not targets or len({target["word"] for target in targets}) != len(targets):
                return "Word hunt targets must be nonempty and unique."
            for target in targets:
                word, cells = target["word"], target["cells"]
                if len(cells) != len(word) or len(word) < 2:
                    return "Word hunt path length must match its word."
                if any(type(r) is not int or type(c) is not int or not (0 <= r < len(grid) and 0 <= c < len(grid[0])) for r, c in cells):
                    return "Word hunt paths must be inside the grid."
                dr, dc = cells[1][0] - cells[0][0], cells[1][1] - cells[0][1]
                if (dr, dc) not in ((0, 1), (0, -1), (1, 0), (-1, 0)) or any([cells[0][0] + i * dr, cells[0][1] + i * dc] != cell for i, cell in enumerate(cells)):
                    return "Word hunt paths must be contiguous horizontal or vertical lines."
                if "".join(grid[r][c] for r, c in cells) != word:
                    return "Word hunt coordinates do not spell the target."
                occurrences = 0
                for r in range(len(grid)):
                    for c in range(len(grid[0])):
                        for rr, cc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                            path = [(r + i * rr, c + i * cc) for i in range(len(word))]
                            if all(0 <= y < len(grid) and 0 <= x < len(grid[0]) for y, x in path) and "".join(grid[y][x] for y, x in path) == word:
                                occurrences += 1
                if occurrences != 1:
                    return "Word hunt target must occur exactly once."
                followup = target.get("follow_up_question")
                if followup and followup["answer"] not in followup["choices"]:
                    return "Word hunt follow-up answer must be one of its choices."
        elif template in {"find_it", "audio_sequence", "shopping"}:
            items = config["items"]
            ids = {item["id"] for item in items}
            if not items or len(ids) != len(items):
                return "Game object IDs must be nonempty and unique."
            if template == "find_it":
                if not config["correct_item_ids"] or not set(config["correct_item_ids"]).issubset(ids):
                    return "Find-It targets must exist in the workspace."
            elif template == "audio_sequence":
                if not config["rounds"] or any(not round.get("direction") or not 2 <= len(round["correct_order"]) <= 3 or not set(round["correct_order"]).issubset(ids) for round in config["rounds"]):
                    return "Audio games require spoken 2–3 step rounds with valid object IDs."
                if any(config.get(field) for field in ("correct_order", "answer", "instruction")):
                    return "Audio games must not expose the answer in visible instruction fields."
            else:
                target = next(item for item in items if item["id"] == config["target_item_id"])
                if any(type(item["price"]) is not int or item["price"] <= 0 for item in items) or not any(payment >= target["price"] for payment in config["payment_options"]):
                    return "Shopping requires positive prices and sufficient payment."
    except (KeyError, TypeError, ValueError, IndexError, StopIteration):
        return "Malformed game configuration."
    return None


def evaluate_game(config, selected):
    """Return None for legacy templates; otherwise verify a complete successful response."""
    template = config.get("task_template")
    if template not in {"word_search", "find_it", "audio_sequence", "shopping"}:
        return None
    try:
        value = json.loads(selected)
        if template == "word_search":
            return sorted(value["found"]) == sorted(target["word"] for target in config["targets"]) and all(value.get("follow_ups", {}).get(target["word"]) == target["follow_up_question"]["answer"] for target in config["targets"] if target.get("follow_up_question"))
        if template == "find_it":
            picked = value["picked"]
            expected = config["correct_item_ids"]
            return len(picked) == len(set(picked)) and set(picked).issubset(expected) and (len(picked) >= config.get("minimum_selections", 1) if config.get("allow_subset") else set(picked) == set(expected))
        if template == "audio_sequence":
            rounds = value["rounds"]
            return len(rounds) == len(config["rounds"]) and all(response["round"] == index and response["picked"] == round["correct_order"] and (response.get("audio_played") or response.get("visual_prompt")) for index, (response, round) in enumerate(zip(rounds, config["rounds"])))
        item = next(item for item in config["items"] if item["id"] == config["target_item_id"])
        paid = value["paid"]
        given = config["given_change"] if paid == config["payment"] else paid - item["price"]
        return value["item"] == item["id"] and value["price"] == item["price"] and paid in config["payment_options"] and paid >= item["price"] and value["given"] == given and value["change"] == paid - item["price"] and value["verified"] is True
    except (ValueError, KeyError, TypeError, StopIteration):
        return False
