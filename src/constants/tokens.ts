export const colors = {
  // cognitive states
  state: {
    focused: '#1D9E75',
    focusedFill: '#E1F5EE',
    focusedText: '#085041',

    relaxed: '#378ADD',
    relaxedFill: '#E6F1FB',
    relaxedText: '#0C447C',

    distracted: '#EF9F27',
    distractedFill: '#FAEEDA',
    distractedText: '#633806',

    overstimulated: '#D85A30',
    overstimulatedFill: '#FAECE7',
    overstimulatedText: '#712B13',
  },

  brand: {
    coral: '#D4537E',
    teal: '#1D9E75',
    sunflower: '#FAC775',
    cream: '#FBF7EE',
  },

  ui: {
    deepPurple: '#2D2A7A',
    interfacePurple: '#534AB7',
    coolSurface: '#F8F8FC',
    textPrimary: '#1A1A2E',
    textSecondary: '#5F5E5A',
    border: '#E4E4EE',
    white: '#FFFFFF',
  },
} as const

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const

export const fontSize = {
  // student-facing (min 24px)
  display: '32px',
  heading: '28px',
  subheading: '24px',
  body: '18px',
  label: '16px',
  caption: '14px',

  // teacher-facing
  headingD: '24px',
  subheadingD: '18px',
  bodyD: '14px',
  labelD: '12px',
  captionD: '11px',
} as const

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
} as const

export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.10)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
  card: '0 2px 8px rgba(45,42,122,0.08)',
} as const
