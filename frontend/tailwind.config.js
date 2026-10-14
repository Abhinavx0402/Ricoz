/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a9b9',
          400: '#eb7591',
          500: '#de4369',
          600: '#ca254e',
          700: '#aa1a3e',
          800: '#8c1835', // Primary burgundy accent
          900: '#751930',
          950: '#420815',
        },
      },
    },
  },
  plugins: [],
};
