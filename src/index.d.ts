import { ValidateOptions, ValidateResult } from "./types";
import { Type } from "rutypi-sharedlib/types";
export { ValidateOptions, ValidateResult } from "./types";
export { lookupReference } from "./datahelper";
export { Type } from "rutypi-sharedlib/types";
export declare function typeInfo<T>(): Type;
export declare namespace typeInfo {
    var __original: (typeInfo: Type | import("rutypi-sharedlib/types").TypeInvalid) => Type | import("rutypi-sharedlib/types").TypeInvalid;
}
export declare function validateType<T>(object: unknown, options?: {
    noThrow: true;
} & ValidateOptions): ValidateResult<T>;
export declare function validateType<T>(object: unknown, options?: ValidateOptions): T;
export declare namespace validateType {
    var __original: (typeInfo: Type | import("rutypi-sharedlib/types").TypeInvalid, object: unknown, options?: ValidateOptions) => unknown;
}
