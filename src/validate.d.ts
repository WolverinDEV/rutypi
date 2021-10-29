import { ValidateOptions } from "./types";
import { Type, TypeInvalid } from "rutypi-sharedlib/types";
export declare const validateType: (typeInfo: Type | TypeInvalid, object: unknown, options?: ValidateOptions) => unknown;
