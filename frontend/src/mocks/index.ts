import type { User, ClassRoom, StudentLive, Task } from '../types'
import type { CognitiveState } from '../constants/states'
import { mockLifeLessons } from './lifeLessons'
import { mockPrevLessons } from './prevLessons'
import { mockLiveLessons } from './liveLessons'
import { mockFuncLessons } from './funcLessons'
import { mockCareerLessons } from './careerLessons'
import { mockEnrichmentLessons } from './enrichmentLessons'


export const mockTeacher: User = {
  id: 'teacher-001',
  name: 'Ms. Santos',
  role: 'teacher',
  avatar: null,
  classIds: [
    'class-001',
    'class-002',
    'class-003',
    'class-004',
    'class-005',
    'class-006',
    'class-007',
  ],
}

export const mockStudent: User = {
  id: 'student-001',
  name: 'Daniel M.',
  role: 'student',
  avatar: null,
  classIds: [
    'class-001',
    'class-002',
    'class-003',
    'class-004',
    'class-005',
    'class-006',
    'class-007',
  ],
}

export const mockClasses: ClassRoom[] = [
  {
    id: 'class-001',
    name: 'Life Skills',
    code: 'K79F',
    teacherId: 'teacher-001',
    studentIds: ['student-001', 'student-002', 'student-003'],
    package: 'life',
    iconEmoji: '🍳',
    iconBg: '#E1F5EE',
  },
  {
    id: 'class-002',
    name: 'Self Care',
    code: 'B3PQ',
    teacherId: 'teacher-001',
    studentIds: ['student-004', 'student-005'],
    package: 'care',
    iconEmoji: '🤲',
    iconBg: '#E6F1FB',
  },
  {
    id: 'class-003',
    name: 'Pre-Vocational',
    code: 'V8RK',
    teacherId: 'teacher-001',
    studentIds: ['student-001', 'student-002'],
    package: 'pre_vocational',
    iconEmoji: '🛠️',
    iconBg: '#FAEEDA',
  },
  {
    id: 'class-004',
    name: 'Livelihood',
    code: 'L4HD',
    teacherId: 'teacher-001',
    studentIds: ['student-001', 'student-003'],
    package: 'livelihood',
    iconEmoji: '🌱',
    iconBg: '#EFF6E4',
  },
  {
    id: 'class-005',
    name: 'Functional Academics',
    code: 'F2AC',
    teacherId: 'teacher-001',
    studentIds: ['student-001', 'student-002', 'student-003'],
    package: 'functional_academics',
    iconEmoji: '📖',
    iconBg: '#EEEDFE',
  },
  {
    id: 'class-006',
    name: 'Career',
    code: 'C9ER',
    teacherId: 'teacher-001',
    studentIds: ['student-001'],
    package: 'career',
    iconEmoji: '💼',
    iconBg: '#FBEAF0',
  },
  {
    id: 'class-007',
    name: 'Enrichment',
    code: 'E7CH',
    teacherId: 'teacher-001',
    studentIds: ['student-001', 'student-002'],
    package: 'enrichment',
    iconEmoji: '🎨',
    iconBg: '#FDF1E7',
  },
]

