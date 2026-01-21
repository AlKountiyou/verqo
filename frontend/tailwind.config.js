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
        // Verqo Brand Colors
        'verqo-navy-dark': '#0D1B2A',
        'verqo-navy-medium': '#1B263B',
        'verqo-turquoise': '#00C9A7',
        'verqo-white': '#FFFFFF',
        'verqo-gray-light': '#E5E5E5',
        'verqo-gray-medium': '#8D99AE',
        'verqo-red': '#E63946',
        
        // Status Colors
        success: '#16a34a',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem', // 12px
        '2xl': '1rem',   // 16px
      },
      boxShadow: {
        'verqo': '0 4px 6px -1px rgba(13, 27, 42, 0.1), 0 2px 4px -1px rgba(13, 27, 42, 0.06)',
        'verqo-lg': '0 10px 15px -3px rgba(13, 27, 42, 0.1), 0 4px 6px -2px rgba(13, 27, 42, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
}
