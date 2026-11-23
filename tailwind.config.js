/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#FFFFFF',
        'sidebar': '#FAF9F5',
        'border': '#E8E6DC',
        'text': '#1F1E1D',
        'muted': '#6B6A66',
        'accent': '#D97757',
        'link': '#2563EB',
        'hover': '#EFEDE6',
        'input-bg': '#F5F4EE',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'serif': ['Georgia', '"Times New Roman"', 'serif'],
      },
      borderRadius: {
        'item': '8px',
        'card': '20px',
        'input': '24px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}