export const mockStudentsLive: StudentLive[] = [
  {
    id: 'student-001',
    name: 'Daniel M.',
    avatar: null,
    currentState: 'focused',
    signalStrength: 3,
    focusScore: 78,
    sessionDuration: 1240,
    isConnected: true,
    bandPowers: { theta: 2.5, alpha: 3.2, beta: 9.8, gamma: 4.1, tbr: 0.8 },
    signalQuality: 'good',
    connectionStatus: 'connected',
    workstationPath: 'Teacher desk / EEG-01',
    stateStartedAt: new Date(Date.now() - 255000).toISOString(),
    stateTransitions: [{ state: 'focused', timestamp: new Date(Date.now() - 255000).toISOString() }],
    activeActivity: 'Getting Ready for School',
    engineMode: 'auto',
  },
  {
    id: 'student-002',
    name: 'Kyla R.',
    avatar: null,
    currentState: 'distracted',
    signalStrength: 4,
    focusScore: 61,
    sessionDuration: 980,
    isConnected: true,
    bandPowers: { theta: 8.4, alpha: 4.0, beta: 2.9, gamma: 0.9, tbr: 2.8 },
    signalQuality: 'fair',
    connectionStatus: 'resyncing',
    workstationPath: 'Teacher desk / EEG-02',
    stateStartedAt: new Date(Date.now() - 78000).toISOString(),
    stateTransitions: [
      { state: 'focused', timestamp: new Date(Date.now() - 420000).toISOString() },
      { state: 'distracted', timestamp: new Date(Date.now() - 78000).toISOString() },
    ],
    activeActivity: 'Morning Routine: Sequencing',
    engineMode: 'teacher-override',
  },
  {
    id: 'student-003',
    name: 'Marco T.',
    avatar: null,
    currentState: 'relaxed',
    signalStrength: 2,
    focusScore: 85,
    sessionDuration: 1450,
    isConnected: true,
    bandPowers: { theta: 4.1, alpha: 8.6, beta: 3.1, gamma: 1.2, tbr: 1.3 },
    signalQuality: 'good',
    connectionStatus: 'connected',
    workstationPath: 'Teacher desk / EEG-03',
    stateStartedAt: new Date(Date.now() - 510000).toISOString(),
    stateTransitions: [{ state: 'relaxed', timestamp: new Date(Date.now() - 510000).toISOString() }],
    activeActivity: 'Calm Breathing Check-in',
    engineMode: 'auto',
  },
]

