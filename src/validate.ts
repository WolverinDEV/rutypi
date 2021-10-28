import { ValidateOptions } from "./types";

export const validateType = (typeInfo: string, object: unknown, options?: ValidateOptions) => {
    console.error("validateType called with %s", typeInfo);
    return object;
}