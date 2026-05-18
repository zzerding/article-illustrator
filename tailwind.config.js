/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FDFCFB', // Warm background
        primary: {
          DEFAULT: '#F97316', // Orange accents
          hover: '#EA580C',
        },
        secondary: '#4B5563',
        border: '#E5E7EB',
      },
      fontFamily: {
        serif: ['Source Serif 4', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
