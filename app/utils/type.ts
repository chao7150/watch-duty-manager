import { Params } from "react-router";

export const extractParams = <Keys extends string>(
  params: Params,
  keys: Array<Keys>
): { [Key in Keys]: string } => {
  if (checkParamsType(params, keys)) {
    return params;
  }
  throw Error("params does not have required key");
};

const checkParamsType = <Keys extends string>(
  params: Params,
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
