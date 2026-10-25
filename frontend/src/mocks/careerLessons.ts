import career03Revision from '../../../web/career03_revision.json'
import career01Revision from '../../../web/career01_revision.json'
import careerAssetReuse from '../../../web/career_asset_reuse.json'
import refinements from '../../../web/restored_lesson_refinements.json'
import type { Task } from '../types'

const base = (id: string, index: number, total: number, title: string): Pick<Task, 'id' | 'index' | 'total' | 'title' | 'imageUrl' | 'package' | 'question' | 'choices' | 'answer'> => ({ id, index, total, title, imageUrl: null, package: 'career', question: '', choices: [], answer: '' })
const skill = (name: string) => `/assets/pre-vocational/common/${name}.png`

const profileItems = [{ id: 'organize', label: 'Organize materials', imageUrl: skill('organizing') }, { id: 'computer', label: 'Use a computer', imageUrl: skill('using-computer') }, { id: 'garden', label: 'Care for plants', imageUrl: skill('gardening') }, { id: 'food', label: 'Prepare food', imageUrl: skill('meal-preparation') }, { id: 'repair', label: 'Repair objects', imageUrl: skill('repair') }, { id: 'design', label: 'Draw or design', imageUrl: skill('drawing-interest') }]

const career01: Task[] = [
  { ...base('career01-opening', 1, 8, 'Career Profile — Step 1'), contentType: 'image', template: 'visual_narrative', contentDescription: 'What strengths and skills might help people complete different work tasks?', steps: [{ id: 'goal', title: 'What can I do?', description: 'Recognize strengths, developing skills, and activities you may want to explore.', imageUrl: skill('skills'), altText: 'Skills symbol' }], actionLabel: 'Build my profile' },
  { ...base('career01-board', 2, 8, 'Build the Career Profile'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Use constructive categories instead of “good at” and “bad at.”', steps: [{ id: 'can', title: 'I can do this', description: 'Something you can do with expected support.', imageUrl: skill('skillful'), altText: 'Person demonstrating a skill' }, { id: 'developing', title: 'I am developing this', description: 'Something you are still practicing.', imageUrl: skill('practice'), altText: 'Person practicing' }, { id: 'explore', title: 'I would like to explore this', description: 'Something you may want to try or learn.', imageUrl: skill('interest'), altText: 'Interest symbol' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('career01-model', 3, 8, 'Strengths and Support'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Needing support is useful planning information, not a negative judgment.', steps: [{ id: 'strength', title: 'Follows steps and organizes materials', description: 'These may be strengths for orderly work.', imageUrl: skill('organizing'), altText: 'Organizing materials' }, { id: 'support', title: 'Still practicing customer conversations', description: 'Practice or support may help with customer-facing tasks.', imageUrl: skill('customer-service'), altText: 'Customer service' }], actionLabel: 'Try classifying' },
  { ...base('career01-classify', 4, 8, 'Strength, Skill, or Developing Area?'), contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort each example into the best planning category.', items: [{ id: 'instructions', label: 'Can follow a three-step work instruction' }, { id: 'program', label: 'Still learning a computer program' }, { id: 'layouts', label: 'Shows ability in drawing layouts' }], categories: [{ id: 'strength', label: 'Strength or skill' }, { id: 'developing', label: 'Developing area' }], sortAnswers: { instructions: 'strength', program: 'developing', layouts: 'strength' }, correctFeedback: 'Correct. Skills may already be demonstrated or still developing.', retryFeedback: 'Look for what the person can do and what they are still practicing.', layout: { size: 'wide' } },
  { ...base('career01-can', 5, 8, 'Things I Can Do'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', scored: false, question: 'Choose any activities you believe you can do. “Not sure yet” is also okay.', items: [...profileItems, { id: 'unsure', label: 'Not sure yet' }], correctItemIds: [], correctFeedback: 'Your choices have been saved as self-reported strengths.', retryFeedback: 'Choose any response that fits you.', contentDescription: 'Personal responses are not automatically verified or scored.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('career01-developing', 6, 8, 'Things I Am Developing'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', scored: false, question: 'Which activities are you still learning or would like to practice?', items: profileItems, correctItemIds: [], correctFeedback: 'Your developing areas have been saved for supported reflection.', retryFeedback: 'Choose any activity you are learning or want to practice.', contentDescription: 'Needing practice or support does not mean a person cannot work or contribute.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('career01-connection', 7, 8, 'One Skill, Several Workplaces'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'Where might organizing materials be useful?', items: [{ id: 'office', label: 'Office files' }, { id: 'stock', label: 'Stock room' }, { id: 'kitchen', label: 'Kitchen preparation area' }, { id: 'workshop', label: 'Workshop materials' }], correctItemIds: ['office', 'stock', 'kitchen', 'workshop'], correctFeedback: 'Correct. One skill may be useful in several work contexts.', retryFeedback: 'Organizing can support each of these work areas.', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('career01-complete', 8, 8, 'Career Profile Step 1 Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Teacher observation should supplement, not silently replace, the learner’s self-report.', steps: [{ id: 'summary', title: 'Know strengths and developing skills', description: 'This can guide what to practice and which work or training options to explore.', imageUrl: '/assets/pre-vocational/prev-01/skills-and-responsibilities.png', altText: 'Skills and responsibilities' }], actionLabel: 'Finish step' },
]

const career02: Task[] = [
  { ...base('career02-opening', 1, 8, 'Career Match Lab'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'Can organizing materials be useful in more than one type of work?', choices: ['Yes', 'No'], answer: 'Yes', correctFeedback: 'Correct. One skill may connect to several work contexts.', retryFeedback: 'Think about offices, stock rooms, kitchens, and workshops.', imageUrl: skill('organizing'), contentDescription: 'Career matching explores possibilities; it does not assign one perfect job.' },
  { ...base('career02-model', 2, 8, 'Skill → Possible Opportunities'), contentType: 'image', template: 'visual_narrative', contentDescription: 'A skill can make opportunities worth exploring without guaranteeing a job.', steps: [{ id: 'skill', title: 'Caring for plants', description: 'A demonstrated or developing skill.', imageUrl: skill('gardening'), altText: 'Gardening' }, { id: 'options', title: 'Possible work contexts', description: 'Gardening, nursery work, plant production, or landscaping support.', imageUrl: skill('raised-garden-bed'), altText: 'Raised garden bed' }], actionLabel: 'Start matching' },
  { ...base('career02-match', 3, 8, 'Match Skills to Work'), contentType: 'interactive', taskTemplate: 'matching_pairs', question: 'Match each skill with a plausible work opportunity.', pairs: [{ id: 'computer', left: { id: 'computer-skill', label: 'Uses a computer', imageUrl: skill('using-computer') }, right: { id: 'ict', label: 'ICT or office digital support' } }, { id: 'food', left: { id: 'food-skill', label: 'Follows food-preparation steps', imageUrl: skill('meal-preparation') }, right: { id: 'kitchen', label: 'Kitchen or food-production tasks' } }, { id: 'sewing', left: { id: 'sewing-skill', label: 'Demonstrates sewing ability', imageUrl: skill('handicrafts') }, right: { id: 'tailoring', label: 'Tailoring or garment work', imageUrl: skill('tailoring') } }], correctFeedback: 'Correct. Each opportunity could use the stated skill.', retryFeedback: 'Look at the actual work tasks and the skill they require.', layout: { size: 'wide' } },
  { ...base('career02-why', 4, 8, 'Why Might It Fit?'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Why might an organized person fit stock-room work?', choices: ['Items need to be arranged and tracked', 'The job always requires singing', 'The job is always outdoors'], answer: 'Items need to be arranged and tracked', correctFeedback: 'Correct. Organization supports arranging and tracking stock.', retryFeedback: 'Which answer describes an actual stock-room task?', imageUrl: skill('organizing') },
  { ...base('career02-multiple', 5, 8, 'One Skill, Multiple Possibilities'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'Where could computer skills be useful?', items: [{ id: 'ict', label: 'ICT support', imageUrl: '/assets/career/technical-support.png' }, { id: 'office', label: 'Office digital work', imageUrl: skill('organizing') }, { id: 'printing', label: 'Printing or computer service', imageUrl: '/assets/career/printing-service.png' }, { id: 'unrelated', label: 'A role with no computer tasks' }], correctItemIds: ['ict', 'office', 'printing'], correctFeedback: 'Correct. Computer skills may support several work opportunities.', retryFeedback: 'Choose roles that actually use digital tools.', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('career02-explore', 6, 8, 'Explore a Skill Again'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', scored: false, question: 'Choose a skill you want to connect with possible work or training.', items: profileItems, correctItemIds: [], correctFeedback: 'Your selected skill is ready for teacher-guided exploration.', retryFeedback: 'Choose any skill you want to explore.', contentDescription: 'This reflection does not generate an automated aptitude result.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('career02-check', 7, 8, 'Does One Skill Fit Only One Job?'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'Does one skill only fit one possible job?', choices: ['Yes', 'No'], answer: 'No', correctFeedback: 'Correct. Skills may be useful in different jobs and pathways.', retryFeedback: 'Think about how organizing or computer skills apply in several settings.' },
  { ...base('career02-complete', 8, 8, 'Career Match Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Actual planning should also consider goals, training, support, qualifications, and local opportunities.', steps: [{ id: 'summary', title: 'Explore more than one possibility', description: 'Skills can connect to several possible work or training opportunities.', imageUrl: skill('opportunities'), altText: 'Opportunities symbol' }], actionLabel: 'Finish lab' },
]

const career03: Task[] = [
  { ...base('career03-opening', 1, 8, 'Workplace Decision Simulator'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Which response is more helpful for a scheduled work task?', choices: ['Arrive at the expected time and prepare materials', 'Repeatedly arrive late without explanation'], answer: 'Arrive at the expected time and prepare materials', correctFeedback: 'Correct. Being ready on time supports the work.', retryFeedback: 'Which response helps the task begin as expected?', contentDescription: 'Consider which response helps the work begin. The illustration represents work responsibilities.' },
  { ...base('career03-attitudes', 2, 8, 'Helpful Attitudes in Context'), contentType: 'image', template: 'visual_narrative', contentDescription: 'These are instructional examples, not judgments about disability or support needs.', steps: [{ id: 'ready', title: 'Responsibility and punctuality', description: 'Prepare and arrive at the expected time.' }, { id: 'effort', title: 'Diligence and effort', description: 'Work carefully and continue appropriately.' }, { id: 'team', title: 'Cooperation and respect', description: 'Work constructively with others.' }, { id: 'learn', title: 'Willingness to learn', description: 'Ask for clarification or support when needed.' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('career03-distinction', 3, 8, 'Skill Problem or Attitude Problem?'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'Alex does not know a new task and asks the supervisor for help. Is asking for help a negative attitude?', choices: ['Yes', 'No'], answer: 'No', correctFeedback: 'Correct. Not knowing is different from refusing to learn; asking for help can be responsible.', retryFeedback: 'Needing instruction is not automatically a poor work attitude.', imageUrl: '/assets/functional-academics/func-01/ask-for-help.png' },
  { ...base('career03-difficult', 4, 8, 'A Task Is Difficult'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Which response helps the work continue?', choices: ['Ask for clarification and try again', 'Leave without telling anyone'], answer: 'Ask for clarification and try again', correctFeedback: 'Correct. Clarification can help the person complete the task properly.', retryFeedback: 'Which response communicates the difficulty and supports another attempt?' },
  { ...base('career03-mistake', 5, 8, 'Respond to a Mistake'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'A person makes a mistake. Which response is more helpful?', choices: ['Hide it and continue', 'Tell the appropriate person and ask how to correct it'], answer: 'Tell the appropriate person and ask how to correct it', correctFeedback: 'Correct. A mistake is not automatically a poor attitude; the response matters.', retryFeedback: 'Which response helps address and correct the mistake?' },
  { ...base('career03-effects', 6, 8, 'Match Attitudes to Effects'), contentType: 'interactive', taskTemplate: 'matching_pairs', question: 'Match each behavior with its likely workplace effect.', pairs: [{ id: 'punctual', left: { id: 'punctuality', label: 'Punctuality' }, right: { id: 'ready', label: 'Ready when work begins' } }, { id: 'diligent', left: { id: 'diligence', label: 'Diligence' }, right: { id: 'effort', label: 'Careful and continued effort' } }, { id: 'ignore', left: { id: 'ignoring', label: 'Repeatedly ignoring instructions' }, right: { id: 'interfere', label: 'May interfere with safe task completion' } }], correctFeedback: 'Correct. Attitudes and responses can affect how work continues.', retryFeedback: 'Consider the practical result of each behavior.', layout: { size: 'wide' } },
  { ...base('career03-reflect', 7, 8, 'An Attitude I Want to Practice'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', scored: false, question: 'Choose any helpful work attitude you would like to practice more.', items: [{ id: 'prepared', label: 'Arriving prepared' }, { id: 'help', label: 'Asking for help appropriately' }, { id: 'finish', label: 'Finishing a task' }, { id: 'cooperate', label: 'Cooperating' }, { id: 'retry', label: 'Trying again after a mistake' }], correctItemIds: [], correctFeedback: 'Your reflection has been saved.', retryFeedback: 'Choose any attitude you would like to practice.', contentDescription: 'Personal reflection is non-scored.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('career03-complete', 8, 8, 'Career Scenario Lab Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Work attitudes should be considered across repeated observations, not one event or EEG state.', steps: [{ id: 'summary', title: 'Learn, cooperate, complete', description: 'Helpful attitudes support responsibility, learning, cooperation, and appropriate task completion.', imageUrl: '/assets/pre-vocational/prev-01/skills-and-responsibilities.png', altText: 'Responsibilities symbol' }], actionLabel: 'Finish lab' },
]

export const mockCareerLessons = [
  { id: 'CAREER-01', title: 'My Strengths and Skills', tasks: career01 },
  { id: 'CAREER-02', title: 'My Skills and Possible Jobs', tasks: career02 },
  { id: 'CAREER-03', title: 'Helpful Attitudes at Work', tasks: career03 },
] as const


// Keep previews aligned with the same six modest content refinements.
for (const refinement of refinements) {
  const lesson = mockCareerLessons.find(item => item.id === refinement.lesson_id)
  if (!lesson) continue
  const changes = refinement.changes
  const task = lesson.tasks[refinement.position]
  if (changes.question) task.question = changes.question
  if (changes.correct_feedback) task.correctFeedback = changes.correct_feedback
  if (changes.retry_feedback) task.retryFeedback = changes.retry_feedback
  if (changes.content_description) task.contentDescription = changes.content_description
  if (changes.steps) task.steps = changes.steps.map(step => ({id: step.id, title: step.title, description: step.description, imageUrl: step.image_url, altText: step.alt_text}))
}

const reusedCareerAssets: Record<string, string> = careerAssetReuse
function attachCareerImages(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(attachCareerImages); return }
  if (!value || typeof value !== "object") return
  const item = value as Record<string, unknown>
  const label = String(item.label ?? item.title ?? "")
  if (reusedCareerAssets[label] && !item.imageUrl) { item.imageUrl = reusedCareerAssets[label]; item.altText = `Supporting illustration: ${label}` }
  Object.values(item).forEach(attachCareerImages)
}
mockCareerLessons.forEach(lesson => attachCareerImages(lesson.tasks))
// A generic responsibility symbol replaces the old missing-scene note.
career03[0].imageUrl = "/assets/pre-vocational/prev-01/skills-and-responsibilities.png"
career03[0].contentDescription = "Consider which response helps the work begin. The illustration represents work responsibilities."

// The same two revision definitions are used by the history-preserving publisher.
function careerRevisionConfiguration(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(careerRevisionConfiguration)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    careerRevisionConfiguration(item),
  ]))
}
for (const [position, replacement] of Object.entries(career01Revision.replacements)) {
  const index = Number(position)
  const previous = career01[index]
  career01[index] = {
    ...base(previous.id + '/' + career01Revision.revision, index + 1, 8, replacement.title),
    ...careerRevisionConfiguration(replacement.configuration) as Partial<Task>,
    contentType: replacement.type as Task['contentType'],
  }
}

for (const [position, replacement] of Object.entries(career03Revision.replacements)) {
  const index = Number(position)
  const previous = career03[index]
  career03[index] = {
    ...base(previous.id + '/' + career03Revision.revision, index + 1, 8, replacement.title),
    ...careerRevisionConfiguration(replacement.configuration) as Partial<Task>,
    contentType: replacement.type as Task['contentType'],
  }
}
