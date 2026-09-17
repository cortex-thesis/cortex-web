"""Content-driven PREV-01 discovery studio. No aptitude/career inference."""
from .care_lessons import ADAPTATION_POLICY
from .lesson_games import mix_choices

OFFICIAL = {
    "competency": "Identify individual learner’s capabilities, interests, talents and skills",
    "content_standard": "The learner… Demonstrates understanding of the underlying concept and principles of assessing one’s personal strengths, talents, abilities and skills",
    "performance_standard": "The learner… Recognizes individual talents, skills, abilities and strengths",
}
ACTIVITIES = [
    ("gardening", "Gardening"), ("cooking", "Food preparation"), ("computer", "Using a computer"),
    ("drawing", "Drawing or design"), ("music", "Music"), ("sports", "Sports"),
    ("organizing", "Organizing materials"), ("helping", "Helping people"),
    ("household", "Help with household tasks"), ("building", "Building or repair"),
    ("other", "Something else"), ("unsure", "I'm not sure yet"),
]


def items():
    visuals = {"sports": "/assets/care/care-01/ball.png", "building": "/assets/pre-vocational/common/repair.png"}
    return [{"id": key, "label": label, **({"image_url": visuals[key]} if key in visuals else {})} for key, label in ACTIVITIES]


def build():
    slides = []

    def screen(key, title, kind="image", **config):
        config.update(screen_key=key, lesson_id="PREV-01", adaptive_delivery=ADAPTATION_POLICY,
                      instructional_purpose=key, digital_mastery_claim=False,
                      layout={"size": "wide", "preferred_columns": 3})
        if kind == "interactive":
            config.setdefault("correct_feedback", "Your choices are saved as self-report.")
            config.setdefault("retry_feedback", "Look at the clue again. You can try another choice.")
            config.setdefault("evidence_role", "primary_digital" if config.get("scored", True) else "self_report")
            mix_choices(config, "PREV-01:" + key)
        slides.append({"type": kind, "title": title, "configuration": config})

    def discussion(key, title, text, narration, examples=None):
        screen(key, title, template="visual_narrative", discussion=True, narration_script=narration,
               content_description="", steps=[{"id": key, "title": title, "description": text}] + (examples or []))

    discussion("orientation", "Discover Myself",
               "People have different interests, talents, skills, and capabilities. Knowing yourself can help you discover activities to learn, practice, and explore.",
               "People have different interests, talents, skills, and capabilities. You may enjoy some activities more than others. You may already know how to do some things, while other skills are still developing. In this lesson, you will explore what you enjoy, what you can do, and what you may want to practice.")
    discussion("hook", "Different People, Different Activities",
               "People enjoy and learn different things. Enjoying an activity does not mean you already know how to do it.",
               "People enjoy and learn different things. Someone may enjoy drawing and still be learning to draw. Someone else may be able to organize materials but want to explore music. We do not need to have the same interests or abilities.",
               [{"id": "drawing", "title": "Drawing or design", "description": "Enjoy creating; keep learning."},
                {"id": "organizing", "title": "Organizing materials", "description": "Learn to arrange and label."}])
    discussion("interest", "What Is an Interest?",
               "An interest is something you enjoy or want to know more about. You can have more than one interest.",
               "An interest is something you enjoy or want to know more about. You might enjoy cooking, gardening, using computers, making music, playing sports, creating art, organizing things, or helping others. People can have different interests, and interests can change as we discover new activities.",
               [{"id": "gardening", "title": "Gardening", "description": "Enjoy learning about plants."},
                {"id": "music", "title": "Music", "description": "Want to explore sounds and rhythm."}])
    screen("interests", "What Interests You?", "interactive", task_template="discovery_board",
           question="Choose activities you enjoy or would like to explore. Not sure yet is okay.", items=items(),
           categories=[{"id": "enjoy", "label": "Activities I enjoy or want to explore"}], self_report_fields={"enjoy": "selfReportedInterests"},
           scored=False, assessment_metadata={"scored": False},
           correct_feedback="You recorded what you enjoy or want to explore.")
    discussion("skill", "What Is a Skill?",
               "A skill is something you have learned or are learning to do. Skills can improve with practice, experience, and support.",
               "A skill is something you have learned or are learning to do. Skills can develop through practice, experience, and support. For example, someone may learn to prepare food, use a computer, organize materials, care for plants, draw, or follow instructions. We do not have to know how to do everything. Skills can continue to develop.",
               [{"id": "computer", "title": "Using a computer", "description": "Learning to create and save a document."}])
    def clue(text, answer, explanation, choices):
        return {"clue": text, "choices": choices, "answer": answer, "feedback": explanation}
    def classifier(key, title, rounds):
        for index, row in enumerate(rounds):
            mix_choices(row, key + str(index))
        screen(key, title, "interactive", task_template="scenario_classifier", question="Which idea does each fictional clue emphasize?", scenarios=rounds,
               scored=True, correct_feedback="You identified the concepts in these examples.", retry_feedback="What is the clue emphasizing: enjoyment, learning, or being able to do something?")
    classifier("classification", "Interest or Skill?", [
        clue("I enjoy learning about plants.", "Interest", "This tells us what the person enjoys exploring.", ["Interest", "Skill"]),
        clue("I can water plants using the steps I learned.", "Skill", "This describes something the person has learned to do.", ["Interest", "Skill"]),
        clue("I like learning how computers work.", "Interest", "The clue emphasizes curiosity and enjoyment.", ["Interest", "Skill"]),
        clue("I can create and save a document on a computer.", "Skill", "This example describes a learned computer skill.", ["Interest", "Skill"]),
        clue("I enjoy preparing food with my family.", "Interest", "The clue describes enjoyment, not verified performance.", ["Interest", "Skill"]),
        clue("I can measure ingredients using the tools I learned to use.", "Skill", "The clue describes a learned measuring skill.", ["Interest", "Skill"]),
    ])
    discussion("talent", "What Is a Talent?",
               "A talent is an ability that a person may do well and continue to develop. Talents can grow through practice and experience.",
               "A talent is an ability that a person may do well and continue to develop. People may notice talents in different activities, such as music, art, sports, working with tools, organizing, or other areas. Practice and experience can help people continue developing their abilities.")
    discussion("capability", "What Is a Capability?",
               "A capability is something you are able to do. You may do it independently or with appropriate support.",
               "A capability is something you are able to do. Some activities can be done independently. Other activities may be completed with instructions, tools, practice, or support. Receiving support does not mean the activity is not a capability.")
    concepts = [
        {"id": "interest", "title": "Interest", "description": "What I enjoy or want to explore."},
        {"id": "skill", "title": "Skill", "description": "Something I learned or am learning to do."},
        {"id": "talent", "title": "Talent", "description": "An ability I may do well and continue to develop."},
        {"id": "capability", "title": "Capability", "description": "Something I am able to do, with or without support."},
    ]
    screen("concepts", "Remember the Difference", template="visual_narrative", discussion=True, steps=concepts,
           content_description="Real activities can fit more than one concept. Practice clues emphasize one idea.",
           narration_script="Interest is about what you enjoy or want to explore. A skill is something you have learned or are learning to do. A talent is an ability you may do well and continue to develop. A capability is something you are able to do, with or without appropriate support.")
    screen("video", "See It in Real Life", "video", template="instructional_video", media_url="https://www.youtube.com/embed/JwNI1F21eK8",
           content_label="Interests, talents, and skills", content_description="Watch, then reflect on what you noticed.",
           video_optional=True, video_status="user_supplied_pending_expert_validation",
           validation_note="Review with Cortex Research Team and Panorama/SPED before production use.",
           search_terms=["strengths interests talents and skills for students", "difference between interests talents and skills for students", "talento kakayahan at interes ng mag-aaral"])
    screen("video-reflection", "What Did You Notice?", "interactive", task_template="discovery_board", scored=False,
           question="Reflect on the video, or on the examples if you skipped it. There are no wrong answers.", items=items(),
           categories=[{"id": "noticed", "label": "Activities I noticed"}, {"id": "skills", "label": "Skills people used"}, {"id": "explore", "label": "Something to explore"}],
           self_report_fields={"noticed": "selfReportedVideoObservations", "skills": "selfReportedObservedSkills", "explore": "activitiesToExplore"},
           correct_feedback="You recorded your observations, not a scored answer about the video.")
    discussion("story", "Meet Alex",
               "Alex enjoys working with plants. Alex learned to water plants and care for garden materials. Alex works carefully and wants to learn more.",
               "Alex enjoys working with plants. Gardening is an interest. Through practice, Alex has learned skills such as watering plants and caring for familiar garden materials. Alex also works carefully and wants to continue learning. One person can have different interests, skills, talents, strengths, and capabilities.",
               [{"id": "gardening", "title": "Interest", "description": "Plants and gardening.", "image_url": "/assets/pre-vocational/common/gardening.png"},
                {"id": "garden-skill", "title": "Skill", "description": "Watering and caring for plants."},
                {"id": "strength", "title": "Developing strength", "description": "Careful work."},
                {"id": "garden-capability", "title": "Capability", "description": "Completing familiar gardening tasks."}])
    board_categories = [{"id": "enjoy", "label": "I enjoy this"}, {"id": "can", "label": "I can do this"}, {"id": "explore", "label": "I want to practice or explore this"}]
    fields = {"enjoy": "selfReportedInterests", "can": "selfReportedCapabilities", "explore": "activitiesToExplore"}
    screen("board", "My Discovery Board", "interactive", task_template="discovery_board", scored=False,
           question="An activity can belong in more than one area. Choose Not sure yet where needed.", items=items(), categories=board_categories,
           self_report_fields=fields, correct_feedback="You recorded your own choices. These are self-report, not verified skills.")
    classifier("scenarios", "Discover the Difference", [
        clue("Lea enjoys drawing during her free time.", "Interest", "Lea enjoys drawing; this clue emphasizes an interest.", ["Interest", "Skill", "Capability"]),
        clue("Marco learned how to organize files into labeled folders.", "Skill", "The clue emphasizes what Marco learned to do.", ["Interest", "Skill", "Capability"]),
        clue("Sam is able to prepare materials for a familiar classroom task, with a checklist for support.", "Capability", "The clue emphasizes what Sam is able to do. Support is valid.", ["Interest", "Skill", "Capability"]),
        clue("Jamie enjoys learning how electronic devices work.", "Interest", "This describes Jamie's curiosity and enjoyment.", ["Interest", "Skill", "Capability"]),
        clue("Chris learned how to type a short message using a keyboard.", "Skill", "The clue clearly emphasizes a learned skill.", ["Interest", "Skill", "Capability"]),
    ])
    classifier("knowledge", "What Do These Ideas Mean?", [
        clue("Rina enjoys learning new recipes. What does this describe?", "Interest", "This tells us what Rina enjoys.", ["Interest", "Skill", "Capability"]),
        clue("Paolo learned to organize books by label. What does this emphasize?", "Skill", "The clue emphasizes learning a skill.", ["Interest", "Skill", "Capability"]),
        clue("Which statement best describes a skill?", "Something learned or being learned", "Skills develop through learning and practice.", ["Something learned or being learned", "A job Cortex chooses", "Something that must be perfect"]),
        clue("Which statement best describes an interest?", "Something enjoyed or worth exploring", "An interest is about enjoyment and curiosity.", ["Something enjoyed or worth exploring", "A Cortex score", "Something already done perfectly"]),
        clue("Can a person have more than one interest or skill?", "Yes", "People can have many interests and skills.", ["Yes", "No"]),
        clue("Can skills improve with practice and support?", "Yes", "Skills can continue developing.", ["Yes", "No"]),
        clue("If someone uses support to complete an activity, can it still be a capability?", "Yes", "Appropriate support does not take away a person's capability.", ["Yes", "No"]),
    ])
    screen("reflection", "My Reflection", "interactive", task_template="discovery_board", scored=False,
           question="Choose something you enjoy, can do, and want to practice. Not sure yet is okay.", items=items(),
           categories=[{"id": "enjoy", "label": "Something I enjoy"}, {"id": "can", "label": "Something I can do"}, {"id": "explore", "label": "Something I want to practice or explore"}],
           self_report_fields=fields, narration_script="Think about yourself. Choose something you enjoy, something you can do, and something you would like to practice or explore. There are no wrong answers here.",
           correct_feedback="You reflected on yourself. You can keep learning and exploring.")
    screen("summary", "What I Discovered", template="visual_narrative", discussion=True, steps=concepts,
           content_description="People have different strengths. We can keep learning and developing them.",
           narration_script="People have different interests, talents, skills, and capabilities. An interest is something you enjoy or want to explore. A skill is something you have learned or are learning to do. A talent is an ability you may do well and continue to develop. A capability is something you are able to do, with or without support. We can continue learning, practicing, and discovering what we can do.")
    discussion("completion", "Discovery Complete", "You explored your interests, skills, talents, and capabilities. Next, discover different livelihood activities.",
               "You know more about yourself, and you can keep exploring. Next, you will discover different livelihood activities.")
    core = ['orientation', 'concepts', 'video', 'classification', 'story', 'board', 'knowledge', 'reflection', 'completion']
    by_key = {slide['configuration']['screen_key']: slide for slide in slides}
    goal = by_key['orientation']['configuration']
    goal.update(discussion=False, narration_script='', steps=[{'id': 'goal', 'title': "Today's goal", 'description': 'Discover what you enjoy, what you can do, and what you want to practice.', 'image_url': '/assets/pre-vocational/common/drawing-interest.png'}])
    goal['layout']['preferred_columns'] = 1
    for concept in by_key['concepts']['configuration']['steps']:
        if concept['id'] in ('talent', 'skill'):
            concept['image_url'] = '/assets/pre-vocational/common/' + concept['id'] + '.png'
    by_key['story']['configuration']['steps'][0]['image_url'] = '/assets/pre-vocational/common/alex-gardener.png'
    reflection = by_key['reflection']['configuration']
    reflection.update(task_template='picture_choice', selection_mode='single', question='Choose one activity you would like to practice next. Not sure yet is okay.',
                      items=[item for item in items() if item['id'] in ('gardening', 'computer', 'drawing', 'music', 'unsure')],
                      correct_item_ids=[], self_report_field='activitiesToExplore', narration_script='',
                      correct_feedback='You chose a next step. You can change your interests as you explore.')
    reflection.pop('categories', None)
    reflection.pop('self_report_fields', None)
    by_key['reflection']['title'] = 'My Next Step'
    by_key['classification']['configuration']['scenarios'] = by_key['classification']['configuration']['scenarios'][:3]
    by_key['knowledge']['configuration']['scenarios'] = by_key['knowledge']['configuration']['scenarios'][:2] + by_key['knowledge']['configuration']['scenarios'][-2:]
    by_key['story']['configuration']['steps'] = by_key['story']['configuration']['steps'][:2]
    for slide in slides:
        slide['configuration']['optional_review'] = slide['configuration']['screen_key'] not in core
    return [by_key[key] for key in core] + [slide for slide in slides if slide['configuration']['optional_review']]


def upgrade_prev01(definitions):
    lesson = definitions[0]
    lesson.update(OFFICIAL)
    lesson["slides"] = build()
