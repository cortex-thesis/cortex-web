import type { Task } from '../types'

const base = (id: string, index: number, total: number, title: string): Pick<Task, 'id' | 'index' | 'total' | 'title' | 'imageUrl' | 'package' | 'question' | 'choices' | 'answer'> => ({ id, index, total, title, imageUrl: null, package: 'pre_vocational', question: '', choices: [], answer: '' })

const common = (name: string) => `/assets/pre-vocational/common/${name}.png`
const imageByLabel: Record<string, string> = {
  Interest: common('interest'),
  'Skill or capability': common('skills'),
  Practice: common('practice'),
  'Ana enjoys drawing': common('drawing-interest'),
  'Marco likes computers': common('computer-interest'),
  Gardening: common('gardening'),
  'Food preparation': common('meal-preparation'),
  'Using a computer': common('using-computer'),
  'Drawing or design': common('drawing-interest'),
  'Organizing materials': common('organizing'),
  Music: common('music'),
  'Care for plants': common('gardening'),
  'Prepare food': common('meal-preparation'),
  'Use technology': common('using-computer'),
  'Organize materials': common('organizing'),
  'Help with household tasks': common('household-tasks'),
  Product: common('product'),
  Service: common('customer-service'),
  'Grow vegetables': common('raised-garden-bed'),
  'Repair computers': common('appliance-repair'),
  Tailoring: common('tailoring'),
  'Computer repair': common('appliance-repair'),
  'Food processing': common('dairy-products'),
  'Selling baked goods': common('product'),
  'Repairing electronics for customers': common('appliance-repair'),
  'Growing vegetables for sale': common('raised-garden-bed'),
  'Food selling': common('product'),
  'Computer service': common('customer-service'),
  'Repair work': common('repair'),
  Activity: common('skills'),
  Opportunity: common('opportunities'),
  'People need device repairs': common('appliance-repair'),
  'Tailoring service': common('tailoring'),
  'Grow and sell vegetables': common('raised-garden-bed'),
  'Electronics or computer repair': common('repair'),
}

const taskImageById: Record<string, string> = {
  'prev01-practice': common('practice'),
  'prev02-service': common('appliance-repair'),
  'prev03-orientation': common('opportunities'),
  'prev03-snacks': common('product'),
  'prev03-tailoring': common('tailoring'),
  'prev03-fit': common('repair'),
}

function withSuppliedAssets(task: Task): Task {
  return {
    ...task,
    imageUrl: taskImageById[task.id] ?? task.imageUrl,
    steps: task.steps?.map((step) => ({ ...step, imageUrl: step.imageUrl ?? imageByLabel[step.title], altText: step.altText ?? step.title })),
    items: task.items?.map((item) => ({ ...item, imageUrl: item.imageUrl ?? imageByLabel[item.label], altText: item.altText ?? item.label })),
    pairs: task.pairs?.map((pair) => ({ ...pair, left: { ...pair.left, imageUrl: pair.left.imageUrl ?? imageByLabel[pair.left.label], altText: pair.left.altText ?? pair.left.label }, right: { ...pair.right, imageUrl: pair.right.imageUrl ?? imageByLabel[pair.right.label], altText: pair.right.altText ?? pair.right.label } })),
  }
}

