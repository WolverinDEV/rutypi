import { ValidateOptions, ValidateResult } from "./types";
import { validateType as realValidateType } from "./validate";
import { typeInfo as realTypeInfo } from "./typeinfo";
import { Type } from "../shared/types";

export {
    ValidateOptions,
    ValidateResult
} from "./types";

export {
    lookupReference
} from "./datahelper";

export * from "../shared/types";

export /* native */ function typeInfo<T>(): Type {
    throw "this function call should have been overridden";
}

export /* native */ function validateType<T>(object: unknown, options?: { noThrow: true } & ValidateOptions): ValidateResult<T>;
export /* native */ function validateType<T>(object: unknown, options?: ValidateOptions): T;
export /* native */ function validateType<T>(_object: unknown, _options?): any {
    throw "this function call should have been overridden";
}

/* Exports for the real functions which should only be called by rutypi generated code. */
validateType.__original = realValidateType;
typeInfo.__original = realTypeInfo;