/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { brand: { 50: "#e8f6ee", 100: "#d5f0e1", 500: "#00a63e", 600: "#008a34" } },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], pixel: ["Silkscreen", "monospace"] },
    },
  },
  plugins: [],
};
