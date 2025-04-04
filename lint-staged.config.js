export default {
  "*.{ts,tsx,js,jsx,json}": ["npx prettier --write"],
  "*.{ts,js,tsx,jsx}": ["npx eslint --fix"],
};
