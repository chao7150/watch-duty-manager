export default {
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: [
    "react-router",
    "react",
    "<THIRD_PARTY_MODULES>",
    "domain/(.*)$",
    "components/(.*)$",
    "utils/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
};
