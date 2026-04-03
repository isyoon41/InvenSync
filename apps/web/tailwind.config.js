/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-noto-sans-kr)',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        nav:        '0 8px 32px -4px rgba(15,23,42,0.10), 0 4px 12px -4px rgba(15,23,42,0.07)',
        card:       '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.06)',
        'card-md':  '0 4px 12px rgba(15,23,42,0.08), 0 2px 4px -1px rgba(15,23,42,0.06)',
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
      animation: {
        'slide-down': 'mega-slide-down 0.18s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
