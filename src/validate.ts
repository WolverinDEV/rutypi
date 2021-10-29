import {TypeValidateError, ValidateError, ValidateOptions, ValidateResult} from "./types";
import {
    Type,
    TypeBoolean, TypeIntersection,
    TypeInvalid,
    TypeNumber,
    TypeObject,
    TypeReference,
    TypeString,
    TypeUnion
} from "../shared/types";
import {lookupReference} from "./datahelper";

export const validateType = (typeInfo: Type | TypeInvalid, object: any, options?: ValidateOptions) => {
    const context: TypeValidateContext = {
        accessStack: [],
        errors: []
    };
    if(typeInfo.type === "invalid") {
        context.errors.push({
            accessStack: [],
            message: "invalid type info"
        });
    } else {
        validateObject(typeInfo, object, context);
    }

    if(options?.noThrow) {
        if(context.errors.length > 0) {
            return {
                status: "error",
                errors: context.errors
            } as ValidateResult<any>;
        } else {
            return {
                status: "success",
                value: object
            } as ValidateResult<any>;
        }
    } else {
        if(context.errors.length > 0) {
            throw new ValidateError(context.errors);
        }

        return object;
    }
}

type TypeValidateContext = {
    accessStack: string[],
    errors: TypeValidateError[]
};

const typeValidators: {
    [K in Type["type"]]?: (currentObject: any, type: Type, ctx: TypeValidateContext) => string[]
} = {};

typeValidators["any"] = () => [];
typeValidators["unknown"] = () => [];
typeValidators["undefined"] = (currentObject: any) => {
    if(typeof currentObject !== "undefined") {
        return [`expected undefined but received ${typeof currentObject}`];
    }

    return [];
};
typeValidators["null"] = (currentObject: any) => {
    if(typeof currentObject !== null) {
        return [`expected null but received ${typeof currentObject}`];
    }

    return [];
};
const primativeTest = (kind: "boolean" | "string" | "number") => (currentObject: unknown, type: TypeBoolean | TypeString | TypeNumber) => {
    if(typeof currentObject !== kind) {
        return [`expected a ${kind} but received ${typeof currentObject}`];
    }

    if(typeof type.value === kind) {
        if(currentObject !== type.value) {
            return [`expected ${kind} value ${type.value} but received ${currentObject}`];
        }
    }

    return [];
}
typeValidators["boolean"] = primativeTest("boolean");
typeValidators["number"] = primativeTest("number");
typeValidators["string"] = primativeTest("string");
typeValidators["method"] = currentObject => {
    if(typeof currentObject !== "function") {
        return [`expected a function but received ${typeof currentObject}`];
    }

    return [];
};
typeValidators["object"] = (currentObject: any, type: TypeObject, ctx: TypeValidateContext) => {
    if(typeof currentObject !== "object") {
        return [`expected object but received ${typeof currentObject}`];
    } else if(currentObject === null) {
        return [`expected a object but received null`];
    }

    const errors = [];

    /* TODO: Type arguments! */
    const optionalMembers = Object.keys(type.optionalMembers || {});
    const members = { ...type.members, ...type.optionalMembers };

    for(const memberName of Object.keys(members)) {
        if(!(memberName in currentObject)) {
            if(optionalMembers.indexOf(memberName) === -1) {
                errors.push(`missing member "${memberName}"`);
            }
            continue;
        }

        const innerCtx = {
            ...ctx,
            accessStack: [...ctx.accessStack, memberName]
        };

        validateObject(members[memberName], currentObject[memberName], innerCtx);
    }

    return errors;
};

typeValidators["object-reference"] = (currentObject: any, type: TypeReference, ctx: TypeValidateContext) => {
    /* TODO: Type arguments! */
    const reference = lookupReference(type);
    if(typeof reference === "undefined") {
        return [`invalid type reference to ${type.target}`];
    }

    validateObject(reference, currentObject, ctx);
    return [];
};

typeValidators["type-reference"] = () => {
    /* A type reference should only be encountered within an object. */
    throw "this seems to be a compiler bug";
};
typeValidators["union"] = (currentObject: any, type: TypeUnion, ctx: TypeValidateContext) => {
    for(const typeVariant of type.types) {
        const innerContext = {
            ...ctx,
            errors: []
        }

        validateObject(typeVariant, currentObject, innerContext);
        if(innerContext.errors.length === 0) {
            return [];
        }
    }

    function replaceLast(text: string, needle: string, replacement: string) : string {
        const index = text.lastIndexOf(needle);
        if(index === -1) {
            return text;
        }

        return text.substr(0, index) + replacement + text.substr(index + needle.length);
    }

    return [`expected a ${replaceLast(type.types.map(type => type.type === "object-reference" ? type.target : type.type).join(", "), ", ", ", or ")} but nothing matches`];
};
typeValidators["intersection"] = (currentObject: any, type: TypeIntersection, ctx: TypeValidateContext) => {
    type.types.forEach(type => validateObject(type, currentObject, ctx));
    return [];
};

const validateObject = (typeInfo: Type, object: any, ctx: TypeValidateContext) => {
    if(!(typeInfo.type in typeValidators)) {
        throw "unknown how to handle " + typeInfo.type;
    }

    const errors = typeValidators[typeInfo.type](object, typeInfo, ctx);
    errors.forEach(error => {
        ctx.errors.push({
            accessStack: ctx.accessStack.slice(),
            message: error
        });
    });
}