/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#f6f8f6',
        border: '#d9e2dc',
        ink: '#17231d',
        muted: '#607068',
        brand: {
          50: '#edf8f2',
          100: '#d7efe1',
          500: '#26895f',
          600: '#1f6f50',
          700: '#185840',
        },
        accent: {
          50: '#fff7e8',
          500: '#d98c1f',
          600: '#b86f16',
        },
      },
    },
  },
  plugins: [],
};
