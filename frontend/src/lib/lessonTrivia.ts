import type { CurriculumPackage } from '../constants/states'

const TRIVIA: Record<CurriculumPackage, string[]> = {
  care: ['Soap helps water lift dirt from your hands.', 'The tongue helps you taste food and form words.', 'Sleep gives your body time to rest and repair.'],
  life: ['A measuring cup helps you use the same amount each time you cook.', 'Putting items in the same place makes them easier to find.', 'A shopping list helps you remember what you need.'],
  pre_vocational: ['A ruler measures length, while a scale measures weight.', 'Sorting tools by their job can make a workspace easier to use.', 'Following steps in order helps you repeat a task.'],
  livelihood: ['Plants use sunlight to help make their food.', 'Seeds need water to begin growing.', 'Compost returns nutrients to the soil.'],
  functional_academics: ['A triangle has three sides and three corners.', 'A clock divides an hour into sixty minutes.', 'Coins can be grouped in different ways to make the same amount.'],
  career: ['A calendar helps people plan appointments and workdays.', 'Many jobs use teamwork to finish a shared task.', 'Asking a clear question can help you learn a new job.'],
  enrichment: ['Mixing blue and yellow paint makes green.', 'A rhythm is a pattern of sounds and pauses.', 'A collage combines different pieces into one picture.'],
}

export function lessonTrivia(category?: CurriculumPackage) {
  return TRIVIA[category ?? 'functional_academics']
}
