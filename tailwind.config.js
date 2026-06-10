/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0b1020',
          800: '#11182e',
          700: '#1a2440',
          600: '#243154',
        },
        accent: {
          DEFAULT: '#6366f1',
          soft: '#818cf8',
        },
        win: '#22c55e',
        warn: '#f59e0b',
        loss: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
