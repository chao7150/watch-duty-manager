module.exports = {
  importOrder: [
    "remix",
    "react",
    "<THIRD_PARTY_MODULES>",
    "domain/(.*)$",
    "components/(.*)$",
    "utils/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
};
