import { ValidateOptions, ValidateResult } from "./types";
import { validateType as realValidateType } from "./validate";
import { typeInfo as realTypeInfo } from "./typeinfo";
import { Type } from "../shared/types";

export {
    ValidateOptions,
    ValidateResult,
    ValidateError,
    TypeValidateError
} from "./types";

export {
    lookupReference
} from "./datahelper";

export * from "../shared/types";

export /* native */ function typeInfo<T>(): Type {
    throw "this function call should have been overridden";
}

export /* native */ function validateType<T>(object: unknown, options: ValidateOptions & { noThrow: true }): ValidateResult<T>;
export /* native */ function validateType<T>(object: unknown, options: ValidateOptions): T;
export /* native */ function validateType<T>(object: unknown): T;
export /* native */ function validateType<T>(_object: unknown, _options?): T | ValidateResult<T> {
    throw "this function call should have been overridden";
}

/* Exports for the real functions which should only be called by rutypi generated code. */
validateType.__original = realValidateType;
typeInfo.__original = realTypeInfo;