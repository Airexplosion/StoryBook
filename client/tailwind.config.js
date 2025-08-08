/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f093fb',
          dark: '#1a202c',
          darker: '#2d3748',
        }
      },
      backgroundImage: {
        'game-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'card-gradient': 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(102, 126, 234, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(102, 126, 234, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}