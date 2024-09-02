import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      'white': '#ffffff',
      'black': '#000000',
      'gray': '#6c757d',
      'green': '#4f772d',
      'red': '#9a031e',
      'yellow': '#ffd60a',
      'c0': '#000814',
      'c1': '#001d3d',
      'c2': '#003566',
      'c3': '#fde047',
      'c4': '#ffd60a',
      'positive-a': '#1d4ed8',
      'positive-b': '#86198f',
      'positive-c': '#059669',
      'positive-d': '#a855f7',
      'negative-a': '#881337',
      'negative-b': '#f43f5e',
    }
  },
  // all colors which are applied to elements dynamically should
  // be placed here so that they are always preloaded, otherwise
  // tailwindcss might not load them
  safelist: [
    'bg-positive-a',
    'bg-positive-b',
    'bg-positive-c',
    'bg-positive-d',
    'bg-negative-a',
    'bg-negative-b',
  ],
  plugins: [],
};
export default config;
