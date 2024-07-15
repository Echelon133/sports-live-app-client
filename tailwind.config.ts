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
  },
  // all colors which are applied to elements dynamically should
  // be placed here so that they are always preloaded, otherwise
  // tailwindcss might not load them
  safelist: [
    'bg-blue-900',
    'bg-blue-600',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-rose-900',
    'bg-gray-500',
    'bg-green-500',
    'bg-red-500',
  ],
  plugins: [],
};
export default config;
