"""Compact clock learning/practice, preserving FUNC-03's complete competency."""
from .care_lessons import ADAPTATION_POLICY


def upgrade_func03(definitions):
    lesson = definitions[2]
    slides = []

    def screen(key, title, kind='image', **config):
        config.update(lesson_id='FUNC-03', screen_key=key, adaptive_delivery=ADAPTATION_POLICY,
                      digital_mastery_claim=False, layout={'size': 'wide', 'preferred_columns': 1})
        slides.append({'title': title, 'type': kind, 'configuration': config})

    def clock(key, title, mode, examples):
        screen(key, title, 'interactive', task_template='clock_set', clock_mode=mode,
               question='Work with one clock at a time.', evidence_role='primary_digital',
               correct_feedback='You practiced hours, minutes, and the time period.',
               retry_feedback='Check the hour hand, minute hand, and a.m. or p.m., then try again.',
               clock_rounds=[{'id': key + str(i), 'instruction': prompt, 'hour': h, 'minute': m, 'period': p}
                             for i, (prompt, h, m, p) in enumerate(examples)])

    screen('clock-goal-v1', 'My Day on Time', template='visual_narrative', steps=[{
        'id': 'goal', 'title': "Today's goal", 'description': 'Read and use hours, minutes, and a.m./p.m. on analog and digital clocks.',
        'image_url': '/assets/life/life-01/backpack.png'}])
    screen('clock-guide-v1', 'Two Hands, One Time', template='visual_narrative', discussion=True,
           narration_script='The short hand shows the hour. The long hand shows minutes. Each number marks five minutes. On a digital clock, the number before the colon is the hour, and the number after it is minutes. A m is midnight to before noon. P m is noon to before midnight. An analog clock alone does not tell us which period it is.',
           steps=[{'id': 'hands', 'title': 'Hour and minutes', 'description': 'Short hand: hour. Long hand: minutes. Each number marks five minutes.'},
                  {'id': 'period', 'title': 'Read the period too', 'description': 'a.m.: midnight to before noon. p.m.: noon to before midnight. 12:00 p.m. is noon; 12:00 a.m. is midnight.'}])
    screen('clock-video-v1', 'Watch: Whole-Hour Clocks', 'video', template='instructional_video',
           media_url='https://www.youtube.com/embed/xdR7s8mwyp8', content_label="Telling the Time: O'Clock Times",
           content_description='Watch where the short and long hands point at a whole hour.',
           video_review_status='User-selected; public title checked. Full suitability and embedded playback need review.',
           assessment_metadata={'whole_hour_introduction_only': True})
    clock('clock-hours-v1', 'Set the Hour', 'set', [('Set 3:00 p.m.', 3, 0, 'pm'), ('Set 7:00 a.m.', 7, 0, 'am')])
    clock('clock-minutes-v1', 'Add the Minutes', 'set', [('Set 8:15 a.m. The long hand points to 3.', 8, 15, 'am'), ('Set 2:30 p.m. The long hand points to 6.', 2, 30, 'pm')])
    clock('clock-read-v1', 'Read the Clock', 'read', [('Read this clock. The written period is a.m.', 10, 30, 'am'), ('Read this clock. The written period is p.m.', 4, 45, 'pm')])
    clock('clock-routine-v1', 'An Example Day', 'read', [('Example: this is a morning get-ready clock (a.m.). Read the time.', 7, 15, 'am'),
          ('Example: this lunch clock is at noon (p.m.). Read the time.', 12, 0, 'pm'),
          ('Example: this afternoon activity clock uses p.m. Read the time.', 3, 20, 'pm')])
    screen('clock-complete-v1', 'Clock Practice Complete', template='visual_narrative', steps=[{
        'id': 'done', 'title': 'Hours, minutes, and the period', 'description': 'Use clocks to understand when things happen. Your own daily schedule may be different.',
        'image_url': '/assets/life/life-01/complete-task.png'}], assessment_metadata={'real_world_verification': 'recommended'})
    lesson['slides'] = slides
