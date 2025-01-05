export const isNonEmptyString = (input: unknown): input is string => {
  return typeof input === "string" && input !== "";
};

export const parseSearchParamAsNumber = (
  url: string,
  key: string,
  defaultValue = 0,
): number => {
  const u = new URL(url);
  const value = u.searchParams.get(key);
  if (value === null) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
};
