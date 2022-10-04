export const extractParams = <Keys extends string>(
  params: { [key in string]: unknown },
  keys: Array<Keys>
): { [Key in Keys]: string } => {
  if (checkParamsType(params, keys)) {
    return params;
  }
  throw Error("params does not have required key");
};

const checkParamsType = <Keys extends string>(
  params: { [key in string]: unknown },
  keys: Array<Keys>
): params is { [Key in Keys]: string } => {
  for (const k of keys) {
    const value = params[k];
    if (typeof value !== "string") {
      return false;
    }
  }
  return true;
};

export const nonEmptyStringOrUndefined = <Keys extends string>(
  params: { [key in string]: unknown },
  keys: Array<Keys>
): { [Key in Keys]: string | undefined } => {
  return keys.reduce((acc, key) => {
    return { ...acc, [key]: extractAsNonEmptyStringOrUndefined(params, key) };
  }, {} as { [Key in Keys]: string | undefined });
};

export const extractAsNonEmptyStringOrUndefined = (
  obj: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = obj[key];
  if (typeof value !== "string") {
    return undefined;
  }
  if (value === "") {
    return undefined;
  }
  return value;
};

/**
 * オブジェクトや配列の中のDateを再帰的にstringに変換する
 */
export type Serialized<T> = {
  [Key in keyof T]: T[Key] extends Date
    ? string
    : T[Key] extends string | number | boolean
    ? T[Key]
    : T[Key] extends Record<string, unknown>
    ? Serialized<T[Key]>
    : T[Key] extends Array<infer S>
    ? Array<Serialized<S>>
    : T[Key];
};

export const isNumber = (val: unknown): val is number =>
  typeof val === "number";