export const mockTasks: Task[] = [
  {
    id: 'task-video', index: 1, total: 13, title: 'Choose What We Need',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Use the pictures to find the useful item.',
    taskTemplate: 'picture_choice', question: 'Which item helps clean your hands?', choices: [], answer: '', package: 'care',
    items: [{ id: 'soap', label: 'Soap', imageUrl: '/assets/care/care-01/soap.png' }, { id: 'book', label: 'Book', imageUrl: '/assets/care/care-01/book.png' }, { id: 'ball', label: 'Ball', imageUrl: '/assets/care/care-01/ball.png' }], correctItemIds: ['soap'],
  },
  {
    id: 'task-visual', index: 2, total: 13, title: 'Put the Handwashing Steps in Order',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Move one clear step at a time.',
    steps: [
      { id: 'wet', title: 'Wet', description: 'Wet your hands.' },
      { id: 'soap', title: 'Soap', description: 'Add soap.' },
      { id: 'rub', title: 'Rub', description: 'Rub all parts.' },
      { id: 'rinse', title: 'Rinse', description: 'Rinse and dry.' },
    ],
    taskTemplate: 'sequence_order', question: 'Tap the steps from first to last.', choices: [], answer: '', package: 'care',
    items: [{ id: 'wet', label: 'Wet hands' }, { id: 'soap', label: 'Add soap' }, { id: 'rub', label: 'Rub hands' }, { id: 'rinse', label: 'Rinse' }],
    correctOrder: ['wet', 'soap', 'rub', 'rinse'],
  },
  {
    id: 'task-check', index: 3, total: 13, title: 'Check What You Learned',
    imageUrl: null, contentType: 'interactive', contentLabel: 'Choose one answer',
    contentDescription: 'A short check with immediate feedback.',
    taskTemplate: 'multiple_choice', question: 'What do you use to clean your hands?',
    choices: ['Soap and water', 'A pencil', 'A toy', 'A book'],
    answer: 'Soap and water', package: 'care',
  },
  {
    id: 'task-reengage', index: 4, total: 13, title: 'Ready for One More Step?',
    imageUrl: null, contentType: 'interactive', instruction: 'Look at the soap. Tap when you are ready.',
    contentDescription: 'A brief cue helps bring attention back to the lesson.',
    taskTemplate: 'yes_no', question: 'Are you ready for the next small step?', choices: ['Yes', 'No'], answer: 'Yes', package: 'care', actionLabel: "I'm ready",
  },
  {
    id: 'task-breathe', index: 5, total: 13, title: 'Find the Clean Towel',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Look carefully and tap the useful item.',
    taskTemplate: 'tap_target', question: 'Tap the clean towel.', choices: [], answer: '', package: 'care', actionLabel: 'Done breathing',
    items: [{ id: 'clean-towel', label: 'Clean towel', imageUrl: '/assets/care/care-03/towel.png' }, { id: 'toy', label: 'Toy car', imageUrl: '/assets/care/care-01/toy-car.png' }, { id: 'shoe', label: 'Shoe', imageUrl: '/assets/care/care-01/shoes.png' }], correctItemIds: ['clean-towel'],
  },
  {
    id: 'task-calm-visual', index: 6, total: 13, title: 'Match the Care Items',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Move each item to the job it does.',
    taskTemplate: 'matching_pairs', question: 'Match each item with what it does.', choices: [], answer: '', package: 'care', actionLabel: 'I feel ready',
    pairs: [
      { id: 'soap', left: { id: 'soap-item', label: 'Soap' }, right: { id: 'soap-use', label: 'Cleans hands' } },
      { id: 'towel', left: { id: 'towel-item', label: 'Towel' }, right: { id: 'towel-use', label: 'Dries hands' } },
    ],
  },
  {
    id: 'task-soundscape', index: 7, total: 13, title: 'Sort Clean and Dirty Items',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Move every item into the correct group.',
    taskTemplate: 'sort_groups', question: 'Sort each item into the correct group.', choices: [], answer: '', package: 'care', actionLabel: 'Finish',
    items: [{ id: 'washed', label: 'Washed hands' }, { id: 'muddy', label: 'Muddy hands' }, { id: 'soap', label: 'Soap' }, { id: 'trash', label: 'Trash' }],
    categories: [{ id: 'clean', label: 'Clean' }, { id: 'dirty', label: 'Dirty' }],
    sortAnswers: { washed: 'clean', muddy: 'dirty', soap: 'clean', trash: 'dirty' },
  },
  {
    id: 'task-puzzle', index: 8, total: 13, title: 'Build the Handwashing Picture',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Move the picture pieces into the correct order.',
    taskTemplate: 'picture_puzzle', question: 'Drag the pieces to complete the handwashing story.', choices: [], answer: '', package: 'care',
    layout: { size: 'wide', preferredColumns: 4, boardMinHeight: 280 },
    items: [{ id: 'p3', label: 'Rub' }, { id: 'p1', label: 'Wet' }, { id: 'p4', label: 'Rinse' }, { id: 'p2', label: 'Soap' }],
    correctOrder: ['p1', 'p2', 'p3', 'p4'],
  },
  {
    id: 'task-drag-target', index: 9, total: 13, title: 'Put Things Where They Belong',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Move each object to its useful place.',
    taskTemplate: 'drag_to_target', question: 'Drag each item to the sink area or the storage area.', choices: [], answer: '', package: 'care',
    layout: { size: 'wide', preferredColumns: 2, boardMinHeight: 280 },
    items: [{ id: 'soap', label: 'Soap' }, { id: 'towel', label: 'Towel' }, { id: 'book', label: 'Book' }, { id: 'pencil', label: 'Pencil' }],
    categories: [{ id: 'sink', label: 'Sink area' }, { id: 'storage', label: 'School supplies' }],
    sortAnswers: { soap: 'sink', towel: 'sink', book: 'storage', pencil: 'storage' },
  },
  {
    id: 'task-hotspot', index: 10, total: 13, title: 'Hotspot Hunt',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Explore a scene and place a marker on the answer.',
    taskTemplate: 'hotspot_hunt', question: 'Where should you wash your hands?', choices: [], answer: '', package: 'care',
    layout: { size: 'immersive', boardMinHeight: 360, mediaFit: 'contain' },
    sceneImageUrl: null, hotspot: { x: 65, y: 55, radius: 18, label: 'the sink' },
  },
  {
    id: 'task-trace', index: 11, total: 13, title: 'Trace the Clean-Hands Route',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Follow a short motor path through the routine.',
    taskTemplate: 'trace_route', question: 'Trace from water to clean hands.', choices: [], answer: '', package: 'care',
    items: [{ id: 'water', label: 'Water' }, { id: 'soap', label: 'Soap' }, { id: 'rub', label: 'Rub' }, { id: 'clean', label: 'Clean' }],
    correctOrder: ['water', 'soap', 'rub', 'clean'],
  },
  {
    id: 'task-memory', index: 12, total: 13, title: 'Care-Item Memory Flip',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Reveal two cards at a time and remember their places.',
    taskTemplate: 'memory_flip', question: 'Find the care-item pairs.', choices: [], answer: '', package: 'care',
    layout: { size: 'wide', preferredColumns: 3 },
    pairs: [
      { id: 'soap', left: { id: 'soap-image', label: 'Soap image', imageUrl: '/assets/care/care-01/soap.png', altText: 'Bar of soap' }, right: { id: 'soap-text', label: 'Soap' } },
      { id: 'water', left: { id: 'water-image', label: 'Water image', imageUrl: '/assets/care/care-02/water.png', altText: 'Glass of water' }, right: { id: 'water-text', label: 'Water' } },
      { id: 'towel', left: { id: 'towel-image', label: 'Towel image', imageUrl: '/assets/care/care-03/towel.png', altText: 'Clean towel' }, right: { id: 'towel-text', label: 'Towel' } },
    ],
  },
  {
    id: 'task-pattern', index: 13, total: 13, title: 'Finish the Care Pattern',
    imageUrl: null, contentType: 'interactive', contentDescription: 'Move the missing piece into a repeating routine.',
    taskTemplate: 'pattern_builder', question: 'What comes next?', choices: [], answer: 'soap', package: 'care',
    pattern: [{ id: 'water', label: 'Water' }, { id: 'soap', label: 'Soap' }, { id: 'water', label: 'Water' }],
    items: [{ id: 'towel', label: 'Towel' }, { id: 'soap', label: 'Soap' }, { id: 'book', label: 'Book' }],
  },
]

