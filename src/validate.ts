import {TypeValidateError, ValidateError, ValidateOptions, ValidateResult} from "./types";
import {
    Type, TypeArray,
    TypeBoolean, TypeIntersection,
    TypeInvalid,
    TypeNumber,
    TypeObject,
    TypeReference,
    TypeString, TypeTuple,
    TypeUnion
} from "../shared/types";
import {lookupReference} from "./datahelper";

export const validateType = (typeInfo: Type | TypeInvalid, object: any, options?: ValidateOptions) => {
    const context: TypeValidateContext = {
        accessStack: [],
        errors: [],

        currentTypeArguments: [],
        currentTypeNames: []
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
    errors: TypeValidateError[],

    currentTypeNames: string[],
    currentTypeArguments: Type[]
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

    const optionalMembers = Object.keys(type.optionalMembers || {});
    const members = { ...type.members, ...type.optionalMembers };

    for(const memberName of Object.keys(members)) {
        if(!(memberName in currentObject)) {
            if(optionalMembers.indexOf(memberName) === -1) {
                errors.push(`missing object member "${memberName}"`);
            }
            continue;
        }

        const innerCtx: TypeValidateContext = {
            ...ctx,
            accessStack: [...ctx.accessStack, memberName],
            currentTypeNames: type.typeArgumentNames || []
        };

        validateObject(members[memberName], currentObject[memberName], innerCtx);
    }

    /* TODO: Object extends */
    return errors;
};

typeValidators["object-reference"] = (currentObject: any, type: TypeReference, ctx: TypeValidateContext) => {
    const errors = [];

    const innerContext: TypeValidateContext = {
        ...ctx,
        currentTypeArguments: (type.typeArguments || []).map(type => {
            if(type.type === "type-reference") {
                const index = ctx.currentTypeNames.indexOf(type.target);
                if(index === -1) {
                    errors.push(`unknown template parameter ${type.target}`);
                    return { type: "any" };
                }

                return ctx.currentTypeArguments[index];
            } else {
                return type;
            }
        })
    };

    const reference = lookupReference(type);
    if(typeof reference === "undefined") {
        return [`invalid type reference to ${type.target}`];
    }

    validateObject(reference, currentObject, innerContext);
    return [];
};
typeValidators["type-reference"] = (currentObject: any, type: TypeReference, ctx: TypeValidateContext) => {
    const index = ctx.currentTypeNames.indexOf(type.target);
    if(index === -1) {
        return [`unknown template parameter ${type.target}`];
    }

    validateObject(ctx.currentTypeArguments[index], currentObject, ctx);
    return [];
}

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
typeValidators["array"] = (currentObject: any, type: TypeArray, ctx: TypeValidateContext) => {
    if(!Array.isArray(currentObject)) {
        return [`expected an array but received ${typeof currentObject}`];
    }

    for(let index = 0; index < currentObject.length; index++) {
        const innerCtx: TypeValidateContext = {
            ...ctx,
            accessStack: [...ctx.accessStack, `[${index}]`]
        };

        validateObject(type.elementType, currentObject[index], innerCtx);
    }

    return [];
};
typeValidators["tuple"] = (currentObject: any, type: TypeTuple, ctx: TypeValidateContext) => {
    if(!Array.isArray(currentObject)) {
        return [`expected a tuple but received ${typeof currentObject}`];
    }

    const elements = type.elements || [];
    const optionalElements = type.optionalElements || [];
    if(elements.length > currentObject.length) {
        return [`expected a tuple with at least ${elements.length} elements but received ${currentObject.length}`];
    } else if(!type.dotdotdotElement && elements.length + optionalElements.length < currentObject.length) {
        if(optionalElements.length === 0) {
            return [`expected a tuple with ${elements.length} elements but received ${currentObject.length}`];
        } else {
            return [`expected a tuple with ${elements.length} to ${elements.length + optionalElements.length} elements but received ${currentObject.length}`];
        }
    }

    const mergedElements = [...elements, ...optionalElements];
    for(let index = 0; index < currentObject.length; index++) {
        const innerCtx: TypeValidateContext = {
            ...ctx,
            accessStack: [...ctx.accessStack, `[${index}]`]
        };

        if(index < mergedElements.length) {
            validateObject(mergedElements[index], currentObject[index], innerCtx);
        } else {
            validateObject(type.dotdotdotElement, currentObject[index], innerCtx);
        }
    }

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