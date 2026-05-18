/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8', // Cream background from design.md
        primary: {
          DEFAULT: '#E8622A', // Warm orange accent
          hover: '#D15524',
        },
        text: '#1A1A1A', // Dark ink text
        border: '#E5E7EB',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
