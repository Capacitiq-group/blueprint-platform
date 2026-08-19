import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Intelligent Contrast palette
        charcoal: {
          DEFAULT: '#0F0F0F', // Dark Charcoal — primary background
          medium: '#202020',  // Medium Charcoal — surfaces / cards
        },
        forest: '#337418',    // Forest Green — secondary accent
        lime: '#5DD62C',      // Neon Lime Green — primary accent
        offwhite: '#F8F8F8',  // Off-White — primary text on dark
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.85rem',
      },
    },
  },
  plugins: [],
};

export default config;
