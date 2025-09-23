/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", "class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // Add others if needed
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary, 217 91% 60%))",
          foreground: "hsl(var(--primary-foreground, 0 0% 100%))",
          50: "hsl(var(--primary-50, 214 100% 97%))",
          100: "hsl(var(--primary-100, 214 95% 93%))",
          200: "hsl(var(--primary-200, 213 97% 87%))",
          300: "hsl(var(--primary-300, 212 96% 78%))",
          400: "hsl(var(--primary-400, 213 94% 68%))",
          500: "hsl(var(--primary-500, 217 91% 60%))",
          600: "hsl(var(--primary-600, 221 83% 53%))",
          700: "hsl(var(--primary-700, 224 76% 48%))",
          800: "hsl(var(--primary-800, 226 71% 40%))",
          900: "hsl(var(--primary-900, 226 64% 33%))",
        },
        // Modern warm background system
        "app-background": "hsl(var(--background, 220 25% 98%))",
        "content-panel": "hsl(var(--content-panel, 220 20% 90%))",
        "section-background": "hsl(var(--section-background, 220 25% 96%))",
        "card-header": "hsl(var(--card-header, 220 30% 98%))",

        // Gradient colors
        "gradient-start": "hsl(var(--gradient-start, 280 100% 99%))",
        "gradient-mid": "hsl(var(--gradient-mid, 217 100% 97%))",
        "gradient-end": "hsl(var(--gradient-end, 190 100% 98%))",

        // Editorial accent colors
        editorial: {
          purple: "hsl(var(--editorial-purple, 280 100% 70%))",
          blue: "hsl(var(--editorial-blue, 217 91% 60%))",
          teal: "hsl(var(--editorial-teal, 180 60% 50%))",
          pink: "hsl(var(--editorial-pink, 340 82% 65%))",
          orange: "hsl(var(--editorial-orange, 25 95% 53%))",
          yellow: "hsl(var(--editorial-yellow, 45 93% 47%))",
        },

        // Sunset accent colors
        sunset: {
          1: "hsl(var(--sunset-1, 217 91% 60%))",
          2: "hsl(var(--sunset-2, 267 84% 65%))",
          3: "hsl(var(--sunset-3, 142 76% 55%))",
        },

        // Legacy support (will be phased out)
        surface: "hsl(var(--surface, 210 40% 98%))",
        "surface-dark": "hsl(var(--surface-dark, 222 47% 12%))",

        background: "hsl(var(--background, 220 25% 98%))",
        foreground: "hsl(var(--foreground, 220 20% 10%))",
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 100%))",
          foreground: "hsl(var(--card-foreground, 220 15% 15%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 0 0% 100%))",
          foreground: "hsl(var(--popover-foreground, 220 15% 15%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 220 15% 92%))",
          foreground: "hsl(var(--secondary-foreground, 220 15% 15%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 220 15% 92%))",
          foreground: "hsl(var(--muted-foreground, 220 10% 50%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 220 20% 88%))",
          foreground: "hsl(var(--accent-foreground, 220 15% 15%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 84.2% 60.2%))",
          foreground: "hsl(var(--destructive-foreground, 0 0% 100%))",
        },
        border: "hsl(var(--border, 220 15% 88%))",
        input: "hsl(var(--input, 220 20% 94%))",
        ring: "hsl(var(--ring, 217 91% 60%))",
        chart: {
          1: "hsl(var(--chart-1, 25 95% 53%))",
          2: "hsl(var(--chart-2, 15 85% 50%))",
          3: "hsl(var(--chart-3, 35 75% 45%))",
          4: "hsl(var(--chart-4, 45 70% 50%))",
          5: "hsl(var(--chart-5, 55 65% 45%))",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
        "4xl": "2rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.5)",
        glow: "0 0 40px rgba(var(--primary-rgb), 0.15)",
        "editorial": "0 20px 80px -15px rgba(0, 0, 0, 0.12)",
        "editorial-sm": "0 10px 40px -8px rgba(0, 0, 0, 0.08)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-gradient": "linear-gradient(135deg, var(--tw-gradient-stops))",
        "mesh-gradient": "url('data:image/svg+xml,%3Csvg width=%22100%22 height=%22100%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%224%22 /%3E%3C/filter%3E%3C/defs%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.02%22/%3E%3C/svg%3E')",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8", filter: "brightness(1.2)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        fadeIn: "fadeIn 0.5s ease-out",
        slideDown: "slideDown 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
