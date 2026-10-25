import type { Task } from '../types'

const base = (id: string, index: number, total: number, title: string): Pick<Task, 'id' | 'index' | 'total' | 'title' | 'imageUrl' | 'package' | 'question' | 'choices' | 'answer'> => ({ id, index, total, title, imageUrl: null, package: 'livelihood', question: '', choices: [], answer: '' })
const prev = (name: string) => `/assets/pre-vocational/common/${name}.png`
const live = (name: string) => `/assets/livelihood/common/${name}.png`

const imageByLabel: Record<string, string> = {
  Vegetables: live('plants'),
  'Harvested produce': live('plants'),
  'Garden work': live('farming'),
  'Useful plants and food': live('plants'),
  'Practical skills': live('farming'),
  'Watering can': live('watering-can'),
  'Hand trowel': live('hand-trowel'),
  'Measuring tape': live('measuring-tape'),
  'Measuring tool': live('measuring-tape'),
  Task: live('water-drop'),
  'Function needed': live('water-drop'),
  Choose: live('watering-can'),
  'Loosen soil with a trowel': live('hand-trowel'),
  'Place the seed or seedling': live('planting'),
  'Water with a watering can': live('watering-can'),
  'Inspect before selecting': live('seed-inspection'),
  Inspect: live('seed-inspection'),
  Compare: live('seed-variety'),
  Select: live('choose-seed'),
  'Seed A': live('quality-seed'),
  'Seed B': live('seed-variety'),
  'Seed sample 1': live('quality-seed'),
  'Seed sample 2': live('seed-variety'),
  'Seed sample 3': live('choose-seed'),
  'Validation required': live('quality-seed'),
  'Assessment locked': live('seed-inspection'),
  'Planting space is limited': live('planting'),
  'Use real seed samples': live('quality-seed'),
  'Inspect, compare, select': live('checklist'),
}

const taskImageById: Record<string, string> = {
  'live02-mismatch': prev('handicrafts'),
  'live03-demo': live('seed-inspection'),
}

const descriptionById: Record<string, string> = {
  'live02-order': 'Choose from the supplied watering, digging, and measuring tools.',
  'live02-bench': 'Inspect each supplied gardening tool and its primary use.',
  'live02-dig': 'Choose the correct tool from the supplied tool images.',
  'live02-measure': 'Choose the correct tool from the supplied tool images.',
  'live02-mismatch': 'The scissors illustration represents a cutting-tool mismatch for a watering task.',
  'live02-sequence': 'Prepare the supplied tools for a three-step garden task.',
}

function withSuppliedAssets(task: Task): Task {
  return {
    ...task,
    imageUrl: taskImageById[task.id] ?? task.imageUrl,
    contentDescription: descriptionById[task.id] ?? task.contentDescription,
    steps: task.steps?.map((step) => ({ ...step, imageUrl: step.imageUrl ?? imageByLabel[step.title], altText: step.altText ?? step.title })),
    items: task.items?.map((item) => ({ ...item, imageUrl: item.imageUrl ?? imageByLabel[item.label], altText: item.altText ?? item.label })),
    pairs: task.pairs?.map((pair) => ({ ...pair, left: { ...pair.left, imageUrl: pair.left.imageUrl ?? imageByLabel[pair.left.label], altText: pair.left.altText ?? pair.left.label }, right: { ...pair.right, imageUrl: pair.right.imageUrl ?? imageByLabel[pair.right.label], altText: pair.right.altText ?? pair.right.label } })),
  }
}

