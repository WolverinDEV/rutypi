import { ValidateOptions } from "./types";
import {Type, TypeInvalid} from "rutypi-sharedlib/types";
import datastore from "rutypi-datastore";

export const validateType = (typeInfo: Type | TypeInvalid, object: unknown, options?: ValidateOptions) => {
    console.error("validateType called with %s. All known types: %o", typeInfo, Object.keys(datastore.knownTypes));
    return object;
}