const prev01: Task[] = [
  { ...base('prev01-orientation', 1, 8, 'My Capabilities, Interests, and Skills'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Recognize activities you enjoy and abilities you are developing.', steps: [{ id: 'goal', title: 'Know what interests you', description: 'Interests and skills can guide what you choose to practise.', imageUrl: '/assets/pre-vocational/prev-01/skills-and-responsibilities.png', altText: 'Document, gear, and check mark representing skills and responsibilities' }], actionLabel: 'Continue' },
  { ...base('prev01-concepts', 2, 8, 'Interest and Skill'), contentType: 'image', template: 'visual_narrative', contentDescription: 'An interest can become a stronger skill through practice.', steps: [{ id: 'interest', title: 'Interest', description: 'Something you like or want to explore.' }, { id: 'skill', title: 'Skill or capability', description: 'Something you can do or are learning to do.' }, { id: 'practice', title: 'Practice', description: 'A way to develop an interest or skill.' }], actionLabel: 'Continue', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('prev01-model', 3, 8, 'Drawing and Computers'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Interests and skills are related, but they are not always the same.', steps: [{ id: 'ana', title: 'Ana enjoys drawing', description: 'Drawing is her interest and a skill she is developing.' }, { id: 'marco', title: 'Marco likes computers', description: 'His interest can guide what he practises next.' }], actionLabel: 'Try classifying' },
  { ...base('prev01-classify', 4, 8, 'Interest, Skill, or Both?'), contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort each example into the best group.', items: [{ id: 'plants', label: 'Likes caring for plants' }, { id: 'tools', label: 'Can arrange tools correctly' }, { id: 'singing', label: 'Enjoys singing and practises songs' }], categories: [{ id: 'interest', label: 'Interest' }, { id: 'skill', label: 'Skill or capability' }, { id: 'both', label: 'Can be both' }], sortAnswers: { plants: 'interest', tools: 'skill', singing: 'both' }, correctFeedback: 'Correct. Interests describe what a person likes; skills describe what a person can do or is learning.', retryFeedback: 'Think about whether the example shows enjoyment, demonstrated ability, or both.', contentDescription: 'These examples are simplified for practice.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('prev01-choice', 5, 8, 'Activities I Am Interested In'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'Choose any activities you are interested in. There is no wrong answer.', items: [{ id: 'gardening', label: 'Gardening' }, { id: 'cooking', label: 'Food preparation' }, { id: 'computer', label: 'Using a computer' }, { id: 'drawing', label: 'Drawing or design' }, { id: 'organizing', label: 'Organizing materials' }, { id: 'music', label: 'Music' }], correctItemIds: [], correctFeedback: 'Your interests can help you choose what to explore.', retryFeedback: 'Choose any activity you would like to explore.', contentDescription: 'Personal choices are self-reported and are not scored as ability.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('prev01-skills', 6, 8, 'Skills I Use or Am Learning'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'Choose activities you can do or are learning to do.', items: [{ id: 'plants', label: 'Care for plants' }, { id: 'food', label: 'Prepare food' }, { id: 'ict', label: 'Use technology' }, { id: 'materials', label: 'Organize materials' }, { id: 'crafts', label: 'Make crafts' }, { id: 'household', label: 'Help with household tasks' }], correctItemIds: [], correctFeedback: 'Skills can grow with practice and support.', retryFeedback: 'Choose any activity you do or are learning.', contentDescription: 'This is a supported self-reflection, not a scored test.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('prev01-practice', 7, 8, 'What Would Help Me Improve?'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Which of these can help a person improve a skill?', choices: ['Practice, instruction, and suitable tools', 'Never trying the activity', 'Being an expert immediately'], answer: 'Practice, instruction, and suitable tools', correctFeedback: 'Correct. Skills can grow through practice, support, and training.', retryFeedback: 'Think about what helps someone learn and improve.', contentDescription: 'Choose one helpful approach.' },
  { ...base('prev01-summary', 8, 8, 'Know Your Strengths and Interests'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Teacher observation may supplement self-reported skills.', steps: [{ id: 'summary', title: 'Choose, practise, improve', description: 'Knowing your interests and developing skills can guide future activities.', imageUrl: '/assets/pre-vocational/prev-01/skills-and-responsibilities.png', altText: 'Skills and responsibilities symbol' }], actionLabel: 'Finish lesson' },
]

const prev02: Task[] = [
  { ...base('prev02-orientation', 1, 8, 'Livelihood Activities Around Us'), contentType: 'image', template: 'visual_narrative', contentDescription: 'People produce goods and provide services to help earn a living.', steps: [{ id: 'goal', title: 'Look around the community', description: 'Recognize familiar livelihood and entrepreneurial activities.', imageUrl: '/assets/pre-vocational/prev-02/community-store.png', altText: 'Community store' }], actionLabel: 'Continue' },
  { ...base('prev02-types', 2, 8, 'Products and Services'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Livelihood activities can provide products or services.', steps: [{ id: 'product', title: 'Product', description: 'Something made, grown, or sold, such as food, vegetables, or clothing.' }, { id: 'service', title: 'Service', description: 'Useful work done for another person, such as tailoring or repair.' }], actionLabel: 'Continue' },
  { ...base('prev02-model', 3, 8, 'Activity to Product or Service'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Connect the work with what it provides.', steps: [{ id: 'garden', title: 'Grow vegetables', description: 'Produces vegetables that can be sold.' }, { id: 'repair', title: 'Repair computers', description: 'Provides a technical service.' }], actionLabel: 'Try matching' },
  { ...base('prev02-match', 4, 8, 'Match the Livelihood Activity'), contentType: 'interactive', taskTemplate: 'matching_pairs', question: 'Match each activity with what it provides.', pairs: [{ id: 'tailoring', left: { id: 'tailor', label: 'Tailoring' }, right: { id: 'clothes', label: 'Clothing or alteration service' } }, { id: 'gardening', left: { id: 'garden', label: 'Gardening' }, right: { id: 'vegetables', label: 'Vegetables or plants' } }, { id: 'repair', left: { id: 'repair', label: 'Computer repair' }, right: { id: 'technical', label: 'Technical service' } }, { id: 'food', left: { id: 'processing', label: 'Food processing' }, right: { id: 'food-product', label: 'Food product' } }], correctFeedback: 'Correct. Each activity connects with a product or service.', retryFeedback: 'Ask what the worker makes, sells, or does for a customer.', layout: { size: 'wide' } },
  { ...base('prev02-livelihood', 5, 8, 'Livelihood or Recreation?'), contentType: 'interactive', taskTemplate: 'sort_groups', question: 'Sort each example by its purpose in this situation.', items: [{ id: 'baked', label: 'Selling baked goods' }, { id: 'electronics', label: 'Repairing electronics for customers' }, { id: 'movie', label: 'Watching a movie for recreation' }, { id: 'vegetables', label: 'Growing vegetables for sale' }], categories: [{ id: 'livelihood', label: 'Livelihood activity' }, { id: 'recreation', label: 'Recreation' }], sortAnswers: { baked: 'livelihood', electronics: 'livelihood', movie: 'recreation', vegetables: 'livelihood' }, correctFeedback: 'Correct. The livelihood examples provide goods or services for customers.', retryFeedback: 'Look for work that produces, sells, or provides something.', layout: { size: 'wide' } },
  { ...base('prev02-service', 6, 8, 'What Is Being Provided?'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'A person repairs a broken appliance for a customer. What are they providing?', choices: ['A repair service', 'A leisure activity', 'A sports event'], answer: 'A repair service', correctFeedback: 'Correct. Repair work provides a service.', retryFeedback: 'Think about the useful work being done for the customer.', contentDescription: 'PNG needed: person repairing an appliance.' },
  { ...base('prev02-community', 7, 8, 'Livelihoods in My Community'), contentType: 'interactive', taskTemplate: 'picture_choice', selectionMode: 'multiple', question: 'Choose livelihood activities you have seen in your community.', items: [{ id: 'food', label: 'Food selling' }, { id: 'store', label: 'Community store', imageUrl: '/assets/pre-vocational/prev-02/community-store.png' }, { id: 'tailoring', label: 'Tailoring' }, { id: 'computer', label: 'Computer service' }, { id: 'repair', label: 'Repair work' }], correctItemIds: [], correctFeedback: 'Communities can have many different livelihood activities.', retryFeedback: 'Choose any examples familiar to you.', contentDescription: 'Community reflection is not scored as one universal answer.', layout: { size: 'wide', preferredColumns: 3 } },
  { ...base('prev02-summary', 8, 8, 'Goods, Services, and Livelihood'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Recognize real work people may use to support a living.', steps: [{ id: 'summary', title: 'People use many kinds of skills', description: 'Livelihood activities can produce goods, sell products, or provide services.', imageUrl: '/assets/pre-vocational/prev-02/community-store.png', altText: 'Community store' }], actionLabel: 'Finish lesson' },
]

const prev03: Task[] = [
  { ...base('prev03-orientation', 1, 8, 'Livelihood Opportunities in My Community'), contentType: 'image', template: 'visual_narrative', contentDescription: 'A community need can point to a useful product or service.', steps: [{ id: 'goal', title: 'Need → Product or service → Opportunity', description: 'Look at what people need and consider how someone could respond.', imageUrl: '/assets/pre-vocational/prev-03/repair-service.png', altText: 'Wrench and screwdriver representing repair service' }], actionLabel: 'Continue' },
  { ...base('prev03-concept', 2, 8, 'Activity and Opportunity'), contentType: 'image', template: 'visual_narrative', contentDescription: 'An opportunity connects a useful activity with a real community need.', steps: [{ id: 'activity', title: 'Activity', description: 'Something a person does, makes, or provides.' }, { id: 'opportunity', title: 'Opportunity', description: 'A possible way to use skills and resources to meet a community need.' }], actionLabel: 'Continue' },
  { ...base('prev03-model', 3, 8, 'A Community Need'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Recognizing an opportunity does not guarantee that a business will succeed.', steps: [{ id: 'need', title: 'People need device repairs', description: 'A trained person with suitable tools could provide a repair service.', imageUrl: '/assets/pre-vocational/prev-03/repair-service.png', altText: 'Repair tools' }], actionLabel: 'Try matching' },
  { ...base('prev03-match', 4, 8, 'Match the Need to an Opportunity'), contentType: 'interactive', taskTemplate: 'matching_pairs', question: 'Match each community need with a suitable livelihood opportunity.', pairs: [{ id: 'clothes', left: { id: 'clothing-need', label: 'Clothes need repair' }, right: { id: 'tailoring', label: 'Tailoring service' } }, { id: 'vegetables', left: { id: 'vegetable-need', label: 'Residents want fresh vegetables' }, right: { id: 'gardening', label: 'Grow and sell vegetables' } }, { id: 'devices', left: { id: 'device-need', label: 'Broken devices need checking' }, right: { id: 'repair', label: 'Electronics or computer repair', imageUrl: '/assets/pre-vocational/prev-03/repair-service.png' } }], correctFeedback: 'Correct. Each opportunity responds to the community need.', retryFeedback: 'Choose the product or service that directly addresses the need.', layout: { size: 'wide' } },
  { ...base('prev03-snacks', 5, 8, 'Affordable Snacks Near a School'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Many people near a school buy affordable snacks. Which could be a livelihood opportunity?', choices: ['Prepare and sell suitable snacks', 'Offer clothing repair only', 'Ignore what customers need'], answer: 'Prepare and sell suitable snacks', correctFeedback: 'Correct. A food activity could respond to the demand for snacks.', retryFeedback: 'Which choice provides the product people are looking for?' },
  { ...base('prev03-tailoring', 6, 8, 'Households Need Clothing Alterations'), contentType: 'interactive', taskTemplate: 'multiple_choice', question: 'Which opportunity best fits this community need?', choices: ['Tailoring or dressmaking service', 'Computer printing service', 'Plant selling'], answer: 'Tailoring or dressmaking service', correctFeedback: 'Correct. Tailoring directly responds to clothing-alteration needs.', retryFeedback: 'Which service repairs or changes clothing?' },
  { ...base('prev03-fit', 7, 8, 'Does the Opportunity Fit?'), contentType: 'interactive', taskTemplate: 'yes_no', question: 'People need broken computers repaired. Would a trained computer repair service meet this need?', choices: ['Yes', 'No'], answer: 'Yes', correctFeedback: 'Correct. The service directly responds to the stated need.', retryFeedback: 'Compare the community need with the service being offered.', imageUrl: '/assets/pre-vocational/prev-03/repair-service.png' },
  { ...base('prev03-summary', 8, 8, 'Needs Can Point to Opportunities'), contentType: 'image', template: 'visual_narrative', contentDescription: 'Actual opportunities depend on local skills, resources, and demand.', steps: [{ id: 'summary', title: 'Observe, connect, evaluate', description: 'Connect a community need with a useful product or service.', imageUrl: '/assets/pre-vocational/prev-03/repair-service.png', altText: 'Repair service tools' }], actionLabel: 'Finish lesson' },
]

export const mockPrevLessons = [
  { id: 'PREV-01', title: 'My Capabilities, Interests, and Skills', tasks: prev01.map(withSuppliedAssets) },
  { id: 'PREV-02', title: 'Livelihood Activities Around Us', tasks: prev02.map(withSuppliedAssets) },
  { id: 'PREV-03', title: 'Livelihood Opportunities in My Community', tasks: prev03.map(withSuppliedAssets) },
] as const