export const mockTask: Task = mockTasks[0]

const care02Tasks: Task[] = [
  { id: 'care02-orientation', index: 1, total: 8, title: 'Healthy Food Choices', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'Learn to recognize healthful and less healthful foods.', steps: [{ id: 'goal', title: 'Today’s goal', description: 'Recognize healthful and less healthful foods.', imageUrl: '/assets/care/care-02/balanced-meal.png', altText: 'Plate prepared for a meal' }], actionLabel: 'Continue' },
  { id: 'care02-hook', index: 2, total: 8, title: 'Choose a Snack', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Which choice would better support a healthy snack?', choices: [], answer: '', items: [{ id: 'banana', label: 'Banana', imageUrl: '/assets/care/care-02/banana.png', altText: 'Banana' }, { id: 'candy', label: 'Highly sugary candy', imageUrl: '/assets/care/care-02/sugary-candy.png', altText: 'Sugary candy' }], correctItemIds: ['banana'], correctFeedback: 'Correct. A banana is a healthful snack choice.', retryFeedback: 'Look again. Which choice would better support a healthy snack?', contentDescription: 'Compare two familiar snack choices.' },
  { id: 'care02-instruction', index: 3, total: 8, title: 'Healthful and Less Healthful', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'Compare foods without labeling them as good or bad.', steps: [{ id: 'healthful', title: 'Healthful', description: 'Choices that support the body and can be chosen more often.', imageUrl: '/assets/care/care-02/vegetables.png', altText: 'Vegetables' }, { id: 'less', title: 'Less Healthful', description: 'Choices that are better chosen less often.', imageUrl: '/assets/care/care-02/processed-chips.png', altText: 'Processed chips' }], actionLabel: 'Continue' },
  { id: 'care02-model', index: 4, total: 8, title: 'See How to Classify', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'A clear paired example.', steps: [{ id: 'banana', title: 'Banana → Healthful', imageUrl: '/assets/care/care-02/banana.png', altText: 'Banana' }, { id: 'candy', title: 'Sugary candy → Less Healthful', imageUrl: '/assets/care/care-02/sugary-candy.png', altText: 'Sugary candy' }], actionLabel: 'Try sorting' },
  { id: 'care02-sort', index: 5, total: 8, title: 'Sort the Foods', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Place each food under Healthful or Less Healthful.', choices: [], answer: '', items: [{ id: 'banana', label: 'Banana', imageUrl: '/assets/care/care-02/banana.png' }, { id: 'vegetables', label: 'Vegetables', imageUrl: '/assets/care/care-02/vegetables.png' }, { id: 'water', label: 'Water', imageUrl: '/assets/care/care-02/water.png' }, { id: 'candy', label: 'Sugary candy', imageUrl: '/assets/care/care-02/sugary-candy.png' }, { id: 'softdrink', label: 'Very sugary soft drink', imageUrl: '/assets/care/care-02/sugary-soft-drink.png' }], categories: [{ id: 'healthful', label: 'Healthful' }, { id: 'less', label: 'Less Healthful' }], sortAnswers: { banana: 'healthful', vegetables: 'healthful', water: 'healthful', candy: 'less', softdrink: 'less' }, correctFeedback: 'Correct. You classified the foods.', retryFeedback: 'Look again. Which choices would better support a healthy meal?', contentDescription: 'Sort five familiar food images.', layout: { size: 'wide', preferredColumns: 5 } },
  { id: 'care02-check', index: 6, total: 8, title: 'Choose the Healthful Food', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Choose the healthful food.', choices: [], answer: '', items: [{ id: 'fruit', label: 'Banana', imageUrl: '/assets/care/care-02/banana.png' }, { id: 'candy', label: 'Sugary candy', imageUrl: '/assets/care/care-02/sugary-candy.png' }, { id: 'chips', label: 'Heavily processed snack', imageUrl: '/assets/care/care-02/processed-chips.png' }], correctItemIds: ['fruit'], correctFeedback: 'Correct. A banana is a healthful choice.', retryFeedback: 'Look again. Which choice would better support a healthy meal?', contentDescription: 'Choose from three familiar food images.' },
  { id: 'care02-scenario', index: 7, total: 8, title: 'Choose a Lunch Drink', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Which is the more healthful option with lunch?', choices: ['Water', 'Very sugary soft drink'], answer: 'Water', correctFeedback: 'Correct. Water is the more healthful choice.', retryFeedback: 'Look again. Which drink would better support a healthy meal?', contentDescription: 'Optional PNG: water and soft drink comparison.' },
  { id: 'care02-summary', index: 8, total: 8, title: 'Remember Your Choices', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'Choose healthful foods more often and recognize less healthful foods.', steps: [{ id: 'summary', title: 'Choose with care', description: 'Recognize healthful and less healthful foods in everyday meals and snacks.' }], actionLabel: 'Finish lesson' },
]

const care03Tasks: Task[] = [
  { id: 'care03-orientation', index: 1, total: 9, title: 'Tools for Good Grooming', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentLabel: 'PNG needed: age-respectful getting-ready scenario', contentDescription: 'Recognize materials used for different grooming tasks.', steps: [{ id: 'goal', title: 'Today’s goal', description: 'Choose the material that matches each grooming task.' }], actionLabel: 'Continue' },
  { id: 'care03-hook', index: 2, total: 9, title: 'Getting Ready for School', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Your hair needs to be arranged. Which material would you prepare?', choices: [], answer: '', items: [{ id: 'comb', label: 'Comb', imageUrl: '/assets/care/care-03/comb.png' }, { id: 'toothbrush', label: 'Toothbrush', imageUrl: '/assets/care/care-03/toothbrush.png' }, { id: 'trowel', label: 'Garden trowel', imageUrl: '/assets/care/care-03/garden-trowel.png' }], correctItemIds: ['comb'], correctFeedback: 'Correct. A comb is used for grooming the hair.', retryFeedback: 'Try again. Which material is used for the hair?', contentDescription: 'Choose the material used for hair.' },
  { id: 'care03-instruction', index: 3, total: 9, title: 'Materials and Their Purposes', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'Introduce one functional material at a time.', steps: [{ id: 'toothbrush', title: 'Toothbrush', description: 'Clean teeth', imageUrl: '/assets/care/care-03/toothbrush.png', altText: 'Toothbrush' }, { id: 'comb', title: 'Comb or hairbrush', description: 'Arrange hair', imageUrl: '/assets/care/care-03/comb.png', altText: 'Comb' }, { id: 'clipper', title: 'Nail clipper', description: 'Trim nails', imageUrl: '/assets/care/care-03/nail-clippers.png', altText: 'Nail clippers' }, { id: 'towel', title: 'Towel', description: 'Dry after washing', imageUrl: '/assets/care/care-03/towel.png', altText: 'Towel' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 4 } },
  { id: 'care03-model', index: 4, total: 9, title: 'Match a Material to Its Purpose', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'A toothbrush is not used to arrange hair.', steps: [{ id: 'model', title: 'Arrange hair → Comb', description: 'Choose a comb or hairbrush for hair.', imageUrl: '/assets/care/care-03/comb.png', altText: 'Comb' }], actionLabel: 'Try matching' },
  { id: 'care03-match', index: 5, total: 9, title: 'Match the Grooming Materials', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'matching_pairs', question: 'Match each material with what it is used for.', choices: [], answer: '', pairs: [{ id: 'teeth', left: { id: 'toothbrush', label: 'Toothbrush', imageUrl: '/assets/care/care-03/toothbrush.png' }, right: { id: 'clean-teeth', label: 'Clean teeth' } }, { id: 'hair', left: { id: 'comb', label: 'Comb', imageUrl: '/assets/care/care-03/comb.png' }, right: { id: 'arrange-hair', label: 'Arrange hair' } }, { id: 'nails', left: { id: 'clipper', label: 'Nail clipper', imageUrl: '/assets/care/care-03/nail-clippers.png' }, right: { id: 'trim-nails', label: 'Trim nails' } }, { id: 'dry', left: { id: 'towel', label: 'Towel', imageUrl: '/assets/care/care-03/towel.png' }, right: { id: 'dry-body', label: 'Dry after washing' } }], correctFeedback: 'Correct. Each material matches its purpose.', retryFeedback: 'Try again. Think about what each material is used for.', contentDescription: 'Match four grooming materials.', layout: { size: 'wide' } },
  { id: 'care03-hair', index: 6, total: 9, title: 'Choose an Item for Hair', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Which item would you use to groom your hair?', choices: [], answer: '', items: [{ id: 'comb', label: 'Comb or hairbrush', imageUrl: '/assets/care/care-03/comb.png' }, { id: 'toothbrush', label: 'Toothbrush', imageUrl: '/assets/care/care-03/toothbrush.png' }, { id: 'towel', label: 'Towel', imageUrl: '/assets/care/care-03/towel.png' }], correctItemIds: ['comb'], correctFeedback: 'Correct. A comb or hairbrush is used for grooming hair.', retryFeedback: 'Try again. Which material is used for the hair?', contentDescription: 'Choose from three grooming materials.' },
  { id: 'care03-teeth', index: 7, total: 9, title: 'Prepare to Clean Your Teeth', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'Which materials do you need to clean your teeth?', choices: [], answer: '', items: [{ id: 'toothbrush', label: 'Toothbrush', imageUrl: '/assets/care/care-03/toothbrush.png' }, { id: 'toothpaste', label: 'Toothpaste', imageUrl: '/assets/care/care-03/toothpaste.png' }, { id: 'trowel', label: 'Garden trowel', imageUrl: '/assets/care/care-03/garden-trowel.png' }], correctItemIds: ['toothbrush', 'toothpaste'], correctFeedback: 'Correct. Prepare a toothbrush and toothpaste.', retryFeedback: 'Try again. Choose the materials used for cleaning teeth.', contentDescription: 'Select both tooth-cleaning materials.' },
  { id: 'care03-kit', index: 8, total: 9, title: 'Prepare a Grooming Kit', imageUrl: null, package: 'care', contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort each item by the task it supports.', choices: [], answer: '', items: [{ id: 'toothbrush', label: 'Toothbrush', imageUrl: '/assets/care/care-03/toothbrush.png' }, { id: 'comb', label: 'Comb', imageUrl: '/assets/care/care-03/comb.png' }, { id: 'clipper', label: 'Nail clipper', imageUrl: '/assets/care/care-03/nail-clippers.png' }, { id: 'towel', label: 'Towel', imageUrl: '/assets/care/care-03/towel.png' }], categories: [{ id: 'teeth', label: 'Clean teeth' }, { id: 'hair', label: 'Arrange hair' }, { id: 'nails', label: 'Trim nails' }, { id: 'dry', label: 'Dry after washing' }], sortAnswers: { toothbrush: 'teeth', comb: 'hair', clipper: 'nails', towel: 'dry' }, correctFeedback: 'Correct. You chose a suitable material for each task.', retryFeedback: 'Check each task and choose the material made for it.', contentDescription: 'Sort four grooming materials.', layout: { size: 'wide', preferredColumns: 4 } },
  { id: 'care03-summary', index: 9, total: 9, title: 'Choose the Material for the Task', imageUrl: null, package: 'care', contentType: 'image', template: 'visual_narrative', question: '', choices: [], answer: '', contentDescription: 'This lesson checks recognition, not independent grooming performance.', steps: [{ id: 'summary', title: 'Different tasks need different materials', description: 'Choose the grooming material that matches the task.' }], actionLabel: 'Finish lesson' },
]

export const mockCareLessons = [
  { id: 'CARE-01', title: 'Wash Hands Step by Step', tasks: mockTasks },
  { id: 'CARE-02', title: 'Healthy Food Choices', tasks: care02Tasks },
  { id: 'CARE-03', title: 'Tools for Good Grooming', tasks: care03Tasks },
] as const

export const mockPreviewLessons = [...mockCareLessons, ...mockLifeLessons, ...mockPrevLessons, ...mockLiveLessons, ...mockFuncLessons, ...mockCareerLessons, ...mockEnrichmentLessons] as const

// simulates live EEG state cycling for dev/testing
export function createMockEEGStream(
  onUpdate: (state: CognitiveState) => void,
  intervalMs = 4000
): () => void {
  const states: CognitiveState[] = [
    'focused',
    'focused',
    'distracted',
    'focused',
    'overstimulated',
    'relaxed',
    'focused',
  ]
  let index = 0

  const id = setInterval(() => {
    onUpdate(states[index % states.length])
    index++
  }, intervalMs)

  return () => clearInterval(id)
}

export const mockJournalEntry = {
  id: 'journal-001',
  sessionId: 'session-001',
  studentId: 'student-001',
  createdAt: new Date().toISOString(),
  prompt: 'What did you learn today?',
  response: {
    type: 'text' as const,
    content: '',
  },
  mood: null as null,
  tasksDone: ['Getting Ready for School', 'Morning Routine', 'Packing My Bag'],
}
