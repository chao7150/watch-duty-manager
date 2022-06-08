export const isNonEmptyString = (input: unknown): input is string => {
  return typeof input === "string" && input !== "";
};
