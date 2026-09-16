"""Scoped practice upgrades; retain slide purposes/positions and official competencies."""
from copy import deepcopy
from random import Random


def puzzle(words):
    from .game_validation import validate_game
    rng = Random("word-hunt:" + ":".join(words))
    size = 8
    for attempt in range(500):
        grid = [[None for _ in range(size)] for _ in range(size)]
        targets = []
        for index, word in enumerate(words):
            dr, dc = [(0, 1), (1, 0), (0, -1), (-1, 0)][index % 4]
            candidates = []
            for row in range(size):
                for col in range(size):
                    cells = [[row + dr * step, col + dc * step] for step in range(len(word))]
                    if all(0 <= r < size and 0 <= c < size and grid[r][c] in (None, letter) for (r, c), letter in zip(cells, word)):
                        candidates.append(cells)
            if not candidates:
                break
            cells = rng.choice(candidates)
            for (r, c), letter in zip(cells, word):
                grid[r][c] = letter
            targets.append({"word": word, "display_label": word, "cells": cells})
        if len(targets) != len(words):
            continue
        grid = [[letter or rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ") for letter in row] for row in grid]
        result = {"grid": grid, "targets": targets}
        if validate_game({"task_template": "word_search", **result}) is None:
            return result
    raise ValueError("Could not build an unambiguous word hunt")


def mix_choices(config, seed):
    """Stable per-slide presentation, independent of answer keys and EEG state."""
    rng = Random(seed)
    for key in ("items", "choices", "pairs", "payment_options", "change_options"):
        if isinstance(config.get(key), list):
            rng.shuffle(config[key])
    for target in config.get("targets", []):
        if target.get("follow_up_question"):
            mix_choices(target["follow_up_question"], seed + target["word"])


def upgrade(definitions):
    for lesson in definitions:
        slides = lesson["slides"]
        lid = lesson["lesson_id"]

        def change(index, title, template, evidence="supporting", **data):
            old = slides[index]["configuration"]
            kept = {key: old[key] for key in ("lesson_id", "instructional_purpose", "adaptive_delivery")}
            slides[index] = {"title": title, "type": "interactive", "configuration": kept | {
                "task_template": template, "evidence_role": evidence,
                "correct_feedback": "You completed the activity.",
                "retry_feedback": "Look again and try another choice.",
                "layout": {"size": "wide", "preferred_columns": 3},
            } | data}
            return slides[index]["configuration"]

        def hunt(index, title, words, **data):
            return change(index, title, "word_search", question="Find the words. Tap the first and last letter, or drag across them.", **puzzle(words), **data)

        def objects(labels):
            symbols = {"bag": "backpack", "clock": "clock", "notebook": "notebook", "ruler": "ruler", "eraser": "eraser", "red-folder": "folder-red", "blue-folder": "folder-blue"}
            return [{"id": ident, "label": label, **({"symbol": symbols[ident]} if ident in symbols else {})} for ident, label in labels]

        if lid == "CARE-01":
            hunt(1, "Handwashing Word Hunt", ["SOAP", "WATER", "RINSE", "DRY"])
            materials = deepcopy(slides[2]["configuration"])
            change(2, "Get Ready to Wash", "find_it", question="Find the things you need for handwashing.", workspace_label="Wash area", items=materials["items"] + objects([("comb", "Comb"), ("toothbrush", "Toothbrush")]), correct_item_ids=["water", "soap", "drying"], correct_feedback=materials["correct_feedback"], retry_feedback="Choose the things used to wash and dry hands.")
            slides[5]["title"] = "Build the Routine"
            slides[5]["configuration"].update(evidence_role="supporting", retry_feedback="Think about what comes before rinsing.")
            change(6, "What Comes Next?", "picture_choice", question="The hands already have soap. What should happen next?", image_url="/assets/care/care-01/apply-soap.png", items=objects([("rub", "Rub hands"), ("dry", "Dry hands"), ("pencil", "Pencil")]), correct_item_ids=["rub"], correct_feedback="Yes. Rub the soap over your hands before rinsing.", retry_feedback="Think about what happens between applying soap and rinsing.")
            slides[6]["configuration"]["items"][0]["image_url"] = "/assets/care/care-01/rub-thoroughly.png"
            slides[6]["configuration"]["items"][1]["image_url"] = "/assets/care/care-01/dry-hands.png"
            slides[7]["configuration"]["evidence_role"] = "supporting"

        elif lid == "CARE-02":
            change(4, "Flip and Match Foods", "memory_flip", question="Flip two cards. Match a food picture with its Go, Grow, or Glow job.", hide_image_labels=True, pairs=[
                {"id": "rice", "left": {"id": "rice", "label": "Rice"}, "right": {"id": "go", "label": "GO: gives energy for studying, playing, and moving."}},
                {"id": "egg", "left": {"id": "egg", "label": "Egg"}, "right": {"id": "grow", "label": "GROW: helps build and maintain the body."}},
                {"id": "banana", "left": {"id": "banana", "label": "Banana"}, "right": {"id": "glow", "label": "GLOW: fruits and vegetables help keep the body healthy."}},
            ], correct_feedback="You matched the foods to their jobs.", retry_feedback="Think about each food's group in the reading.")
            slides[5]["configuration"].update(evidence_role="primary_digital", immediate_feedback=True)
            hunt(6, "Healthy Food Word Hunt", ["RICE", "FISH", "EGG", "MILK", "MANGO"])
            lunch = objects([("rice", "Rice"), ("egg", "Egg"), ("banana", "Banana"), ("water", "Water"), ("candy", "Sugary candy"), ("softdrink", "Sugary soft drink"), ("snack", "Packaged salty snack")])
            change(7, "Pack a Healthful Lunch", "find_it", "primary_digital", question="Choose healthful foods and a drink for the lunchbox.", workspace_label="Lunchbox", items=lunch, correct_item_ids=["rice", "egg", "banana", "water"], minimum_selections=2, allow_subset=True, correct_feedback="You packed healthful choices for lunch.", retry_feedback="Look again. Which choices better support a healthful lunch?")
            change(8, "Choose a Drink", "picture_choice", "primary_digital", question="You need a drink with lunch. Which is the more healthful choice?", items=objects([("water", "Water"), ("softdrink", "Sugary soft drink")]), correct_item_ids=["water"], correct_feedback="Water is the more healthful choice here.", retry_feedback="Look again. Compare the drinks and their added sugar.")

        elif lid == "CARE-03":
            hunt(6, "Grooming Word Hunt", ["COMB", "TOWEL", "BRUSH"])
            brush = slides[6]["configuration"]["targets"][-1]
            brush.update(display_label="BRUSH (toothbrush)", reveal_image="/assets/care/care-03/toothbrush.png")
            slides[5]["title"] = "Match the Tool"
            slides[5]["configuration"]["evidence_role"] = "primary_digital"
            slides[5]["configuration"]["hide_image_labels"] = True
            slides[1]["title"] = "What Tool Do I Need?"
            slides[1]["configuration"]["evidence_role"] = "primary_digital"
            slides[7]["configuration"]["evidence_role"] = "primary_digital"
            change(8, "Pack the Grooming Kit", "find_it", "primary_digital", question="Choose the items that belong in a grooming kit.", workspace_label="Grooming bag", items=objects([("comb", "Comb"), ("toothbrush", "Toothbrush"), ("clipper", "Nail clipper"), ("towel", "Towel"), ("pencil", "Pencil"), ("book", "Book")]), correct_item_ids=["comb", "toothbrush", "clipper", "towel"], correct_feedback="You packed materials for grooming.", retry_feedback="Think about which items care for hair, teeth, nails, and drying.")

        elif lid == "LIFE-01":
            change(4, "Listen, Remember, Do", "audio_sequence", "primary_digital", question="Listen to the story. Choose what is needed, in order.", items=objects([("pencil", "Pencil"), ("notebook", "Notebook"), ("eraser", "Eraser"), ("ruler", "Ruler"), ("book", "Book"), ("bag", "School bag")]), rounds=[{"direction": "Mia wants to write in her notebook, but it is still closed. Once it is open, she needs something to write with. Which two things will she use, in order?", "correct_order": ["notebook", "pencil"]}, {"direction": "Leo made a mistake in his drawing. He wants to remove the mark, draw a straight line, and put his work away for the trip home. Which three things will help him, in order?", "correct_order": ["eraser", "ruler", "bag"]}], correct_feedback="Your choices fit the story.", retry_feedback="Listen again. What does the character need to do first?")
            symbols = [{"id": value, "label": label, "symbol": symbol} for value, label, symbol in [("star", "Star", "★"), ("circle", "Circle", "●"), ("triangle", "Triangle", "▲"), ("two", "Two", "2"), ("three", "Three", "3"), ("blue", "Blue", "🔵"), ("green", "Green", "🟢")]]
            change(5, "Unlock the Code", "audio_sequence", "primary_digital", question="Listen to the code, then tap the symbols.", items=symbols, rounds=[{"direction": "Listen to the secret code. Star, circle.", "correct_order": ["star", "circle"]}, {"direction": "Listen carefully. Green, star, three.", "correct_order": ["green", "star", "three"]}, {"direction": "Your code is: triangle, two, blue.", "correct_order": ["triangle", "two", "blue"]}], correct_feedback="Code unlocked!", retry_feedback="Not quite. Listen to the code again.")
            change(6, "Classroom Stories", "audio_sequence", "primary_digital", question="Which objects solve the story? Choose them in order.", workspace_label="Classroom desk", items=objects([("pencil", "Pencil"), ("book", "Book"), ("bag", "School bag"), ("notebook", "Notebook"), ("ruler", "Ruler"), ("red-folder", "Red folder"), ("blue-folder", "Blue folder"), ("clock", "Clock")]), rounds=[{"direction": "Ana needs to check the time before reading a story. Which object shows the time, and which one holds the story? Choose them in that order.", "correct_order": ["clock", "book"]}, {"direction": "Ben keeps his drawing paper in the blue folder. He takes it out, measures a line, and packs up to go home. Which three objects does he need, in order?", "correct_order": ["blue-folder", "ruler", "bag"]}, {"direction": "Sara wants to write a note and carry it home. First she opens the place where she writes her notes. Next she gets something to write with. Finally she packs her work. Which three objects does she need, in order?", "correct_order": ["notebook", "pencil", "bag"]}], correct_feedback="You worked out what the story needed.", retry_feedback="Listen again. Think about each problem in the story.")

        elif lid == "LIFE-02":
            # Existing sign meanings and safe-response checks remain primary.
            pairs = deepcopy(slides[3]["configuration"]["pairs"])
            hunt(3, "Safety Word Hunt", ["STOP", "EXIT", "WALK", "SAFE"])
            checks = {
                "STOP": ("/assets/life/life-02/stop-sign.png", "What does this sign tell you?", ["Stop before proceeding", "Keep going without checking"], "Stop before proceeding"),
                "EXIT": ("/assets/life/life-02/emergency-exit.png", "What is this sign showing us?", ["Way out during an emergency", "A place to wait"], "Way out during an emergency"),
            }
            for target in slides[3]["configuration"]["targets"]:
                if target["word"] in checks:
                    image, question, choices, answer = checks[target["word"]]
                    target.update(reveal_image=image, follow_up_question={"question": question, "choices": choices, "answer": answer})
            change(4, "Match Signs to Meanings", "matching_pairs", "primary_digital", question="Match each sign picture with its meaning.", pairs=pairs + [{"id": "stop", "left": {"id": "stop-sign", "label": "Stop", "image_url": "/assets/life/life-02/stop-sign.png"}, "right": {"id": "stop-meaning", "label": "Stop before proceeding"}}], hide_image_labels=True, correct_feedback="You matched the signs to their meanings.", retry_feedback="Look at the sign again. What is it telling you?")
            # Retain existing image-based safety decisions.
            for index in (5, 6):
                slides[index]["configuration"]["evidence_role"] = "primary_digital"

        elif lid == "LIFE-03":
            store_items = objects([("notebook", "Notebook"), ("pencil", "Pencil"), ("water", "Water"), ("banana", "Banana")])
            for item, price in zip(store_items, [15, 8, 10, 12]):
                item["price"] = price
                if item["id"] == "notebook":
                    item["image_url"] = "/assets/pre-vocational/common/product.png"
                    item["label"] = "Boxed classroom item"
            money_items = [{"id": str(amount), "label": f"₱{amount}", "price": amount, "image_url": f"/assets/life/life-03/{filename}"} for amount, filename in [(1, "one-peso-coin-transparent.png"), (5, "five-peso-coin-transparent.png"), (10, "ten-peso-coin-transparent.png"), (20, "twenty-peso-coin.png")]]
            def shop(index, title, target, price, payment, given):
                change(index, title, "shopping", "primary_digital", question="Find the requested item, check its price, pay, and check your change.", items=deepcopy(store_items), money_items=money_items, target_item_id=target, payment_options=[1, 5, 10, 20], payment=payment, given_change=given, change_options=sorted({3, 5, payment - price}), correct_feedback="You checked the price, paid, and checked your change.", retry_feedback="Check the price and the amount paid again.")
            shop(0, "Cortex Mini Store", "notebook", 15, 20, 5)
            slides[3]["configuration"]["evidence_role"] = "supporting"
            slides[4]["title"] = "Match Price to Payment"
            change(4, "Match Price to Payment", "matching_pairs", question="Match each price to the exact payment. No change is needed.", pairs=[{"id": item["id"], "left": {"id": "price-" + item["id"], "label": "Price: " + item["label"]}, "right": item} for item in money_items])
            shop(5, "Buy What You Need", "pencil", 8, 10, 2)
            slides[5]["configuration"]["change_options"] = [1, 2, 5]
            slides[6]["configuration"]["evidence_role"] = "primary_digital"
            shop(7, "Check Your Change", "banana", 12, 20, 3)

        for index, slide in enumerate(slides):
            config = slide["configuration"]
            if config.get("task_template"):
                mix_choices(config, f"{lid}:{index}:choices")
                config.setdefault("evidence_role", "supporting")
                config["digital_mastery_claim"] = False
