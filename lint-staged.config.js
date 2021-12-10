module.exports = {
  "*.{ts,js,json}": ["npx prettier --write"],
  "*.{ts,js}": ["npx eslint --fix"],
};
