/** @type {import('tailwindcss').Config} */
// Palette lifted verbatim from CSR Pulse (HaseebMadeIt light theme).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAFE', // app background (barely-there violet tint)
        card: '#FFFFFF', // card background
        raised: '#F4F2FA', // raised panels / track
        hover: '#F0EEFA', // hover surface
        line: '#E8E5F3', // borders
        lineHi: '#D4CFEC', // emphasized borders
        ink: '#160A33', // primary text
        muted: '#534A78', // secondary text
        dim: '#8B82A8', // labels / dim text
        brand: {
          DEFAULT: '#7229FF', // violet accent
          dim: '#5E1FD8',
          glow: '#9F66FF',
          bg: '#F1EBFF',
        },
        mint: '#10B981', // success / converted
        amber: '#F59E0B', // warning / Morning
        coral: '#EF4444', // error
        cyan: '#0EA5E9', // info / Evening
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
        disp: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
