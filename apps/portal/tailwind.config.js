/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: 'var(--color-ink-950)',
          900: 'var(--color-ink-900)',
          800: 'var(--color-ink-800)',
          700: 'var(--color-ink-700)',
          600: 'var(--color-ink-600)',
          500: 'var(--color-ink-500)',
        },
        coral: {
          400: '#ff8585',
          500: '#ff6b6b',
          600: '#f25c5c',
        },
        warm: {
          50: 'var(--color-warm-50)',
          100: 'var(--color-warm-100)',
          200: 'var(--color-warm-200)',
          300: 'var(--color-warm-300)',
        }
      },
      fontFamily: {
        heading: ['"Geist Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        md: '4px',
      },
      boxShadow: {
        'glow': '0 0 12px rgba(255, 107, 107, 0.15)',
        'glow-strong': '0 0 24px rgba(255, 107, 107, 0.3)',
      }
    },
  },
  plugins: [],
};
