import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Web3 主题色
        ethereum: '#627EEA',
        arbitrum: '#28A0F0',
        optimism: '#FF0420',
        polygon: '#8247E5',
        base: '#0052FF',
        // AI Agent 科技感颜色
        ai: {
          blue: '#00D1FF',
          purple: '#9D4EDD',
          cyan: '#00F5D4',
          magenta: '#FF006E',
          gradient: 'linear-gradient(135deg, #00D1FF 0%, #9D4EDD 50%, #FF006E 100%)',
        },
        // 深色系科技感颜色
        tech: {
          dark: '#0A0A0F',
          darker: '#050508',
          slate: '#1A1A2E',
          gray: '#2D2D44',
          light: '#3A3A5D',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right bottom'
          }
        },
        'glow': {
          '0%': {
            'box-shadow': '0 0 5px rgba(0, 209, 255, 0.5), 0 0 10px rgba(0, 209, 255, 0.3)'
          },
          '100%': {
            'box-shadow': '0 0 20px rgba(0, 209, 255, 0.8), 0 0 40px rgba(0, 209, 255, 0.5)'
          }
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          }
        },
        'shimmer': {
          '0%': {
            'background-position': '-200% 0'
          },
          '100%': {
            'background-position': '200% 0'
          }
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            'box-shadow': '0 0 5px rgba(157, 78, 221, 0.5)'
          },
          '50%': {
            opacity: '0.8',
            'box-shadow': '0 0 20px rgba(157, 78, 221, 0.8)'
          }
        },
        'border-glow': {
          '0%, 100%': {
            'border-color': 'rgba(0, 209, 255, 0.3)',
            'box-shadow': '0 0 5px rgba(0, 209, 255, 0.3)'
          },
          '50%': {
            'border-color': 'rgba(0, 209, 255, 0.8)',
            'box-shadow': '0 0 15px rgba(0, 209, 255, 0.6)'
          }
        }
      }
    },
  },
  plugins: [],
}
export default config