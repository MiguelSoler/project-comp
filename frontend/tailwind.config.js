/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#2563EB",
          "primary-hover": "#1D4ED8",
          "primary-active": "#1E40AF",
          secondary: "#0EA5A4",
          "secondary-hover": "#0F766E",
          accent: "#F59E0B",
          "accent-hover": "#D97706",
        },
        ui: {
          bg: "#F8FAFC",
          surface: "#FFFFFF",
          border: "#E2E8F0",
          text: "#0F172A",
          "text-secondary": "#475569",
          muted: "#94A3B8",
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
          info: "#0284C7",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.02)",
        "card-hover": "0 8px 24px rgba(15, 23, 42, 0.08)",
        modal: "0 16px 48px rgba(15, 23, 42, 0.18)",
      },
      maxWidth: {
        container: "1200px",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        250: "250ms",
      },
    },
  },
  plugins: [],
};