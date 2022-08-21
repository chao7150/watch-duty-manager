/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.tsx"],
  theme: {
    extend: {
      // https://coolors.co/729ea1-b5bd89-dfbe99-ec9192-db5375
      colors: {
        dominant: "#96DF36",
        complementary: "#F6FBEC",
        "sub-complementary": "#86976C",
        accent: "#68EDCB",
        dark: "#202124",
        link: "#8ab4f8",
        text: "#bdc1c6",
        "text-weak": "#9aa0a6",
        "text-strong": "#bcc0c3",
        "accent-area": "#303134",
      },
    },
  },
  plugins: [],
};
