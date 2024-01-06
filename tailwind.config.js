/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        dark: "#202124",
        link: "#8ab4f8",
        text: "#bdc1c6",
        "text-weak": "#9aa0a6",
        "text-strong": "#bcc0c3",
        "accent-area": "#303134",
        outline: "#3c4043",
        "tw-border": "#5f6368",
        red: "#f28b82",
      },
      flexBasis: {
        graph: "600px",
      },
      boxShadow: {
        menu: "1px 1px 15px 0px #171717",
      },
    },
  },
  plugins: [],
};
