/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bb: {
          blue: '#2684FF',
          'blue-hover': '#1a6fe0',
          dark: '#0d1117',
          surface: '#161b22',
          elevated: '#1c2333',
          border: '#30363d',
          'text-primary': '#e6edf3',
          'text-secondary': '#8b949e',
          green: '#2ea043',
          red: '#f85149',
          yellow: '#d29922',
          purple: '#a371f7',
        },
      },
    },
  },
  plugins: [],
};
