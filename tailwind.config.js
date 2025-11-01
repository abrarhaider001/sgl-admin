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
        // Enhanced Light Mode Color Palette
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        card: 'var(--card)',
        'card-hover': 'var(--card-hover)',
        
        // Enhanced Text Colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        // Refined Border System
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        'border-subtle': 'var(--border-subtle)',
        
        // Vibrant Accent Palette
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        'accent-subtle': 'var(--accent-subtle)',
        
        // Enhanced Status Colors
        success: 'var(--success)',
        'success-light': 'var(--success-light)',
        warning: 'var(--warning)',
        'warning-light': 'var(--warning-light)',
        error: 'var(--error)',
        'error-light': 'var(--error-light)',
        info: 'var(--info)',
        'info-light': 'var(--info-light)',
        
        // Enhanced Shadow System
        shadow: 'var(--shadow)',
        'shadow-light': 'var(--shadow-light)',
        'shadow-subtle': 'var(--shadow-subtle)',
      },
      
      // Enhanced Typography
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      
      // Enhanced Animations
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'bounce-subtle': 'bounceSubtle 0.3s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      
      // Enhanced Transitions
      transitionProperty: {
        'all-smooth': 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
      },
      
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // Enhanced Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      
      // Enhanced Border Radius
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      // Enhanced Box Shadows
      boxShadow: {
        'theme': '0 4px 16px var(--shadow), 0 2px 6px var(--shadow-light)',
        'theme-lg': '0 8px 32px var(--shadow), 0 4px 12px var(--shadow-light)',
        'theme-xl': '0 16px 48px var(--shadow), 0 8px 20px var(--shadow-light)',
        'subtle': '0 1px 3px var(--shadow-light), 0 1px 2px var(--shadow-subtle)',
        'elevated': '0 2px 8px var(--shadow-light), 0 1px 3px var(--shadow-subtle)',
      },
      
      // Enhanced Backdrop Blur
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}