const live01: Task[] = [
  { ...base('live01-mission', 1, 8, 'Garden Mission 1: Why Gardening Matters'), contentType: 'image', template: 'visual_narrative', contentDescription: 'A family uses a small space to grow pechay and tomatoes.', steps: [{ id: 'mission', title: 'How could this garden help?', description: 'Explore practical benefits for people, households, and communities.', imageUrl: prev('raised-garden-bed'), altText: 'Raised garden bed with vegetables' }], actionLabel: 'Explore the garden' },
  { ...base('live01-explore', 2, 8, 'Explore the Garden'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Select useful parts of a productive garden.', steps: [{ id: 'food', title: 'Vegetables', description: 'Gardening can produce food.', imageUrl: prev('gardening'), altText: 'Gardening activity' }, { id: 'harvest', title: 'Harvested produce', description: 'Garden products may be used at home or sold.', imageUrl: prev('product'), altText: 'Product ready for use or sale' }, { id: 'work', title: 'Garden work', description: 'Caring for plants develops practical skills.', imageUrl: prev('developing-skills'), altText: 'Person developing practical skills' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('live01-concept', 3, 8, 'Why Gardening Is Important'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Gardening can be productive without guaranteeing income.', steps: [{ id: 'plants', title: 'Useful plants and food', description: 'Grow vegetables, herbs, or other useful plants.' }, { id: 'skills', title: 'Practical skills', description: 'Practice planting, watering, and responsible care.' }, { id: 'livelihood', title: 'Possible livelihood', description: 'Some garden products may be sold when conditions allow.' }], actionLabel: 'Start the mission' },
  { ...base('live01-match', 4, 8, 'Why Does This Garden Matter?'), contentType: 'interactive', taskTemplate: 'matching_pairs', question: 'Match each garden situation with its benefit.', pairs: [{ id: 'meals', left: { id: 'household', label: 'A household grows vegetables' }, right: { id: 'food', label: 'Helps provide food' } }, { id: 'sell', left: { id: 'plants', label: 'A person raises ornamental plants' }, right: { id: 'product', label: 'May provide a product to sell' } }, { id: 'practise', left: { id: 'learner', label: 'A learner plants and waters' }, right: { id: 'skill', label: 'Develops practical skills' } }], correctFeedback: 'Correct. Each garden situation provides a practical benefit.', retryFeedback: 'Look at what the garden produces or what the person practices.', layout: { size: 'wide' } },
  { ...base('live01-useful', 5, 8, 'Useful or Not Related?'), contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort the statements by whether they show why gardening matters.', items: [{ id: 'vegetables', label: 'Produces vegetables' }, { id: 'skills', label: 'Develops gardening skills' }, { id: 'livelihood', label: 'May support a livelihood' }, { id: 'phone', label: 'Makes a phone charge faster' }], categories: [{ id: 'benefit', label: 'Gardening benefit' }, { id: 'unrelated', label: 'Not related' }], sortAnswers: { vegetables: 'benefit', skills: 'benefit', livelihood: 'benefit', phone: 'unrelated' }, correctFeedback: 'Correct. Gardening can produce useful plants, build skills, and may support livelihood.', retryFeedback: 'Ask whether the statement is a practical result of gardening.', layout: { size: 'wide' } },
  { ...base('live01-home', 6, 8, 'A Garden at Home or School'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'What could a small garden be used for? Choose all meaningful answers.', items: [{ id: 'vegetables', label: 'Grow vegetables', imageUrl: prev('raised-garden-bed') }, { id: 'herbs', label: 'Grow herbs', imageUrl: prev('gardening') }, { id: 'sale', label: 'Grow plants for possible sale', imageUrl: prev('product') }, { id: 'skills', label: 'Practice gardening skills', imageUrl: prev('developing-skills') }], correctItemIds: ['vegetables', 'herbs', 'sale', 'skills'], correctFeedback: 'Correct. A garden may have several useful purposes.', retryFeedback: 'Each visible choice is a meaningful possible use of a garden.', layout: { size: 'wide', preferredColumns: 4 } },
  { ...base('live01-reason', 7, 8, 'One Important Reason'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Why can gardening be important?', choices: ['It can provide useful plants or food and build practical skills', 'It always guarantees income', 'It replaces every other kind of work'], answer: 'It can provide useful plants or food and build practical skills', correctFeedback: 'Correct. Gardening has practical benefits without guaranteeing income.', retryFeedback: 'Choose the answer supported by realistic garden outcomes.' },
  { ...base('live01-complete', 8, 8, 'Garden Mission Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'You identified how gardening can be useful in everyday life.', steps: [{ id: 'summary', title: 'Grow, care, use', description: 'Gardening can provide useful plants, develop skills, and may support livelihood.', imageUrl: prev('gardening'), altText: 'Person gardening' }], actionLabel: 'Finish mission' },
]

const toolItems = [{ id: 'watering-can', label: 'Watering can' }, { id: 'trowel', label: 'Hand trowel' }, { id: 'measuring-tape', label: 'Measuring tape' }]
const live02: Task[] = [
  { ...base('live02-order', 1, 8, 'Garden Mission 2: Tool Bench'), contentType: 'interactive', taskTemplate: 'picture_choice', question: 'WORK ORDER: Water the seedlings. Which tool should you take?', items: toolItems, correctItemIds: ['watering-can'], correctFeedback: 'Correct. A watering can matches the watering task.', retryFeedback: 'Which tool is made for giving water to plants?', contentDescription: 'PNG assets needed: watering can, hand trowel, and measuring tape.' },
  { ...base('live02-bench', 2, 8, 'Explore the Tool Bench'), contentType: 'image', template: 'visual_narrative', contentDescription: 'PNG assets needed: individual gardening tools on a simple workbench.', steps: [{ id: 'trowel', title: 'Hand trowel', description: 'Used for small digging or soil work.' }, { id: 'watering', title: 'Watering can', description: 'Used to give water to plants.' }, { id: 'measure', title: 'Measuring tool', description: 'Used when a garden task requires measurement.' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('live02-model', 3, 8, 'Task → Function → Tool'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Choose a tool according to the work that needs to be done.', steps: [{ id: 'task', title: 'Task', description: 'Water the plants.' }, { id: 'function', title: 'Function needed', description: 'A tool that carries and pours water.' }, { id: 'tool', title: 'Choose', description: 'Use the watering can.' }], actionLabel: 'Start work orders' },
  { ...base('live02-dig', 4, 8, 'Work Order: Loosen the Soil'), contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Which tool best fits small digging and soil work?', items: toolItems, correctItemIds: ['trowel'], correctFeedback: 'Correct. A hand trowel is suitable for small soil work.', retryFeedback: 'Which tool is used for digging rather than watering or measuring?', contentDescription: 'PNG assets needed: gardening tool choices.' },
  { ...base('live02-measure', 5, 8, 'Work Order: Measure the Garden Bed'), contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Which tool should you choose to measure the garden bed?', items: toolItems, correctItemIds: ['measuring-tape'], correctFeedback: 'Correct. A measuring tape matches the measuring task.', retryFeedback: 'Which tool shows length or distance?', contentDescription: 'PNG assets needed: gardening tool choices.' },
  { ...base('live02-mismatch', 6, 8, 'Tool Mismatch Challenge'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'The task is to water a seedling. Is a cutting tool the correct choice?', choices: ['Yes', 'No'], answer: 'No', correctFeedback: 'Correct. Choose a watering tool instead.', retryFeedback: 'Compare the tool function with the watering task.', contentDescription: 'PNG needed: cutting tool beside a seedling.' },
  { ...base('live02-sequence', 7, 8, 'Prepare for a Garden Task'), contentType: 'interactive', taskTemplate: 'sequence_order', question: 'Arrange the work and tool choices in order: loosen soil, plant, then water.', items: [{ id: 'loosen', label: 'Loosen soil with a trowel' }, { id: 'plant', label: 'Place the seed or seedling' }, { id: 'water', label: 'Water with a watering can' }], correctOrder: ['loosen', 'plant', 'water'], correctFeedback: 'Correct. You prepared the work in a sensible order.', retryFeedback: 'Begin with the soil, then plant, then water.', contentDescription: 'PNG assets needed: three-step garden task sequence.' },
  { ...base('live02-complete', 8, 8, 'Tool Bench Mission Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Tool recognition does not prove safe physical operation.', steps: [{ id: 'summary', title: 'Match the tool to the task', description: 'Choose gardening tools according to the work that needs to be done.' }], actionLabel: 'Finish mission' },
]

const live03: Task[] = [
  { ...base('live03-briefing', 1, 8, 'Garden Mission 3: Seed Inspector'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Seed images and exact quality criteria require Panorama/SPED validation.', steps: [{ id: 'brief', title: 'Inspect before selecting', description: 'Not every seed should automatically be selected for planting.' }], actionLabel: 'Begin inspection' },
  { ...base('live03-process', 2, 8, 'Inspect → Compare → Select'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Use only quality characteristics approved by Panorama.', steps: [{ id: 'inspect', title: 'Inspect', description: 'Look closely at the seed.' }, { id: 'compare', title: 'Compare', description: 'Use the approved reference characteristics.' }, { id: 'select', title: 'Select', description: 'Choose only after inspection and comparison.' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('live03-demo', 3, 8, 'Inspection Demonstration'), contentType: 'video', template: 'instructional_video', contentLabel: 'Video needed: two contrasting seed examples under magnification', contentDescription: 'Final narration must use Panorama-approved quality characteristics.', durationSeconds: 35, actionLabel: 'I watched the demonstration' },
  { ...base('live03-check-process', 4, 8, 'What Should You Do First?'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Before selecting a seed for planting, what should you do first?', choices: ['Inspect it carefully', 'Select every seed automatically', 'Ignore the taught characteristics'], answer: 'Inspect it carefully', correctFeedback: 'Correct. Inspect before comparing and selecting.', retryFeedback: 'Follow the inspection process introduced in this mission.' },
  { ...base('live03-compare', 5, 8, 'Compare Two Seeds'), contentType: 'interactive', taskTemplate: 'picture_choice', question: 'Which seed matches the approved quality characteristics?', items: [{ id: 'seed-a', label: 'Seed A' }, { id: 'seed-b', label: 'Seed B' }], correctItemIds: ['seed-a'], correctFeedback: 'Answer key pending: replace after seed visuals and criteria are approved.', retryFeedback: 'Inspect both seeds and compare them with the approved reference.', contentDescription: 'PLACEHOLDER ONLY — seed images and answer key require Panorama approval.', scored: false },
  { ...base('live03-tray', 6, 8, 'Seed Inspection Tray'), contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort the approved seed examples after inspecting them.', items: [{ id: 'sample-1', label: 'Seed sample 1' }, { id: 'sample-2', label: 'Seed sample 2' }, { id: 'sample-3', label: 'Seed sample 3' }], categories: [{ id: 'select', label: 'Select for planting' }, { id: 'reject', label: 'Do not select' }], sortAnswers: { 'sample-1': 'select', 'sample-2': 'reject', 'sample-3': 'select' }, correctFeedback: 'Answer key pending approved seed visuals.', retryFeedback: 'Compare each seed with the approved reference.', contentDescription: 'PLACEHOLDER ONLY — do not use for assessment until criteria, images, and keys are validated.' },
  { ...base('live03-application', 7, 8, 'Prepare Seeds for a Small Garden'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Teacher-guided physical inspection is recommended after digital practice.', steps: [{ id: 'limit', title: 'Planting space is limited', description: 'Inspect planting materials carefully before choosing.' }, { id: 'transfer', title: 'Use real seed samples', description: 'Apply the same approved inspection process with teacher supervision.' }], actionLabel: 'Continue' },
  { ...base('live03-complete', 8, 8, 'Seed Inspection Complete'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Final assessment remains locked until the quality criteria and seed visuals are validated.', steps: [{ id: 'summary', title: 'Inspect, compare, select', description: 'Select seeds using the specific quality characteristics taught and approved.' }], actionLabel: 'Finish mission' },
]

export const mockLiveLessons = [
  { id: 'LIVE-01', title: 'Why Gardening Matters', tasks: live01.map(withSuppliedAssets) },
  { id: 'LIVE-02', title: 'Choose the Right Garden Tool', tasks: live02.map(withSuppliedAssets) },
  { id: 'LIVE-03', title: 'Choose Good Seeds for Planting', tasks: live03.map(withSuppliedAssets) },
] as const
