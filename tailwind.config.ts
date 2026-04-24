import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2D6A4F', light: '#52B788' },
        surface: '#F8F9F3',
        card: '#FFFFFF',
        overdue: '#E63946',
        warning: '#F4A261',
        success: '#40916C',
        ink: { DEFAULT: '#1B1B1B', muted: '#6B7280' },
      },
      fontFamily: {
        display: ['Nunito', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
