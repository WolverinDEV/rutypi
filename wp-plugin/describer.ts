import {
    IntersectionType,
    NumberLiteralType, ObjectFlags,
    ObjectType, PropertySignature,
    StringLiteralType, Symbol, SymbolFlags, SyntaxKind,
    Type, TypeAliasDeclaration,
    TypeChecker,
    TypeFlags,
    TypeParameter, TypeParameterDeclaration, TypeReference, UnionType
} from "typescript";
import {Type as TType} from "rutypi-sharedlib/types";

type TypeDisplayContext = {
    typeChecker: TypeChecker,

    prefix: string,
    depth: number,

    references: {
        [key: string]: TType
    },
}

export const displayFlags = (flag: number, flags: object) => {
    const activeFlags = [];
    for(const key of Object.keys(flags)) {
        const keyNumeric = parseInt(key);
        if(isNaN(keyNumeric)) {
            continue;
        }

        if((flag & keyNumeric) === keyNumeric) {
            activeFlags.push(flags[keyNumeric]);
        }
    }
    return activeFlags.join(", ") || "no flags";
}

const TypeDescribeMap: {
    [K in TypeFlags]?: TType | ((type: Type, ctx: TypeDisplayContext) => TType)
} = {};
TypeDescribeMap[TypeFlags.Any] = { type: "any" };
TypeDescribeMap[TypeFlags.Unknown] = { type: "unknown" };
TypeDescribeMap[TypeFlags.Void] = { type: "void" };
TypeDescribeMap[TypeFlags.String] = { type: "string" };
TypeDescribeMap[TypeFlags.StringLiteral] = (type: StringLiteralType) => ({ type: "string", value: type.value });
TypeDescribeMap[TypeFlags.Number] = { type: "number" };
TypeDescribeMap[TypeFlags.NumberLiteral] = (type: NumberLiteralType) => ({ type: "number", value: type.value });
TypeDescribeMap[TypeFlags.Boolean] = { type: "boolean" };
TypeDescribeMap[TypeFlags.BooleanLiteral] = (type: object) => ({ type: "boolean", value: type["intrinsicName"] === "true" });
TypeDescribeMap[TypeFlags.TypeParameter] = (type: TypeParameter) => ({ type: "type-reference", target: type.symbol.name, typeArguments: [] });
TypeDescribeMap[TypeFlags.Object] = (type: ObjectType, ctx) => {
    let typeArguments = type.aliasTypeArguments?.map(type => describeType(type, ctx));
    let referenceResult: TType & { type: "object-reference" } = {
        type: "object-reference",
        target: "will be set later",
        typeArguments
    };

    let referenceId;
    if(type.objectFlags & ObjectFlags.Anonymous) {
        /* Serialize this in line or as a reference */
        referenceId = type.aliasSymbol ? "T" + type.symbol["id"] + "_" + type.aliasSymbol.name : undefined;
    } else if(type.objectFlags & ObjectFlags.Class) {
        throw "classes are not allowed";
    } else if(type.objectFlags & ObjectFlags.Interface) {
        /*
         * All right, can be serialized and will be put in as a reference.
         * If there are any template arguments a "Reference" will be used instead of aliasTypeArguments.
         */
        referenceId = "I" + type.symbol["id"] + "_" + type.symbol.name;
    } else if(type.objectFlags & ObjectFlags.Reference) {
        const typeReference = type as TypeReference;
        let result = describeType(typeReference.target, ctx);
        if(result.type !== "object-reference") {
            /* a reference should be pointing to some kind of object which will return a reference. */
            throw "this seems to be a bug in the compiler";
        }

        return {
            type: "object-reference",
            target: result.target,
            typeArguments: typeReference.typeArguments?.map(type => describeType(type, ctx)) || []
        };
    } else {
        throw "unknown object flags " + displayFlags(type.objectFlags, ObjectFlags);
    }

    let objectInfo: TType = {
        type: "object",
        extends: [],
        members: {},
        typeArgumentNames: []
    };

    referenceResult.target = referenceId;
    if(referenceId in ctx.references) {
        return referenceResult;
    } else if(referenceId) {
        ctx.references[referenceId] = objectInfo;
    }

    {
        let innerContext = { ...ctx };
        innerContext.prefix = referenceId ? "" : innerContext.prefix + "  ";
        innerContext.depth += 1;

        /* Type parameter specification for type alias */
        if(type.aliasSymbol) {
            if(type.aliasSymbol.declarations.length !== 1) {
                throw "alias symbol is expected to contain exactly one declaration";
            }

            const typeAlias = type.aliasSymbol.declarations[0] as TypeAliasDeclaration;
            if(typeAlias.kind != SyntaxKind.TypeAliasDeclaration) {
                throw "alias symbol declaration is supposed to be a type alias declaration but is a " + SyntaxKind[typeAlias.kind];
            }

            for(const typeArgument of typeAlias.typeParameters || []) {
                objectInfo.typeArgumentNames.push(typeArgument.name.text);
            }
        }

        for(let [ key, value ] of type.symbol.members! as Map<string, Symbol>) {
            if(value.flags === SymbolFlags.Property) {
                const propertySignature = value.valueDeclaration as PropertySignature;
                if(propertySignature?.kind !== SyntaxKind.PropertySignature) {
                    throw "expected a property signature node";
                }

                const type = ctx.typeChecker.getTypeFromTypeNode(propertySignature.type);
                objectInfo.members[key] = describeType(type, innerContext);
            } else if(value.flags === SymbolFlags.TypeParameter) {
                /* Type parameter specification for interfaces. */
                if(value.declarations.length < 1) {
                    /* TODO: Verify that all declarations are equal and don't only take the first one! */
                    throw "type parameter expect at least only one declaration";
                }
                const declaration = value.declarations[0] as TypeParameterDeclaration;
                if(declaration.kind !== SyntaxKind.TypeParameter) {
                    throw "expected a type parameter";
                }

                objectInfo.typeArgumentNames.push(key);
            } else if(value.flags === SymbolFlags.Method) {
                objectInfo.members[key] = {
                    type: "method"
                };
            } else {
                throw "unknown how to handle object member of kind " + displayFlags(value.flags, SymbolFlags);
            }
        }

        for(const baseType of type.getBaseTypes() || []) {
            objectInfo.extends.push(describeType(baseType, ctx));
        }
    }

    return referenceId ? referenceResult : objectInfo;
}

TypeDescribeMap[TypeFlags.Union] = (type: UnionType, ctx) => ({
    type: "union",
    types: type.types.map(type => describeType(type, ctx))
})

TypeDescribeMap[TypeFlags.Intersection] = (type: IntersectionType, ctx) => ({
    type: "intersection",
    types: type.types.map(type => describeType(type, ctx))
})

export const describeType = (type: Type, ctx: TypeDisplayContext): TType => {
    for(const key of Object.keys(TypeDescribeMap)) {
        const mask = parseInt(key);
        if(type.flags & mask) {
            let result = TypeDescribeMap[key];
            if(typeof result === "object") {
                return result;
            }

            return result(type, ctx);
        }
    }

    throw "unknown type " + displayFlags(type.flags, TypeFlags);
}