import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        breathingGradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        pulseBar: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(350%)' }
        }
      },
      animation: {
        breathingGradient: 'breathingGradient 16s ease-in-out infinite',
        pulseBar: 'pulseBar 1.6s ease-in-out infinite'
      }
    }
  },
  plugins: []
} satisfies Config;
