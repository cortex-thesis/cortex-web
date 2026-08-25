import type { User, ClassRoom, StudentLive, Task } from '../types'
import type { CognitiveState } from '../constants/states'

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
  },
]

export const mockTask: Task = {
  id: 'task-001',
  index: 1,
  total: 5,
  title: 'Getting Ready for School',
  imageUrl: null,
  question: 'What should you do FIRST in the morning?',
  choices: ['Eat Breakfast', 'Wake up first', 'Pack bag', 'Brush Teeth'],
  answer: 'Wake up first',
  package: 'life',
}

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
