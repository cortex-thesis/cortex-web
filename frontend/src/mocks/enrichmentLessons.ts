import type { Task } from '../types'

const base = (id: string, index: number, total: number, title: string): Pick<Task, 'id' | 'index' | 'total' | 'title' | 'imageUrl' | 'package' | 'question' | 'choices' | 'answer'> => ({ id, index, total, title, imageUrl: null, package: 'enrichment', question: '', choices: [], answer: '' })
const prev = (name: string) => `/assets/pre-vocational/common/${name}.png`

const enrich01: Task[] = [
  { ...base('enrich01-opening', 1, 8, 'Express & Discover: Talent Gallery'), contentType: 'image', template: 'visual_narrative', contentDescription: 'People can create, perform, participate, and develop abilities in different ways.', steps: [{ id: 'music', title: 'Music Studio', description: 'Singing and playing instruments.', imageUrl: prev('music'), altText: 'Music symbol' }, { id: 'visual', title: 'Creative Space', description: 'Drawing, painting, and creating visual work.', imageUrl: prev('drawing-interest'), altText: 'Person drawing' }, { id: 'performance', title: 'Performance Space', description: 'Performing arts and expressive participation.', imageUrl: prev('movie-recreation'), altText: 'Performance reel' }, { id: 'sports', title: 'Sports Area', description: 'Physical and sport skills. PNG/video needed.', altText: 'Sports activity placeholder' }], actionLabel: 'Enter the gallery', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('enrich01-explore', 2, 8, 'Explore Different Talent Areas'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Short locally validated demonstrations are still needed for each gallery space.', steps: [{ id: 'sing', title: 'Make music', description: 'Use the voice or an instrument.', imageUrl: prev('music'), altText: 'Music' }, { id: 'create', title: 'Create visual art', description: 'Draw, paint, design, or make a handicraft.', imageUrl: prev('handicrafts'), altText: 'Handicraft materials' }, { id: 'perform', title: 'Perform', description: 'Use movement, theater, or another approved performance form.', imageUrl: prev('movie-recreation'), altText: 'Performance' }, { id: 'move', title: 'Participate in sport', description: 'Develop approved physical or sport skills.' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('enrich01-model', 3, 8, 'Identify the Talent Area'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Identify what the person is doing rather than ranking the talent.', steps: [{ id: 'instrument', title: 'Playing an instrument → Music', imageUrl: prev('music'), altText: 'Musical activity' }, { id: 'drawing', title: 'Creating a drawing → Visual Arts', imageUrl: prev('drawing-interest'), altText: 'Drawing activity' }], actionLabel: 'Try sorting' },
  { ...base('enrich01-sort', 4, 8, 'Talent Sort'), contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort each activity into the taught talent or skill area.', items: [{ id: 'singing', label: 'Singing', imageUrl: prev('music') }, { id: 'painting', label: 'Creating a painting', imageUrl: prev('drawing-interest') }, { id: 'acting', label: 'Performing in a scene', imageUrl: prev('movie-recreation') }, { id: 'sport', label: 'Participating in a sport' }], categories: [{ id: 'music', label: 'Music' }, { id: 'visual', label: 'Visual Arts' }, { id: 'performing', label: 'Performing Arts' }, { id: 'sports', label: 'Sports' }], sortAnswers: { singing: 'music', painting: 'visual', acting: 'performing', sport: 'sports' }, correctFeedback: 'Correct. You identified different talent and skill areas.', retryFeedback: 'Look at whether the person is making music, creating art, performing, or participating in sport.', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('enrich01-more', 5, 8, 'More Than One Skill'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'Can one activity involve more than one skill?', choices: ['Yes', 'No'], answer: 'Yes', correctFeedback: 'Correct. Activities may combine several abilities.', retryFeedback: 'Think about a performance that uses movement, timing, and cooperation.' },
  { ...base('enrich01-check', 6, 8, 'Which Area Is Shown?'), imageUrl: prev('music'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'A person is playing a musical instrument. Which area is shown?', choices: ['Music', 'Visual Arts', 'Sports'], answer: 'Music', correctFeedback: 'Correct. Playing an instrument is a music skill.', retryFeedback: 'Look at what the person is using to create sound.' },
  { ...base('enrich01-choice', 7, 8, 'An Area I Would Like to Explore'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', scored: false, question: 'Choose one or more areas you would like to explore.', items: [{ id: 'music', label: 'Music', imageUrl: prev('music') }, { id: 'arts', label: 'Arts', imageUrl: prev('handicrafts') }, { id: 'sports', label: 'Sports' }, { id: 'other', label: 'Another activity I enjoy' }], correctItemIds: [], correctFeedback: 'Your interests have been saved for exploration.', retryFeedback: 'Choose any area you would like to explore.', contentDescription: 'Preference responses are not verified talents or scored answers.', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('enrich01-complete', 8, 8, 'Talent Gallery Explored'), contentType: 'image', template: 'visual_narrative', contentDescription: 'No type of talent is presented as better than another.', steps: [{ id: 'summary', title: 'Many ways to participate and create', description: 'People can develop talents and skills in different areas.', imageUrl: prev('skills'), altText: 'Different skills' }], actionLabel: 'Finish gallery' },
]

const enrich02: Task[] = [
  { ...base('enrich02-opening', 1, 8, 'My Music Studio'), contentType: 'audio', contentLabel: 'Audio needed: brief approved music sample', contentDescription: 'How might a person participate in making music?', durationSeconds: 12, actionLabel: 'Enter the studio' },
  { ...base('enrich02-ways', 2, 8, 'Ways to Make Music'), contentType: 'image', template: 'visual_narrative', contentDescription: 'People may participate through voice, instruments, and appropriate group music activities.', steps: [{ id: 'voice', title: 'Singing', description: 'Use the voice to make music.', imageUrl: prev('music'), altText: 'Music and singing' }, { id: 'instrument', title: 'Playing an instrument', description: 'Use an approved instrument to make music.', imageUrl: prev('music'), altText: 'Musical instrument' }], actionLabel: 'Visit the stations' },
  { ...base('enrich02-voice', 3, 8, 'Station 1: Voice'), contentType: 'video', template: 'instructional_video', contentLabel: 'Video needed: brief age-respectful singing demonstration', contentDescription: 'Learners may participate through an appropriate alternative communication or music mode.', durationSeconds: 25, actionLabel: 'Continue' },
  { ...base('enrich02-instrument', 4, 8, 'Station 2: Instrument'), contentType: 'video', template: 'instructional_video', contentLabel: 'Video needed: familiar approved instrument demonstration', contentDescription: 'Tapping an on-screen instrument does not prove instrumental proficiency.', durationSeconds: 25, actionLabel: 'Continue' },
  { ...base('enrich02-pattern', 5, 8, 'Station 3: Follow the Sound'), contentType: 'interactive', taskTemplate: 'sequence_order', question: 'Follow the short pattern: tap, tap, pause, tap.', items: [{ id: 'tap-1', label: 'Tap' }, { id: 'tap-2', label: 'Tap' }, { id: 'pause', label: 'Pause' }, { id: 'tap-3', label: 'Tap' }], correctOrder: ['tap-1', 'tap-2', 'pause', 'tap-3'], correctFeedback: 'You followed the pattern.', retryFeedback: 'Listen again and follow one sound at a time.', contentDescription: 'Audio pattern needed; one trial must not be used as a talent rating.' },
  { ...base('enrich02-check', 6, 8, 'What Music Skill Is This?'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'A person is using their voice to make music. Which skill is shown?', choices: ['Singing', 'Painting', 'Gardening'], answer: 'Singing', correctFeedback: 'Correct. The person is using their voice to sing.', retryFeedback: 'Is the person using their voice, creating visual art, or gardening?', imageUrl: prev('music') },
  { ...base('enrich02-board', 7, 8, 'My Music Skill Board'), contentType: 'interactive', taskTemplate: 'sort_groups', scored: false, question: 'Place the activities where they fit for you. There are no wrong personal responses.', items: [{ id: 'sing', label: 'Singing' }, { id: 'instrument', label: 'Playing an instrument' }, { id: 'pattern', label: 'Following a simple pattern' }, { id: 'group', label: 'Participating with others' }], categories: [{ id: 'can', label: 'I can do this' }, { id: 'practise', label: 'I am practising this' }, { id: 'try', label: 'I would like to try this' }], sortAnswers: {}, correctFeedback: 'Your music reflection has been saved.', retryFeedback: 'Place each activity in the category that fits you.', contentDescription: 'Teacher observation may supplement this non-scored self-reflection.', layout: { size: 'wide' } },
  { ...base('enrich02-complete', 8, 8, 'Music Studio Session Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Participation and teacher observation provide better evidence than screen selection alone.', steps: [{ id: 'summary', title: 'Listen, try, notice, choose', description: 'Music skills can be explored through participation and practice.', imageUrl: prev('music'), altText: 'Music' }], actionLabel: 'Finish studio' },
]

const enrich03: Task[] = [
  { ...base('enrich03-safety', 1, 8, 'Move Lab: Check Before Moving'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'Has a teacher confirmed that the movement is appropriate and the space is clear?', choices: ['Yes', 'No'], answer: 'Yes', correctFeedback: 'Ready. Use the approved movement or an appropriate adapted version.', retryFeedback: 'Pause and ask the teacher to confirm movement readiness and safe space.', contentDescription: 'Teacher confirmation is required before physical participation.' },
  { ...base('enrich03-watch', 2, 8, 'Watch the Whole Movement'), contentType: 'video', template: 'instructional_video', contentLabel: 'Video needed: full teacher-approved movement sequence', contentDescription: 'Watch first. Notice where and how the demonstrator moves.', durationSeconds: 35, actionLabel: 'I watched first' },
  { ...base('enrich03-breakdown', 3, 8, 'Break It Down'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Movement videos/cards needed after Panorama approves the accessible movement set.', steps: [{ id: 'one', title: 'Movement 1', description: 'Watch at normal and slow speed, then try an appropriate version.' }, { id: 'two', title: 'Movement 2', description: 'Watch, replay if needed, then try.' }, { id: 'three', title: 'Movement 3 — if appropriate', description: 'Include only when approved for the learner and sequence.' }], actionLabel: 'Start mirror practice', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('enrich03-mirror', 4, 8, 'Mirror Practice'), contentType: 'image', template: 'visual_narrative', contentDescription: 'The screen coaches while the learner performs away from the primary interaction surface.', steps: [{ id: 'watch', title: 'Watch', description: 'View one movement demonstration.' }, { id: 'turn', title: 'Your turn', description: 'Try the approved or adapted movement.' }, { id: 'next', title: 'Ready for next?', description: 'Replay or continue when ready.' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('enrich03-sequence', 5, 8, 'Put the Movements Together'), contentType: 'interactive', taskTemplate: 'sequence_order', question: 'Arrange the approved movement cards in the demonstrated order.', items: [{ id: 'move-1', label: 'Movement 1' }, { id: 'move-2', label: 'Movement 2' }, { id: 'move-3', label: 'Movement 3' }], correctOrder: ['move-1', 'move-2', 'move-3'], correctFeedback: 'Correct. You arranged the demonstrated movements in order.', retryFeedback: 'Replay the demonstration and watch what comes next.', contentDescription: 'PLACEHOLDER: cards and final order depend on the approved movement sequence.' },
  { ...base('enrich03-performance', 6, 8, 'Your Turn: Perform'), contentType: 'video', template: 'instructional_video', contentLabel: 'Teacher-observed performance checkpoint', contentDescription: 'Perform the approved sequence independently or with appropriate prompts/support. Screen completion alone is not mastery.', durationSeconds: 45, actionLabel: 'Teacher records observation' },
  { ...base('enrich03-choice', 7, 8, 'A Movement I Enjoyed'), contentType: 'interactive', taskTemplate: 'picture_choice', scored: false, question: 'Choose one approved movement you enjoyed or would like to repeat.', items: [{ id: 'move-1', label: 'Movement 1' }, { id: 'move-2', label: 'Movement 2' }, { id: 'move-3', label: 'Movement 3' }, { id: 'pause', label: 'I would like to pause' }], correctItemIds: [], correctFeedback: 'Your choice has been saved.', retryFeedback: 'Choose a movement or the option to pause.', contentDescription: 'This preference is non-scored, and adapted/seated participation may be used when approved.', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('enrich03-complete', 8, 8, 'Move Lab Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Movement-contaminated EEG is not reliable evidence of distraction or overstimulation; teacher override is especially important.', steps: [{ id: 'summary', title: 'Watch, practise, sequence, perform', description: 'Actual appropriately supported movement is the primary competency evidence.' }], actionLabel: 'Finish lab' },
]

// Keep the guided eight-step journey, with progressively richer practice.
const scenario = (clue: string, choices: string[], answer: string, feedback: string) => ({ clue, choices, answer, feedback })
const challenge = (task: Task, update: Partial<Task>): Task => ({ ...task, ...update })
enrich01[2] = challenge(enrich01[2], {
  title: 'Behind the Gallery Doors', contentType: 'interactive', template: undefined, taskTemplate: 'memory_flip',
  question: 'Turn over the cards. Match each activity picture to the skill it uses.',
  pairs: [
    { id: 'music', left: { id: 'instrument', label: 'Playing an instrument', imageUrl: prev('music') }, right: { id: 'sound', label: 'Making music' } },
    { id: 'art', left: { id: 'drawing', label: 'Drawing', imageUrl: prev('drawing-interest') }, right: { id: 'visual', label: 'Creating visual art' } },
    { id: 'acting', left: { id: 'scene', label: 'Acting in a scene', imageUrl: prev('movie-recreation') }, right: { id: 'perform', label: 'Telling a story through performance' } },
  ], correctFeedback: 'You connected each activity with its skill.', retryFeedback: 'Look for the skill that goes with the activity.', contentDescription: undefined,
})
enrich01[4] = challenge(enrich01[4], {
  title: 'Build a School Showcase', taskTemplate: 'scenario_classifier',
  question: 'Your class is preparing a showcase. Choose the skill needed for each job.',
  scenarios: [
    scenario('The welcome song needs a steady beat. Which team can help?', ['Music team', 'Poster team', 'Sports team'], 'Music team', 'Musicians can keep the beat together.'),
    scenario('Visitors need a colourful poster showing where to go. Which team fits?', ['Acting team', 'Visual arts team', 'Music team'], 'Visual arts team', 'Visual artists use images and design to communicate.'),
    scenario('A short scene will show how to welcome a new classmate. Who can bring it to life?', ['Sports team', 'Performing arts team', 'Poster team'], 'Performing arts team', 'Performers use characters and actions to tell the story.'),
  ], retryFeedback: 'Think about what the team needs to create: sound, a picture, or a performance.',
})
enrich01[5] = challenge(enrich01[5], {
  title: 'Skills Can Work Together', taskTemplate: 'picture_choice', selectionMode: 'multiple',
  question: 'A performance has singing AND acting. Select both skill areas it uses.',
  items: [{ id: 'music', label: 'Music', imageUrl: prev('music') }, { id: 'art', label: 'Visual arts', imageUrl: prev('drawing-interest') }, { id: 'perform', label: 'Performing arts', imageUrl: prev('movie-recreation') }, { id: 'sport', label: 'Sports' }],
  correctItemIds: ['music', 'perform'], imageUrl: null, correctFeedback: 'Yes. Singing and acting combine music and performing arts.', retryFeedback: 'Select two areas: one for singing and one for acting.',
})
enrich02[0] = challenge(enrich02[0], {
  title: 'Your Rhythm Studio', contentType: 'image', template: 'visual_narrative',
  steps: [{ id: 'mission', title: 'Listen, copy, then solve', description: 'Explore voice and instruments, copy three sound patterns, then solve a music-team challenge.', imageUrl: prev('music'), altText: 'Music studio' }],
  contentLabel: undefined, contentDescription: 'Replay as often as you need. A visual prompt is available for every listening round.',
})
enrich02[2] = challenge(enrich02[2], {
  title: 'Discover Your Music Tools', contentType: 'interactive', template: undefined, taskTemplate: 'memory_flip',
  question: 'Find the pairs: match each music tool with how it makes sound.',
  pairs: [
    { id: 'voice', left: { id: 'singer', label: 'Voice' }, right: { id: 'singing', label: 'Humming or singing' } },
    { id: 'drum', left: { id: 'drum', label: 'Drum' }, right: { id: 'tapping', label: 'Tapping a surface' } },
    { id: 'shaker', left: { id: 'shaker', label: 'Shaker' }, right: { id: 'shaking', label: 'Moving small pieces inside a container' } },
  ], contentLabel: undefined, contentDescription: undefined,
  correctFeedback: 'You matched three different ways to make sound.', retryFeedback: 'Think about the action that makes each sound.',
})
enrich02[3] = challenge(enrich02[3], {
  title: 'Complete the Rhythm', contentType: 'interactive', template: undefined, taskTemplate: 'pattern_builder',
  question: 'A rest is a silent beat. Find the next beat in this repeating rhythm.',
  pattern: [{ id: 'a', label: 'Tap' }, { id: 'b', label: 'Tap' }, { id: 'c', label: 'Rest' }, { id: 'd', label: 'Tap' }, { id: 'e', label: 'Tap' }],
  items: [{ id: 'tap', label: 'Tap' }, { id: 'rest', label: 'Rest' }, { id: 'hum', label: 'Hum' }], answer: 'rest',
  contentLabel: undefined, contentDescription: undefined, correctFeedback: 'The silent beat completes tap, tap, rest.', retryFeedback: 'Compare the first three beats with the next three.',
})
enrich02[4] = challenge(enrich02[4], {
  title: 'Echo the Sound Pattern', taskTemplate: 'audio_sequence', correctOrder: undefined, question: 'Listen, then copy the order. Low note: a deep tone. High note: a bright tone. Tap: a short click.',
  items: [{ id: 'low', label: 'Low note', symbol: '●' }, { id: 'high', label: 'High note', symbol: '▲' }, { id: 'tap', label: 'Tap', symbol: '◆' }],
  rounds: [
    { direction: 'Low note, high note.', correctOrder: ['low', 'high'], audioUrl: '/assets/sounds/enrichment/echo-1.wav' },
    { direction: 'Tap, low note, high note.', correctOrder: ['tap', 'low', 'high'], audioUrl: '/assets/sounds/enrichment/echo-2.wav' },
    { direction: 'High note, tap, low note.', correctOrder: ['high', 'tap', 'low'], audioUrl: '/assets/sounds/enrichment/echo-3.wav' },
  ], correctFeedback: 'You copied all three patterns.', retryFeedback: 'Replay the pattern or reveal the visual prompt, then try again.', contentDescription: 'Low note: a deep tone. High note: a bright tone. Tap: a short click.',
})
enrich02[5] = challenge(enrich02[5], {
  title: 'Solve the Band Challenge', taskTemplate: 'scenario_classifier', question: 'Choose what helps the musicians work together.', imageUrl: null,
  scenarios: [
    scenario('The group starts at different times. What should they try?', ['Agree on a count-in', 'Play louder', 'Ignore the others'], 'Agree on a count-in', 'A shared count-in helps everyone start together.'),
    scenario('The singer cannot hear the beat. What could the drummer do?', ['Speed up', 'Play a steady, quieter beat', 'Change the pattern every time'], 'Play a steady, quieter beat', 'A clear, steady beat supports the singer.'),
    scenario('A pattern is difficult to remember. What is a useful next step?', ['Break it into shorter parts', 'Skip listening', 'Guess faster'], 'Break it into shorter parts', 'Short parts make it easier to listen and practise.'),
  ], retryFeedback: 'Choose the action that makes listening and practising together easier.',
})
enrich02[6] = challenge(enrich02[6], {
  title: 'Plan Your Next Studio Visit', taskTemplate: 'discovery_board', scored: false, evidenceRole: 'self_report',
  question: 'Choose what you enjoy and what you want to practise. You may choose the same activity in both areas.',
  items: [{ id: 'sing', label: 'Using my voice', imageUrl: prev('music') }, { id: 'instrument', label: 'Playing an instrument', imageUrl: prev('music') }, { id: 'pattern', label: 'Remembering sound patterns' }, { id: 'group', label: 'Making music with others' }, { id: 'unsure', label: 'Not sure yet', imageUrl: prev('not-sure-yet') }],
  categories: [{ id: 'enjoy', label: 'I enjoyed this' }, { id: 'practice', label: 'My next challenge' }], selfReportFields: { enjoy: 'music_interests', practice: 'music_practice_goal' },
  correctFeedback: 'Your studio plan is saved. Share it with your teacher.', contentDescription: 'Your choices are personal reflections, not a talent score.',
})
enrich03[1] = challenge(enrich03[1], {
  title: 'Meet the Three-Beat Sequence', contentType: 'image', template: 'visual_narrative',
  steps: [{ id: 'tap', title: '1. Tap', description: 'Gently tap your lap or desk once.' }, { id: 'clap', title: '2. Clap', description: 'Clap once, or bring your hands together comfortably.' }, { id: 'pause', title: '3. Pause', description: 'Rest for one beat. Start again only when ready.' }],
  contentLabel: undefined, contentDescription: 'Ask your teacher to approve or adapt these actions. You can follow the cards while seated, point to them, or imagine the actions.',
})
enrich03[2] = challenge(enrich03[2], {
  title: 'Find the Missing Beat', contentType: 'interactive', template: undefined, taskTemplate: 'pattern_builder',
  question: 'The sequence repeats: tap, clap, pause. What comes next?',
  pattern: [{ id: 'a', label: 'Tap' }, { id: 'b', label: 'Clap' }, { id: 'c', label: 'Pause' }, { id: 'd', label: 'Tap' }, { id: 'e', label: 'Clap' }],
  items: [{ id: 'tap', label: 'Tap' }, { id: 'clap', label: 'Clap' }, { id: 'pause', label: 'Pause' }], answer: 'pause',
  correctFeedback: 'Pause completes the repeating three-beat sequence.', retryFeedback: 'Look at the first three beats, then complete the same sequence.', contentDescription: undefined,
})
enrich03[3] = challenge(enrich03[3], {
  title: 'Remember the Movement Cue', contentType: 'interactive', template: undefined, taskTemplate: 'audio_sequence',
  question: 'Listen, then select the actions in order. You can point to the cards without performing the movements.',
  items: [{ id: 'tap', label: 'Tap', symbol: '◆' }, { id: 'clap', label: 'Clap', symbol: '●' }, { id: 'pause', label: 'Pause', symbol: '■' }],
  rounds: [{ direction: 'Tap, clap.', correctOrder: ['tap', 'clap'] }, { direction: 'Clap, pause, tap.', correctOrder: ['clap', 'pause', 'tap'] }, { direction: 'Tap, clap, pause.', correctOrder: ['tap', 'clap', 'pause'] }],
  correctFeedback: 'You remembered each cue sequence.', retryFeedback: 'Listen again or reveal the visual prompt.', contentDescription: undefined,
})
enrich03[4] = challenge(enrich03[4], {
  title: 'Arrange Your Three-Beat Routine', question: 'Put the routine in order: first tap, then clap, then pause.',
  items: [{ id: 'tap', label: 'Tap once' }, { id: 'clap', label: 'Clap once' }, { id: 'pause', label: 'Pause for one beat' }], correctOrder: ['tap', 'clap', 'pause'],
  correctFeedback: 'Your routine is ready: tap, clap, pause.', retryFeedback: 'Start with the tap and end with the pause.', contentDescription: undefined,
})
enrich03[5] = challenge(enrich03[5], {
  title: 'Make the Routine Work for You', contentType: 'interactive', template: undefined, taskTemplate: 'scenario_classifier',
  question: 'Solve these practice situations before trying your routine with your teacher.',
  scenarios: [
    scenario('The routine feels too fast. What helps?', ['Slow down and practise one part', 'Move faster', 'Skip the pause'], 'Slow down and practise one part', 'A slower pace gives you time to learn the sequence.'),
    scenario('A movement is uncomfortable. What should you do?', ['Push through it', 'Pause and ask for an adapted action', 'Copy someone faster'], 'Pause and ask for an adapted action', 'Your teacher can help choose a comfortable alternative.'),
    scenario('You are ready to practise with a partner. How can you start together?', ['Agree on a count-in', 'Start whenever you like', 'Both use different sequences'], 'Agree on a count-in', 'Count together, then try the same routine at a comfortable pace.'),
  ], retryFeedback: 'Choose the action that supports comfortable, clear practice.', contentLabel: undefined, contentDescription: 'With teacher approval, try your routine or an adapted version. The screen records knowledge practice; your teacher observes physical participation.',
})
enrich03[6] = challenge(enrich03[6], {
  title: 'Choose Your Next Practice', question: 'Which part would you like to practise or adapt next?',
  items: [{ id: 'tap', label: 'The tap' }, { id: 'clap', label: 'The clap' }, { id: 'pause', label: 'Keeping the pause' }, { id: 'adapt', label: 'An adapted routine with my teacher' }],
  contentDescription: 'Choose your own next step. There is no wrong preference.',
})

const studioImage = (name: string) => `/assets/enrichment/${name}.svg`
enrich01[0].steps = enrich01[0].steps?.map(step => step.id === 'sports' ? { ...step, description: 'Coordination, teamwork, and physical skills.', imageUrl: studioImage('sports'), altText: 'Sports ball' } : step)
enrich01[1].contentDescription = 'Notice what each activity asks a person to create or do.'
enrich01[1].steps = enrich01[1].steps?.map(step => step.id === 'move' ? { ...step, imageUrl: studioImage('sports'), altText: 'Sports ball' } : step)
for (const task of enrich01) task.items = task.items?.map(item => ['sports', 'sport'].includes(item.id) ? { ...item, imageUrl: studioImage('sports'), altText: 'Sports ball' } : item)
enrich02[2].pairs = enrich02[2].pairs?.map(pair => ({ ...pair, left: { ...pair.left, imageUrl: studioImage(pair.id), altText: pair.left.label } }))
for (const task of enrich03) {
  task.steps = task.steps?.map(step => ['tap', 'clap', 'pause'].includes(step.id) ? { ...step, imageUrl: studioImage(step.id), altText: step.title } : step)
  task.items = task.items?.map(item => ['tap', 'clap', 'pause'].includes(item.id) ? { ...item, imageUrl: studioImage(item.id), altText: item.label } : item)
}

export const mockEnrichmentLessons = [
  { id: 'ENRICH-01', title: 'Different Kinds of Talents and Skills', tasks: enrich01 },
  { id: 'ENRICH-02', title: 'My Music Skills', tasks: enrich02 },
  { id: 'ENRICH-03', title: 'Move to the Beat', tasks: enrich03 },
] as const
